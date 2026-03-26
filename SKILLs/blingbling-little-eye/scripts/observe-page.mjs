#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

const DEFAULT_TIMEOUT_MS = 12000;
const DEFAULT_INTERACTIVE_LIMIT = 12;
const DEFAULT_INPUT_LIMIT = 8;
const DEFAULT_REGION_LIMIT = 8;
const URL_RE = /https?:\/\/[^\s<>"')\]]+/i;
const AUTH_URL_RE = /(login|sign[\s-]?in|auth|oauth|passport|sso|accounts\/page\/login)/i;
const AUTH_TEXT_RE = /(sign[\s-]?in|log[\s-]?in|登录|验证码|otp|2fa|password|邮箱登录|手机号登录)/i;
const DEFAULT_FETCH_HEADERS = {
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
  'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8',
};

function parseArgs(argv) {
  const options = {
    url: '',
    file: '',
    timeoutMs: DEFAULT_TIMEOUT_MS,
    interactiveLimit: DEFAULT_INTERACTIVE_LIMIT,
    inputLimit: DEFAULT_INPUT_LIMIT,
    regionLimit: DEFAULT_REGION_LIMIT,
    compact: false,
    stdin: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--url') {
      options.url = argv[index + 1] || '';
      index += 1;
    } else if (arg === '--file' || arg === '--html-file') {
      options.file = argv[index + 1] || '';
      index += 1;
    } else if (arg === '--timeout-ms') {
      options.timeoutMs = Number(argv[index + 1] || DEFAULT_TIMEOUT_MS);
      index += 1;
    } else if (arg === '--interactive-limit') {
      options.interactiveLimit = Number(argv[index + 1] || DEFAULT_INTERACTIVE_LIMIT);
      index += 1;
    } else if (arg === '--input-limit') {
      options.inputLimit = Number(argv[index + 1] || DEFAULT_INPUT_LIMIT);
      index += 1;
    } else if (arg === '--region-limit') {
      options.regionLimit = Number(argv[index + 1] || DEFAULT_REGION_LIMIT);
      index += 1;
    } else if (arg === '--compact') {
      options.compact = true;
    } else if (arg === '--stdin') {
      options.stdin = true;
    }
  }

  return options;
}

function decodeEntities(value) {
  if (!value) return '';
  const named = {
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
    apos: "'",
    nbsp: ' ',
    ndash: '–',
    mdash: '—',
    hellip: '…',
  };

  return value.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (_, entity) => {
    if (entity.startsWith('#x') || entity.startsWith('#X')) {
      const code = Number.parseInt(entity.slice(2), 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : _;
    }
    if (entity.startsWith('#')) {
      const code = Number.parseInt(entity.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : _;
    }
    return named[entity] || _;
  });
}

function stripTags(value) {
  return decodeEntities(
    String(value || '')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

function parseAttributes(source) {
  const attrs = {};
  const attrRe = /([:@a-zA-Z0-9_-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  for (const match of source.matchAll(attrRe)) {
    const key = String(match[1] || '').toLowerCase();
    if (!key) continue;
    attrs[key] = String(match[2] ?? match[3] ?? match[4] ?? '').trim();
  }
  return attrs;
}

function isHidden(attrs) {
  const style = String(attrs.style || '').toLowerCase();
  return Object.prototype.hasOwnProperty.call(attrs, 'hidden')
    || attrs['aria-hidden'] === 'true'
    || style.includes('display:none')
    || style.includes('visibility:hidden');
}

function normalizeLabel(value) {
  return stripTags(value)
    .replace(/\s+/g, ' ')
    .trim();
}

function uniqueBy(items, keyBuilder) {
  const seen = new Set();
  const result = [];
  for (const item of items) {
    const key = keyBuilder(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
}

function pickPriority(label, attrs = {}) {
  const raw = `${label} ${attrs.type || ''} ${attrs.role || ''} ${attrs.class || ''}`.toLowerCase();
  if (/(save|submit|search|login|sign in|continue|next|confirm|apply|checkout|buy|send|filter)/i.test(raw)) {
    return 'high';
  }
  if (/(cancel|close|back|secondary|reset)/i.test(raw)) {
    return 'medium';
  }
  return 'medium';
}

function buildLabelMap(html) {
  const result = {};
  const labelRe = /<label\b([^>]*)>([\s\S]*?)<\/label>/gi;
  for (const match of html.matchAll(labelRe)) {
    const attrs = parseAttributes(match[1] || '');
    const text = normalizeLabel(match[2] || '');
    if (!text) continue;
    if (attrs.for) {
      result[attrs.for] = text;
      continue;
    }
    const nestedIdMatch = String(match[2] || '').match(/<(input|select|textarea)\b([^>]*)>/i);
    if (!nestedIdMatch) continue;
    const nestedAttrs = parseAttributes(nestedIdMatch[2] || '');
    if (nestedAttrs.id) {
      result[nestedAttrs.id] = text;
    }
  }
  return result;
}

function collectButtons(html) {
  const items = [];
  const buttonRe = /<button\b([^>]*)>([\s\S]*?)<\/button>/gi;
  for (const match of html.matchAll(buttonRe)) {
    const attrs = parseAttributes(match[1] || '');
    if (isHidden(attrs) || attrs.disabled !== undefined) continue;
    const label = normalizeLabel(match[2] || '') || normalizeLabel(attrs['aria-label']) || normalizeLabel(attrs.title);
    if (!label) continue;
    items.push({
      type: 'button',
      label,
      priority: pickPriority(label, attrs),
    });
  }
  return items;
}

function collectLinks(html) {
  const items = [];
  const linkRe = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(linkRe)) {
    const attrs = parseAttributes(match[1] || '');
    if (isHidden(attrs) || !attrs.href) continue;
    const label = normalizeLabel(match[2] || '') || normalizeLabel(attrs['aria-label']) || normalizeLabel(attrs.title);
    if (!label) continue;
    items.push({
      type: 'link',
      label,
      priority: pickPriority(label, attrs),
    });
  }
  return items;
}

function collectInputs(html, labelMap) {
  const inputs = [];
  const inputRe = /<(input|textarea|select)\b([^>]*)(?:>([\s\S]*?)<\/\1>|\/?>)/gi;
  for (const match of html.matchAll(inputRe)) {
    const tag = String(match[1] || '').toLowerCase();
    const attrs = parseAttributes(match[2] || '');
    if (isHidden(attrs)) continue;
    if (tag === 'input' && String(attrs.type || 'text').toLowerCase() === 'hidden') continue;

    const type = tag === 'input' ? String(attrs.type || 'text').toLowerCase() : tag;
    const label = normalizeLabel(
      attrs['aria-label']
      || attrs.placeholder
      || (attrs.id ? labelMap[attrs.id] : '')
      || attrs.name
      || attrs.id
      || attrs.title
    );

    inputs.push({
      type,
      label: label || `(unlabeled ${tag})`,
      required: attrs.required !== undefined || attrs['aria-required'] === 'true',
    });
  }

  return inputs;
}

function collectRegions(html) {
  const regions = [];
  const regionPatterns = [
    { label: 'Main content', re: /<main\b[^>]*>/i },
    { label: 'Top navigation', re: /<nav\b[^>]*>/i },
    { label: 'Header', re: /<header\b[^>]*>/i },
    { label: 'Sidebar', re: /<aside\b[^>]*>/i },
    { label: 'Footer', re: /<footer\b[^>]*>/i },
    { label: 'Form area', re: /<form\b[^>]*>/i },
    { label: 'Data table', re: /<table\b[^>]*>/i },
  ];

  for (const pattern of regionPatterns) {
    if (pattern.re.test(html)) {
      regions.push(pattern.label);
    }
  }

  const headingRe = /<h([1-3])\b[^>]*>([\s\S]*?)<\/h\1>/gi;
  for (const match of html.matchAll(headingRe)) {
    const text = normalizeLabel(match[2] || '');
    if (!text) continue;
    regions.push(text);
  }

  return uniqueBy(regions, (item) => item);
}

function isLikelyAuthPage({ title, url, html, inputs, interactiveElements }) {
  const labelText = [
    ...inputs.map((item) => `${item.type} ${item.label}`),
    ...interactiveElements.map((item) => `${item.type} ${item.label}`),
  ].join(' ');
  const sample = String(html || '').slice(0, 5000);
  return AUTH_URL_RE.test(String(url || ''))
    || AUTH_TEXT_RE.test(`${title || ''} ${labelText} ${sample}`);
}

function guessPageGoal({ title, url, inputs, interactiveElements, html }) {
  const lowerTitle = String(title || '').toLowerCase();
  const labels = [
    ...inputs.map((item) => `${item.type} ${item.label}`),
    ...interactiveElements.map((item) => `${item.type} ${item.label}`),
  ].join(' ').toLowerCase();

  if (isLikelyAuthPage({ title, url, html, inputs, interactiveElements })) {
    return 'Account login or authentication';
  }
  if (/(search|filter|query)/i.test(labels)) {
    return 'Search, filter, or find information';
  }
  if (/(save|settings|preferences|update profile|notification)/i.test(labels) || /(settings|preferences)/i.test(lowerTitle)) {
    return 'Configure settings or update preferences';
  }
  if (/<table\b/i.test(html) || /(dashboard|analytics|report)/i.test(lowerTitle)) {
    return 'Review data, dashboard, or tabular content';
  }
  if (/<article\b/i.test(html) || /(docs|documentation|guide|readme)/i.test(lowerTitle)) {
    return 'Read documentation or structured content';
  }
  if (inputs.length > 0) {
    return 'Fill in a form and submit information';
  }
  return title ? `Understand or act on "${title}"` : 'Understand the current webpage structure';
}

function buildPrimaryActions(interactiveElements, inputs) {
  const actions = [];
  for (const item of interactiveElements) {
    if (item.type === 'button' || item.type === 'link') {
      actions.push(`${item.type === 'button' ? 'Click' : 'Open'} ${item.label}`);
    }
  }
  for (const input of inputs) {
    actions.push(`Fill ${input.label}`);
  }
  return uniqueBy(actions, (item) => item).slice(0, 5);
}

function buildWarnings({ html, url, requestedUrl, pageTitle, interactiveElements, inputs, sourceMode }) {
  const warnings = [];
  const lowerHtml = html.toLowerCase();
  if (sourceMode !== 'live-browser') {
    warnings.push('Scroll state is approximate in fetch/file mode.');
  }
  if (requestedUrl && url && requestedUrl !== url) {
    warnings.push(`Requested URL redirected before observation: ${requestedUrl} -> ${url}`);
  }
  if (isLikelyAuthPage({ title: pageTitle, url, html, inputs, interactiveElements })) {
    warnings.push('Fetch landed on a login/auth page. This observer does not inherit your in-browser session.');
  }
  if (/__next|data-reactroot|ng-version|id="app"|id="root"|vite/i.test(lowerHtml)) {
    warnings.push('Page may be framework-driven and some visible state could require live browser rendering.');
  }
  if (interactiveElements.length === 0 && inputs.length === 0) {
    warnings.push('Very few obvious interactive elements were found.');
  }
  if (url && !/^https?:/i.test(url)) {
    warnings.push('Observation was not fetched from a standard http/https URL.');
  }
  return warnings;
}

function pickRecommendedNextStep(primaryActions, inputs, warnings) {
  if (inputs.length > 0) {
    return `Inspect the visible form fields before taking action${warnings.length > 0 ? ' and watch for dynamic content limits' : ''}.`;
  }
  if (primaryActions.length > 0) {
    return primaryActions[0];
  }
  return 'Review the main visible regions before deciding whether heavier browser interaction is needed.';
}

function truncateList(items, limit) {
  return items.slice(0, Math.max(0, limit));
}

async function readFromStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf8');
}

async function loadHtml(options) {
  if (options.stdin) {
    const html = await readFromStdin();
    return { html, pageUrl: '', requestedUrl: '', sourceMode: 'stdin' };
  }

  if (options.file) {
    const filePath = path.resolve(options.file);
    return {
      html: fs.readFileSync(filePath, 'utf8'),
      pageUrl: `file://${filePath.replace(/\\/g, '/')}`,
      requestedUrl: '',
      sourceMode: 'file',
    };
  }

  if (options.url) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs);
    try {
      const response = await fetch(options.url, {
        headers: DEFAULT_FETCH_HEADERS,
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`Fetch failed: ${response.status} ${response.statusText}`);
      }
      const html = await response.text();
      return {
        html,
        pageUrl: response.url || options.url,
        requestedUrl: options.url,
        sourceMode: 'url',
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new Error('Provide --url, --file, or --stdin');
}

function extractTitle(html) {
  const match = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  return normalizeLabel(match?.[1] || '');
}

function buildObservation({ html, pageUrl, requestedUrl, sourceMode, options }) {
  const labelMap = buildLabelMap(html);
  const buttons = collectButtons(html);
  const links = collectLinks(html);
  const inputs = truncateList(
    uniqueBy(collectInputs(html, labelMap), (item) => `${item.type}|${item.label}|${item.required}`),
    options.inputLimit
  );
  const interactiveElements = truncateList(
    uniqueBy([...buttons, ...links], (item) => `${item.type}|${item.label}`),
    options.interactiveLimit
  );
  const pageTitle = extractTitle(html);
  const mainRegions = truncateList(collectRegions(html), options.regionLimit);
  const warnings = buildWarnings({
    html,
    url: pageUrl,
    requestedUrl,
    pageTitle,
    interactiveElements,
    inputs,
    sourceMode,
  });
  const primaryActions = buildPrimaryActions(interactiveElements, inputs);

  return {
    pageTitle,
    pageUrl,
    pageGoalGuess: guessPageGoal({ title: pageTitle, url: pageUrl, inputs, interactiveElements, html }),
    mainRegions,
    interactiveElements,
    inputs,
    primaryActions,
    scrollState: {
      canScrollUp: false,
      canScrollDown: false,
    },
    warnings,
    recommendedNextStep: pickRecommendedNextStep(primaryActions, inputs, warnings),
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!options.url && !options.file && !options.stdin) {
    const inlineUrl = process.argv.slice(2).find((item) => URL_RE.test(item));
    if (inlineUrl) {
      options.url = inlineUrl;
    }
  }

  const loaded = await loadHtml(options);
  const observation = buildObservation({
    html: loaded.html,
    pageUrl: loaded.pageUrl,
    requestedUrl: loaded.requestedUrl,
    sourceMode: loaded.sourceMode,
    options,
  });

  const json = options.compact
    ? JSON.stringify(observation)
    : JSON.stringify(observation, null, 2);
  process.stdout.write(json);
}

main().catch((error) => {
  process.stderr.write(String(error instanceof Error ? error.message : error));
  process.exitCode = 1;
});
