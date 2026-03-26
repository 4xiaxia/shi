import fs from 'fs';
import path from 'path';
import type { CoworkMessage } from '../../src/main/coworkStore';

export type FeishuArtifactKind = 'image' | 'file';

export type FeishuOutgoingArtifact = {
  kind: FeishuArtifactKind;
  path: string;
  source: 'marker' | 'scan';
};

export type FeishuArtifactExtraction = {
  cleanText: string;
  artifacts: FeishuOutgoingArtifact[];
};

const FEISHU_IMAGE_MARKER_RE = /\[\[FEISHU_IMAGE:(.+?)\]\]/gi;
const FEISHU_FILE_MARKER_RE = /\[\[FEISHU_FILE:(.+?)\]\]/gi;
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.tiff', '.ico']);
const FILE_EXTENSIONS = new Set([
  '.pdf',
  '.txt',
  '.md',
  '.csv',
  '.json',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  '.zip',
]);
const MAX_SCAN_DEPTH = 3;
const MAX_DIRECTORY_ENTRIES = 1200;
const MAX_ARTIFACTS = 3;

function normalizeMarkerPath(rawPath: string): string {
  return rawPath.trim().replace(/^['"`]+|['"`]+$/g, '');
}

function getArtifactKind(filePath: string): FeishuArtifactKind | null {
  const extension = path.extname(filePath).toLowerCase();
  if (IMAGE_EXTENSIONS.has(extension)) {
    return 'image';
  }
  if (FILE_EXTENSIONS.has(extension)) {
    return 'file';
  }
  return null;
}

function dedupeArtifacts(items: FeishuOutgoingArtifact[]): FeishuOutgoingArtifact[] {
  const seen = new Set<string>();
  const result: FeishuOutgoingArtifact[] = [];
  for (const item of items) {
    const normalizedPath = path.resolve(item.path);
    if (seen.has(normalizedPath)) {
      continue;
    }
    seen.add(normalizedPath);
    result.push({ ...item, path: normalizedPath });
    if (result.length >= MAX_ARTIFACTS) {
      break;
    }
  }
  return result;
}

function extractMarkers(text: string, regex: RegExp, kind: FeishuArtifactKind): FeishuOutgoingArtifact[] {
  const matches = Array.from(text.matchAll(regex));
  const artifacts: FeishuOutgoingArtifact[] = [];
  for (const match of matches) {
    const filePath = normalizeMarkerPath(match[1] || '');
    if (!filePath) {
      continue;
    }
    artifacts.push({
      kind,
      path: filePath,
      source: 'marker',
    });
  }
  return artifacts;
}

function removeMarkers(text: string): string {
  return text
    .replace(FEISHU_IMAGE_MARKER_RE, '')
    .replace(FEISHU_FILE_MARKER_RE, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function pathLooksUnderRoot(candidatePath: string, workspaceRoot: string): boolean {
  const resolvedCandidate = path.resolve(candidatePath);
  const resolvedRoot = path.resolve(workspaceRoot);
  return resolvedCandidate === resolvedRoot || resolvedCandidate.startsWith(`${resolvedRoot}${path.sep}`);
}

function scanRecentArtifactsFromWorkspace(workspaceRoot: string, sinceMs: number): FeishuOutgoingArtifact[] {
  const results: Array<FeishuOutgoingArtifact & { mtimeMs: number }> = [];
  const queue: Array<{ dir: string; depth: number }> = [{ dir: path.resolve(workspaceRoot), depth: 0 }];
  let visitedEntries = 0;

  while (queue.length > 0 && visitedEntries < MAX_DIRECTORY_ENTRIES) {
    const current = queue.shift();
    if (!current) {
      break;
    }

    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(current.dir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      visitedEntries += 1;
      if (visitedEntries > MAX_DIRECTORY_ENTRIES) {
        break;
      }

      const fullPath = path.join(current.dir, entry.name);
      if (entry.isDirectory()) {
        if (current.depth < MAX_SCAN_DEPTH && !entry.name.startsWith('.git')) {
          queue.push({ dir: fullPath, depth: current.depth + 1 });
        }
        continue;
      }
      if (!entry.isFile()) {
        continue;
      }

      const kind = getArtifactKind(fullPath);
      if (!kind) {
        continue;
      }

      let stats: fs.Stats;
      try {
        stats = fs.statSync(fullPath);
      } catch {
        continue;
      }

      if (stats.mtimeMs + 1000 < sinceMs) {
        continue;
      }

      results.push({
        kind,
        path: fullPath,
        source: 'scan',
        mtimeMs: stats.mtimeMs,
      });
    }
  }

  return results
    .sort((a, b) => b.mtimeMs - a.mtimeMs)
    .map(({ mtimeMs: _mtimeMs, ...item }) => item)
    .slice(0, MAX_ARTIFACTS);
}

export function buildFeishuBrowserArtifactPrompt(): string {
  return [
    'Feishu organizer rule:',
    '- If the user asks for live web lookup, browsing, screenshot, page capture, or asks you to send an image/file back to Feishu, use available browser/tools directly.',
    '- Save any screenshot or return file under the current working directory.',
    '- In the FINAL reply, append one line per artifact using exact markers:',
    '  [[FEISHU_IMAGE:absolute_path_to_png_or_jpg]]',
    '  [[FEISHU_FILE:absolute_path_to_file]]',
    '- Only emit markers for files that already exist on disk.',
    '- Keep the normal user-facing answer short; markers can be placed at the end.',
  ].join('\n');
}

export function extractFeishuArtifactsFromReply(text: string): FeishuArtifactExtraction {
  if (!text.trim()) {
    return { cleanText: '', artifacts: [] };
  }
  const artifacts = dedupeArtifacts([
    ...extractMarkers(text, FEISHU_IMAGE_MARKER_RE, 'image'),
    ...extractMarkers(text, FEISHU_FILE_MARKER_RE, 'file'),
  ]).filter((artifact) => fs.existsSync(artifact.path));

  return {
    cleanText: removeMarkers(text),
    artifacts,
  };
}

export function collectFeishuArtifacts(params: {
  sessionMessages: CoworkMessage[] | Array<{ id: string; content: string }>;
  knownMessageIds: Set<string>;
  workspaceRoot?: string;
  runStartedAt: number;
}): FeishuArtifactExtraction {
  const { sessionMessages, knownMessageIds, workspaceRoot, runStartedAt } = params;
  const newMessages = sessionMessages.filter((message) => !knownMessageIds.has(message.id));
  const combinedText = newMessages
    .map((message) => (typeof message.content === 'string' ? message.content : ''))
    .filter(Boolean)
    .join('\n\n');

  const extracted = extractFeishuArtifactsFromReply(combinedText);
  if (extracted.artifacts.length > 0 || !workspaceRoot?.trim()) {
    return extracted;
  }

  const safeWorkspaceRoot = path.resolve(workspaceRoot);
  const scanned = scanRecentArtifactsFromWorkspace(safeWorkspaceRoot, runStartedAt)
    .filter((artifact) => pathLooksUnderRoot(artifact.path, safeWorkspaceRoot))
    .filter((artifact) => fs.existsSync(artifact.path));

  return {
    cleanText: extracted.cleanText,
    artifacts: dedupeArtifacts(scanned),
  };
}
