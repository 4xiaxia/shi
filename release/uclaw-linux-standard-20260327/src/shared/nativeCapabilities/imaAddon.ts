import { z } from 'zod';
import {
  createImaNote,
  formatImaCreateNoteResult,
  formatImaNoteContentResult,
  formatImaSearchResult,
  getImaNoteContent,
  hasImaRuntimeCredentials,
  searchImaNotes,
  type ImaNoteSummary,
} from '../imaRuntime';
import type {
  NativeCapabilityAddon,
  NativeCapabilityRuntimeContext,
} from './types';

type NativeImaIntent =
  | { kind: 'search'; query: string; searchScope: 'title' | 'content' }
  | { kind: 'get'; docId?: string; title?: string }
  | { kind: 'create'; title?: string; content: string; folderId?: string };

export function buildNativeImaSystemPrompt(_context: NativeCapabilityRuntimeContext): string | null {
  if (!hasImaRuntimeCredentials()) {
    return null;
  }

  return [
    '## Native IMA Notes',
    '- Native IMA note tools are available in this session: `ima_search_notes`, `ima_get_note`, `ima_create_note`.',
    '- When the user explicitly asks about IMA / 腾讯IMA notes, use these tools instead of guessing.',
    '- Search first when you only know a keyword or note title.',
    '- Read note content only after you have a concrete `doc_id`.',
    '- Use `ima_create_note` only when the user explicitly asks to create or save a new IMA note.',
  ].join('\n');
}

export function createNativeImaSdkTools(toolFactory: (
  name: string,
  description: string,
  schema: Record<string, unknown>,
  handler: (args: any) => Promise<any>
) => any, _context: NativeCapabilityRuntimeContext): any[] {
  if (!hasImaRuntimeCredentials()) {
    return [];
  }

  return [
    toolFactory(
      'ima_search_notes',
      'Search IMA notes by keyword. Return note titles, summaries, and doc_id values so the agent can choose a note to read.',
      {
        query: z.string().min(1),
        search_scope: z.enum(['title', 'content']).optional(),
        limit: z.number().int().min(1).max(20).optional(),
      },
      async (args: {
        query: string;
        search_scope?: 'title' | 'content';
        limit?: number;
      }) => {
        try {
          const result = await searchImaNotes({
            query: args.query,
            searchScope: args.search_scope,
            limit: args.limit,
          });
          return {
            content: [{
              type: 'text',
              text: formatImaSearchResult(result, args.query),
            }],
          } as any;
        } catch (error) {
          return {
            content: [{
              type: 'text',
              text: error instanceof Error ? error.message : String(error),
            }],
            isError: true,
          } as any;
        }
      }
    ),
    toolFactory(
      'ima_get_note',
      'Read the plaintext content of an IMA note using a specific doc_id.',
      {
        doc_id: z.string().min(1),
      },
      async (args: { doc_id: string }) => {
        try {
          const result = await getImaNoteContent({
            docId: args.doc_id,
          });
          return {
            content: [{
              type: 'text',
              text: formatImaNoteContentResult(result),
            }],
          } as any;
        } catch (error) {
          return {
            content: [{
              type: 'text',
              text: error instanceof Error ? error.message : String(error),
            }],
            isError: true,
          } as any;
        }
      }
    ),
    toolFactory(
      'ima_create_note',
      'Create a new IMA note from Markdown content. Optionally prepend a title heading and place it in a folder.',
      {
        content: z.string().min(1),
        title: z.string().optional(),
        folder_id: z.string().optional(),
      },
      async (args: { content: string; title?: string; folder_id?: string }) => {
        try {
          const result = await createImaNote({
            content: args.content,
            title: args.title,
            folderId: args.folder_id,
          });
          return {
            content: [{
              type: 'text',
              text: formatImaCreateNoteResult(result),
            }],
          } as any;
        } catch (error) {
          return {
            content: [{
              type: 'text',
              text: error instanceof Error ? error.message : String(error),
            }],
            isError: true,
          } as any;
        }
      }
    ),
  ];
}

export async function tryHandleNativeImaDirectTurn(params: {
  prompt: string;
  emitResult: (text: string, metadata?: Record<string, unknown>) => void;
}, _context: NativeCapabilityRuntimeContext): Promise<boolean> {
  const intent = parseNativeImaIntent(params.prompt);
  if (!intent) {
    return false;
  }

  if (!hasImaRuntimeCredentials()) {
    params.emitResult(
      '检测到了 IMA 笔记请求，但当前还没有配置 IMA Client ID / API Key。请先到设置里填好 IMA 凭证。',
      { nativeAction: 'ima-missing-config', nativeError: true }
    );
    return true;
  }

  try {
    if (intent.kind === 'search') {
      const result = await searchImaNotes({
        query: intent.query,
        searchScope: intent.searchScope,
        limit: 10,
      });
      params.emitResult(formatImaSearchResult(result, intent.query), { nativeAction: 'search' });
      return true;
    }

    if (intent.kind === 'get') {
      const resolved = intent.docId
        ? { docId: intent.docId, title: undefined, ambiguous: null as ImaNoteSummary[] | null }
        : await resolveImaNoteFromTitle(intent.title || '');

      if (resolved.ambiguous?.length) {
        params.emitResult(buildAmbiguousImaNoteMessage(intent.title || '', resolved.ambiguous), {
          nativeAction: 'resolve',
        });
        return true;
      }

      if (!resolved.docId) {
        params.emitResult(
          `IMA 里没有找到标题接近“${intent.title || ''}”的笔记。你可以先让我“搜索 IMA 笔记”，或者直接提供 doc_id。`,
          { nativeAction: 'resolve' }
        );
        return true;
      }

      const content = await getImaNoteContent({ docId: resolved.docId });
      params.emitResult(formatImaNoteContentResult(content), {
        nativeAction: 'get',
        docId: resolved.docId,
        noteTitle: resolved.title,
      });
      return true;
    }

    if (intent.kind === 'create') {
      const result = await createImaNote({
        title: intent.title,
        content: intent.content,
        folderId: intent.folderId,
      });
      params.emitResult(formatImaCreateNoteResult(result), {
        nativeAction: 'create',
        docId: result.docId,
      });
      return true;
    }

    return false;
  } catch (error) {
    params.emitResult(error instanceof Error ? error.message : String(error), {
      nativeAction: intent.kind,
      nativeError: true,
    });
    return true;
  }
}

function parseNativeImaIntent(text: string): NativeImaIntent | null {
  const rawText = String(text || '').trim();
  if (!rawText) {
    return null;
  }

  if (!/(?:\bima\b|腾讯ima|ima笔记|ima\s*note)/i.test(rawText)) {
    return null;
  }

  const docId = extractImaDocId(rawText);
  const quotedText = extractQuotedText(rawText);

  if (looksLikeImaCreateIntent(rawText)) {
    const content = extractImaCreateContent(rawText);
    if (!content) {
      return null;
    }

    return {
      kind: 'create',
      title: extractLabeledValue(rawText, ['标题', 'title']) ?? quotedText ?? undefined,
      folderId: extractLabeledValue(rawText, ['folder_id', 'folderId']) ?? undefined,
      content,
    };
  }

  if (looksLikeImaGetIntent(rawText)) {
    if (docId) {
      return { kind: 'get', docId };
    }

    const title = extractLabeledValue(rawText, ['标题', 'title', '笔记']) ?? quotedText ?? undefined;
    if (!title) {
      return null;
    }

    return { kind: 'get', title };
  }

  if (looksLikeImaSearchIntent(rawText)) {
    const query = extractImaSearchQuery(rawText);
    if (!query) {
      return null;
    }

    return {
      kind: 'search',
      query,
      searchScope: /标题|title/i.test(rawText) ? 'title' : 'content',
    };
  }

  return null;
}

function looksLikeImaSearchIntent(text: string): boolean {
  return /(搜索|查找|搜一下|搜|找一下|找|search)/i.test(text);
}

function looksLikeImaGetIntent(text: string): boolean {
  return /(读取|查看|打开|获取|看看|read|open|show)/i.test(text);
}

function looksLikeImaCreateIntent(text: string): boolean {
  return /(保存到|存到|写入|记到|记录到|新建|创建|导入|save|create|import)/i.test(text);
}

function extractQuotedText(text: string): string | null {
  const match = text.match(/[“"'《](.+?)[”"'》]/);
  return match?.[1]?.trim() || null;
}

function extractLabeledValue(text: string, labels: string[]): string | null {
  for (const label of labels) {
    const regex = new RegExp(`${label}\\s*[:：]\\s*([^\\n]+)`, 'i');
    const match = text.match(regex);
    if (match?.[1]?.trim()) {
      return match[1].trim();
    }
  }
  return null;
}

function extractImaDocId(text: string): string | undefined {
  const match = text.match(/doc[_ -]?id\s*[:：]\s*([A-Za-z0-9_-]+)/i);
  return match?.[1]?.trim() || undefined;
}

function extractImaSearchQuery(text: string): string {
  const quoted = extractQuotedText(text);
  if (quoted) {
    return quoted;
  }

  const match = text.match(/(?:搜索|查找|搜一下|搜|找一下|找|search)(?:\s*ima)?(?:\s*(?:里|中|中的))?(?:\s*(?:关于|包含))?\s*(.+)$/i);
  const query = (match?.[1] || text)
    .replace(/\bima\b/ig, '')
    .replace(/腾讯ima/ig, '')
    .replace(/笔记/gi, '')
    .replace(/[。！？!?,，；;]+$/g, '')
    .trim();

  return query;
}

function extractImaCreateContent(text: string): string | null {
  const fenced = text.match(/```(?:markdown|md|txt)?\s*([\s\S]+?)```/i);
  if (fenced?.[1]?.trim()) {
    return fenced[1].trim();
  }

  const labeled = extractBlockAfterLabel(text, ['内容', '正文', 'content', 'body']);
  if (labeled) {
    return labeled;
  }

  const colonMatch = text.match(/(?:保存到|存到|写入|记到|记录到|新建|创建|导入)(?:[^：:\n]{0,20})[:：]\s*([\s\S]+)$/i);
  if (colonMatch?.[1]?.trim()) {
    return colonMatch[1].trim();
  }

  const parts = text.split(/\r?\n/);
  if (parts.length > 1) {
    const body = parts.slice(1).join('\n').trim();
    if (body) {
      return body;
    }
  }

  return null;
}

function extractBlockAfterLabel(text: string, labels: string[]): string | null {
  for (const label of labels) {
    const regex = new RegExp(`${label}\\s*[:：]\\s*([\\s\\S]+)$`, 'i');
    const match = text.match(regex);
    if (match?.[1]?.trim()) {
      return match[1].trim();
    }
  }
  return null;
}

function normalizeComparableTitle(value: string): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[《》“”"'`]/g, '')
    .replace(/\s+/g, ' ');
}

async function resolveImaNoteFromTitle(title: string): Promise<{
  docId?: string;
  title?: string;
  ambiguous: ImaNoteSummary[] | null;
}> {
  const result = await searchImaNotes({
    query: title,
    searchScope: 'title',
    limit: 10,
  });

  if (result.docs.length === 0) {
    return { ambiguous: null };
  }

  const normalizedTitle = normalizeComparableTitle(title);
  const exactMatches = result.docs.filter((doc) => normalizeComparableTitle(doc.title) === normalizedTitle);
  if (exactMatches.length === 1) {
    return {
      docId: exactMatches[0].docId,
      title: exactMatches[0].title,
      ambiguous: null,
    };
  }

  if (exactMatches.length > 1) {
    return { ambiguous: exactMatches };
  }

  if (result.docs.length === 1) {
    return {
      docId: result.docs[0].docId,
      title: result.docs[0].title,
      ambiguous: null,
    };
  }

  return { ambiguous: result.docs.slice(0, 5) };
}

function buildAmbiguousImaNoteMessage(title: string, docs: ImaNoteSummary[]): string {
  const lines = [`IMA 里有多篇和“${title}”接近的笔记，请指定 doc_id 再读取：`];
  for (const [index, doc] of docs.entries()) {
    lines.push(`${index + 1}. ${doc.title || '(无标题)'} | doc_id: ${doc.docId}`);
  }
  return lines.join('\n');
}

export const nativeImaAddon: NativeCapabilityAddon = {
  id: 'ima-native-addon',
  title: 'IMA 笔记',
  description: '腾讯 IMA 笔记搜索、读取与新建。',
  getSystemPrompt: buildNativeImaSystemPrompt,
  createSdkTools: createNativeImaSdkTools,
};
