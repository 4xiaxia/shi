import fs from 'fs';
import path from 'path';
import { AGENT_ROLE_ORDER } from './agentRoleConfig';
import { ENV_ALIAS_PAIRS, readEnvAliasPair } from './envAliases';
import { resolveRuntimeUserDataPath } from './runtimeDataPaths';
import {
  asJsonRecord,
  getRoleSkillSecretPathFromRuntime,
  getSharedSkillSecretPath,
  type JsonRecord,
  readJsonRecordIfExists,
} from './skillSecretRuntime';

export const IMA_NOTE_SKILL_ID = 'ima-note';
const IMA_BASE_URL = 'https://ima.qq.com';
const IMA_MARKDOWN_CONTENT_FORMAT = 1;
const IMA_PLAINTEXT_CONTENT_FORMAT = 0;
const IMA_NOTE_READ_MAX_CHARS = 4000;

export type ImaRuntimeCredentials = {
  clientId: string;
  apiKey: string;
};

export type ImaSearchScope = 'title' | 'content';

export type ImaNoteSummary = {
  docId: string;
  title: string;
  summary: string;
  folderId: string;
  folderName: string;
  createTime?: number;
  modifyTime?: number;
  highlightTitle?: string;
};

export type ImaSearchNotesResult = {
  docs: ImaNoteSummary[];
  isEnd: boolean;
  totalHitNum?: number;
};

export type ImaNoteContentResult = {
  docId: string;
  content: string;
};

export type ImaCreateNoteResult = {
  docId: string;
  title?: string;
  folderId?: string;
};

function asRecord(value: unknown): JsonRecord | null {
  return asJsonRecord(value);
}

function normalizeCredentials(candidate: unknown): ImaRuntimeCredentials | null {
  const record = asRecord(candidate);
  if (!record) {
    return null;
  }

  const clientId = String(record.IMA_OPENAPI_CLIENTID ?? record.clientId ?? '').trim();
  const apiKey = String(record.IMA_OPENAPI_APIKEY ?? record.apiKey ?? '').trim();
  if (!clientId || !apiKey) {
    return null;
  }

  return { clientId, apiKey };
}

export function resolveImaRuntimeCredentials(userDataPath = resolveRuntimeUserDataPath()): ImaRuntimeCredentials | null {
  const envClientId = readEnvAliasPair(ENV_ALIAS_PAIRS.imaOpenapiClientId) ?? '';
  const envApiKey = readEnvAliasPair(ENV_ALIAS_PAIRS.imaOpenapiApiKey) ?? '';
  if (envClientId && envApiKey) {
    return { clientId: envClientId, apiKey: envApiKey };
  }

  const sharedSecret = normalizeCredentials(readJsonRecordIfExists(getSharedSkillSecretPath(userDataPath, IMA_NOTE_SKILL_ID)));
  if (sharedSecret) {
    return sharedSecret;
  }

  for (const roleKey of AGENT_ROLE_ORDER) {
    const legacySecret = normalizeCredentials(
      readJsonRecordIfExists(getRoleSkillSecretPathFromRuntime(userDataPath, roleKey, IMA_NOTE_SKILL_ID))
    );
    if (legacySecret) {
      return legacySecret;
    }
  }

  return null;
}

export function hasImaRuntimeCredentials(userDataPath = resolveRuntimeUserDataPath()): boolean {
  return Boolean(resolveImaRuntimeCredentials(userDataPath));
}

function getImaApiErrorCode(payload: JsonRecord): number | null {
  const candidates = [
    payload.code,
    payload.errcode,
    payload.retcode,
    payload.error_code,
    payload.errorCode,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'number' && Number.isFinite(candidate)) {
      return candidate;
    }
    if (typeof candidate === 'string' && candidate.trim() && !Number.isNaN(Number(candidate))) {
      return Number(candidate);
    }
  }

  return null;
}

function getImaApiErrorMessage(payload: JsonRecord): string {
  const candidates = [
    payload.message,
    payload.msg,
    payload.errmsg,
    payload.err_msg,
    payload.error,
    payload.error_message,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }

  return 'unknown error';
}

async function postImaJson<T extends JsonRecord = JsonRecord>(
  apiPath: string,
  body: JsonRecord,
  userDataPath = resolveRuntimeUserDataPath()
): Promise<T> {
  const credentials = resolveImaRuntimeCredentials(userDataPath);
  if (!credentials) {
    throw new Error('IMA credentials are not configured.');
  }

  const normalizedPath = apiPath.startsWith('/') ? apiPath : `/${apiPath}`;
  const response = await fetch(`${IMA_BASE_URL}${normalizedPath}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'ima-openapi-clientid': credentials.clientId,
      'ima-openapi-apikey': credentials.apiKey,
    },
    body: JSON.stringify(body),
  });

  const rawText = await response.text().catch(() => '');
  const parsed = rawText.trim() ? asRecord(JSON.parse(rawText)) : {};
  const payload = parsed ?? {};

  if (!response.ok) {
    const snippet = rawText.trim().slice(0, 300);
    throw new Error(
      snippet
        ? `IMA request failed (${response.status}): ${snippet}`
        : `IMA request failed (${response.status})`
    );
  }

  const errorCode = getImaApiErrorCode(payload);
  if (errorCode !== null && errorCode !== 0) {
    throw new Error(`IMA API error ${errorCode}: ${getImaApiErrorMessage(payload)}`);
  }

  return ((asRecord(payload.data) ?? payload) as T);
}

function normalizeImaSearchDoc(entry: unknown): ImaNoteSummary | null {
  const record = asRecord(entry);
  if (!record) {
    return null;
  }

  const basic = asRecord(asRecord(record.doc)?.basic_info)
    ?? asRecord(record.basic_info)
    ?? record;

  const docId = String(basic.docid ?? basic.doc_id ?? '').trim();
  if (!docId) {
    return null;
  }

  const highlightTitle = String(asRecord(record.highlight_info)?.doc_title ?? '').trim();

  return {
    docId,
    title: String(basic.title ?? '').trim(),
    summary: String(basic.summary ?? '').trim(),
    folderId: String(basic.folder_id ?? '').trim(),
    folderName: String(basic.folder_name ?? '').trim(),
    createTime: typeof basic.create_time === 'number' ? basic.create_time : undefined,
    modifyTime: typeof basic.modify_time === 'number' ? basic.modify_time : undefined,
    highlightTitle: highlightTitle || undefined,
  };
}

function formatTimestamp(value?: number): string {
  if (!value || !Number.isFinite(value)) {
    return '';
  }

  try {
    return new Date(value).toLocaleString('zh-CN', { hour12: false });
  } catch {
    return '';
  }
}

function normalizeMarkdownContent(title: string | undefined, content: string): string {
  const trimmedTitle = String(title ?? '').trim();
  const trimmedContent = String(content ?? '').replace(/\r\n/g, '\n').trim();
  if (!trimmedContent) {
    throw new Error('IMA note content cannot be empty.');
  }

  if (!trimmedTitle) {
    return trimmedContent;
  }

  const titleHeading = `# ${trimmedTitle}`;
  if (trimmedContent.startsWith(titleHeading)) {
    return trimmedContent;
  }

  return `${titleHeading}\n\n${trimmedContent}`;
}

export async function searchImaNotes(params: {
  query: string;
  searchScope?: ImaSearchScope;
  limit?: number;
  userDataPath?: string;
}): Promise<ImaSearchNotesResult> {
  const query = String(params.query ?? '').trim();
  if (!query) {
    throw new Error('IMA search query cannot be empty.');
  }

  const limit = Math.min(Math.max(params.limit ?? 10, 1), 20);
  const searchScope = params.searchScope === 'title' ? 'title' : 'content';
  const data = await postImaJson(
    '/openapi/note/v1/search_note_book',
    {
      search_type: searchScope === 'title' ? 0 : 1,
      sort_type: 0,
      query_info: searchScope === 'title'
        ? { title: query }
        : { content: query },
      start: 0,
      end: limit,
      query_id: '',
    },
    params.userDataPath
  );

  const docs = Array.isArray(data.docs)
    ? data.docs.map((entry) => normalizeImaSearchDoc(entry)).filter((entry): entry is ImaNoteSummary => Boolean(entry))
    : [];

  return {
    docs,
    isEnd: Boolean(data.is_end),
    totalHitNum: typeof data.total_hit_num === 'number' ? data.total_hit_num : undefined,
  };
}

export async function getImaNoteContent(params: {
  docId: string;
  userDataPath?: string;
}): Promise<ImaNoteContentResult> {
  const docId = String(params.docId ?? '').trim();
  if (!docId) {
    throw new Error('IMA doc_id is required.');
  }

  const data = await postImaJson(
    '/openapi/note/v1/get_doc_content',
    {
      doc_id: docId,
      target_content_format: IMA_PLAINTEXT_CONTENT_FORMAT,
    },
    params.userDataPath
  );

  const content = String(data.content ?? '').trim();
  if (!content) {
    throw new Error(`IMA returned empty content for doc_id ${docId}.`);
  }

  return { docId, content };
}

export async function createImaNote(params: {
  content: string;
  title?: string;
  folderId?: string;
  userDataPath?: string;
}): Promise<ImaCreateNoteResult> {
  const title = String(params.title ?? '').trim();
  const folderId = String(params.folderId ?? '').trim();
  const content = normalizeMarkdownContent(title, params.content);

  const data = await postImaJson(
    '/openapi/note/v1/import_doc',
    {
      content_format: IMA_MARKDOWN_CONTENT_FORMAT,
      content,
      ...(folderId ? { folder_id: folderId } : {}),
    },
    params.userDataPath
  );

  const docId = String(data.doc_id ?? '').trim();
  if (!docId) {
    throw new Error('IMA create note succeeded but no doc_id was returned.');
  }

  return {
    docId,
    title: title || undefined,
    folderId: folderId || undefined,
  };
}

export function formatImaSearchResult(result: ImaSearchNotesResult, query: string): string {
  if (result.docs.length === 0) {
    return `IMA 里没有找到和“${query}”相关的笔记。`;
  }

  const lines = [
    `IMA 搜索结果：找到 ${result.totalHitNum ?? result.docs.length} 条，当前展示 ${result.docs.length} 条。`,
  ];

  for (const [index, doc] of result.docs.entries()) {
    const meta = [
      doc.folderName ? `笔记本: ${doc.folderName}` : '',
      doc.modifyTime ? `更新时间: ${formatTimestamp(doc.modifyTime)}` : '',
      `doc_id: ${doc.docId}`,
    ].filter(Boolean).join(' | ');

    lines.push(`${index + 1}. ${doc.title || '(无标题)'}`);
    if (doc.summary) {
      lines.push(`   摘要: ${doc.summary}`);
    }
    if (doc.highlightTitle) {
      lines.push(`   标题命中: ${doc.highlightTitle}`);
    }
    if (meta) {
      lines.push(`   ${meta}`);
    }
  }

  return lines.join('\n');
}

export function formatImaNoteContentResult(result: ImaNoteContentResult): string {
  const clipped = result.content.length > IMA_NOTE_READ_MAX_CHARS
    ? `${result.content.slice(0, IMA_NOTE_READ_MAX_CHARS)}\n...`
    : result.content;

  return [
    `IMA 笔记内容（doc_id: ${result.docId}）`,
    clipped,
  ].join('\n\n');
}

export function formatImaCreateNoteResult(result: ImaCreateNoteResult): string {
  const parts = [
    '已在 IMA 新建笔记。',
    result.title ? `标题: ${result.title}` : '',
    result.folderId ? `folder_id: ${result.folderId}` : '',
    `doc_id: ${result.docId}`,
  ].filter(Boolean);

  return parts.join('\n');
}
