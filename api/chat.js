import fs from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_DAILY_LIMIT = 30;
const DEFAULT_DOUBAO_BASE_URL = 'https://ark.cn-beijing.volces.com/api/v3';
const DEFAULT_DOUBAO_MODEL = 'doubao-seed-1-6-250615';
const DEFAULT_DEEPSEEK_BASE_URL = 'https://api.deepseek.com';
const DEFAULT_DEEPSEEK_MODEL = 'deepseek-v4-flash';
const PDF_TEXT_LIMIT = 5200;
const PDF_PARSE_MODULE = 'pdf-parse/lib/pdf-parse.js';
const SHANGHAI_OFFSET_MS = 8 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const pdfTextCache = new Map();
let pdfParserPromise = null;

const memoryUsage = globalThis.__lcsScsAiUsage || new Map();
globalThis.__lcsScsAiUsage = memoryUsage;

const sensitivePatterns = [
  /api[_-]?key\s*[:=]\s*[\w-]{12,}/i,
  /password\s*[:=]\s*\S{6,}/i,
  /secret\s*[:=]\s*\S{8,}/i,
  /\b(?:sk|vcp|ak|ep)_[A-Za-z0-9_-]{16,}\b/i,
  /\b\d{15,19}\b/,
  /\b\d{17}[\dXx]\b/,
];

const scopeLabels = {
  lcs_scs: '主页面问答',
  lcs_scs_reference: '文献阅读问答',
};

const providerLabels = {
  doubao: '豆包',
  deepseek: 'DeepSeek',
  local: '基础说明',
};

function firstEnv(...names) {
  return names.map((name) => process.env[name]).find(Boolean);
}

function setCorsHeaders(response) {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function resolveScope(value = 'lcs_scs') {
  const scope = String(value || 'lcs_scs').replace(/[^\w-]/g, '').slice(0, 48);
  return scope || 'lcs_scs';
}

function containsSensitiveInfo(value = '') {
  return sensitivePatterns.some((pattern) => pattern.test(value));
}

function getShanghaiDateKey() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function secondsUntilShanghaiMidnight() {
  const shanghaiNow = Date.now() + SHANGHAI_OFFSET_MS;
  const nextMidnight = Math.floor(shanghaiNow / DAY_MS) * DAY_MS + DAY_MS;
  return Math.max(60, Math.ceil((nextMidnight - shanghaiNow) / 1000));
}

function dailyUsageKey() {
  return `lcs_scs_ai_usage:${getShanghaiDateKey()}`;
}

function getRedisConfig() {
  const url = firstEnv('KV_REST_API_URL', 'UPSTASH_REDIS_REST_URL');
  const token = firstEnv('KV_REST_API_TOKEN', 'UPSTASH_REDIS_REST_TOKEN');
  return url && token ? { url: url.replace(/\/+$/, ''), token } : null;
}

async function redisCommand(command) {
  const config = getRedisConfig();
  if (!config) return null;
  const response = await fetch(config.url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.error) throw new Error(payload.error || 'Redis request failed');
  return payload.result;
}

async function readUsage() {
  const key = dailyUsageKey();
  try {
    const value = await redisCommand(['GET', key]);
    if (value !== null && value !== undefined) {
      return { date: getShanghaiDateKey(), count: Number(value || 0), storage: 'vercel-kv' };
    }
    if (getRedisConfig()) return { date: getShanghaiDateKey(), count: 0, storage: 'vercel-kv' };
  } catch {
    // Fall through to server memory so the chat remains usable if KV is temporarily unavailable.
  }
  return { date: getShanghaiDateKey(), count: Number(memoryUsage.get(key) || 0), storage: 'server-memory' };
}

async function incrementUsage() {
  const key = dailyUsageKey();
  const ttl = secondsUntilShanghaiMidnight();
  if (getRedisConfig()) {
    try {
      const count = Number(await redisCommand(['INCR', key]));
      await redisCommand(['EXPIRE', key, ttl]);
      return { date: getShanghaiDateKey(), count, storage: 'vercel-kv' };
    } catch {
      // Fall through to server memory so a transient KV error does not block chat.
    }
  }
  const count = Number(memoryUsage.get(key) || 0) + 1;
  memoryUsage.set(key, count);
  return { date: getShanghaiDateKey(), count, storage: 'server-memory' };
}

function normalizeMessages(messages = []) {
  return messages
    .filter((message) => ['user', 'assistant'].includes(message.role))
    .slice(-10)
    .map((message) => ({
      role: message.role,
      content: String(message.content || '').slice(0, 2200),
    }));
}

function normalizeStringArray(value = [], limit = 900) {
  if (Array.isArray(value)) return value.map((item) => String(item || '').trim()).filter(Boolean).join(' / ').slice(0, limit);
  return String(value || '').slice(0, limit);
}

function compactText(value = '', limit = PDF_TEXT_LIMIT) {
  return String(value).replace(/\s+/g, ' ').trim().slice(0, limit);
}

function normalizeContext(context = {}) {
  return {
    chatScope: resolveScope(context.chatScope),
    mode: String(context.mode || '综合分析').slice(0, 60),
    pageTitle: String(context.pageTitle || '').slice(0, 160),
    pagePath: String(context.pagePath || '').slice(0, 220),
    pageUrl: String(context.pageUrl || '').slice(0, 300),
    pageText: String(context.pageText || '').slice(0, 3600),
    str1Length: Number(context.str1Length || 0),
    str2Length: Number(context.str2Length || 0),
    lcsLength: Number(context.lcsLength || 0),
    scsLength: Number(context.scsLength || 0),
    standardTimeUs: Number(context.standardTimeUs || 0),
    optimizedTimeUs: Number(context.optimizedTimeUs || 0),
    hirschbergTimeUs: Number(context.hirschbergTimeUs || 0),
    standardMemoryBytes: Number(context.standardMemoryBytes || 0),
    optimizedMemoryBytes: Number(context.optimizedMemoryBytes || 0),
    hirschbergMemoryBytes: Number(context.hirschbergMemoryBytes || 0),
    lcsPreview: String(context.lcsPreview || '').slice(0, 300),
    scsPreview: String(context.scsPreview || '').slice(0, 300),
    referenceTitleEn: String(context.referenceTitleEn || '').slice(0, 240),
    referenceTitleZh: String(context.referenceTitleZh || '').slice(0, 240),
    referenceAuthors: String(context.referenceAuthors || '').slice(0, 240),
    referenceVenue: String(context.referenceVenue || '').slice(0, 160),
    referenceHref: String(context.referenceHref || '').slice(0, 300),
    referenceSummary: String(context.referenceSummary || '').slice(0, 720),
    referenceReplicatedIn: String(context.referenceReplicatedIn || '').slice(0, 720),
    referenceMethodUse: String(context.referenceMethodUse || '').slice(0, 720),
    referenceMethodSteps: normalizeStringArray(context.referenceMethodSteps),
    pdfText: String(context.pdfText || '').slice(0, PDF_TEXT_LIMIT),
    pdfTextStatus: String(context.pdfTextStatus || '').slice(0, 60),
  };
}

function resolvePdfUrl(context) {
  const href = String(context.referenceHref || '');
  if (!href || !href.toLowerCase().endsWith('.pdf')) return '';
  if (/^https?:\/\//i.test(href)) return href;
  const base = context.pageUrl || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:4175');
  return new URL(href, base).toString();
}

async function readLocalPdfBuffer(href) {
  if (!href || /^https?:\/\//i.test(href)) return null;
  const cleanPath = href.replace(/^\/+/, '').replaceAll('\\', '/');
  if (!cleanPath.startsWith('references/')) return null;
  return fs.readFile(path.join(process.cwd(), 'public', cleanPath));
}

async function readRemotePdfBuffer(context) {
  const url = resolvePdfUrl(context);
  if (!url) return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) return null;
    return Buffer.from(await response.arrayBuffer());
  } finally {
    clearTimeout(timeout);
  }
}

async function loadPdfParser() {
  process.noDeprecation = true;
  if (!pdfParserPromise) {
    const runtimeImport = new Function('specifier', 'return import(specifier)');
    pdfParserPromise = runtimeImport(PDF_PARSE_MODULE).then((module) => module.default || module);
  }
  return pdfParserPromise;
}

async function extractPdfText(context) {
  const href = String(context.referenceHref || '');
  if (!href) return { text: '', status: 'not_applicable' };
  if (pdfTextCache.has(href)) return { text: pdfTextCache.get(href), status: 'cached' };

  let buffer = null;
  try {
    buffer = (await readLocalPdfBuffer(href)) || (await readRemotePdfBuffer(context));
  } catch {
    buffer = null;
  }
  if (!buffer) return { text: '', status: 'unavailable' };

  try {
    const pdfParse = await loadPdfParser();
    const result = await pdfParse(buffer);
    const text = compactText(result.text || '');
    if (text) pdfTextCache.set(href, text);
    return { text, status: text ? 'extracted' : 'empty' };
  } catch {
    return { text: '', status: 'parse_failed' };
  }
}

function getDailyLimit() {
  const value = Number(process.env.LCS_AI_DAILY_LIMIT || process.env.JASONRHAN_AI_DAILY_LIMIT || DEFAULT_DAILY_LIMIT);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_DAILY_LIMIT;
}

function chooseProvider(context = {}) {
  const mode = String(context.mode || '');
  if (mode.includes('文献') || context.referenceHref) return 'doubao';
  return 'deepseek';
}

function getProviderConfig(provider) {
  if (provider === 'deepseek') {
    return {
      provider: 'deepseek',
      providerLabel: providerLabels.deepseek,
      apiKey: firstEnv('LCS_DEEPSEEK_API_KEY', 'DEEPSEEK_API_KEY', 'DEEPSEEK_AI_API_KEY', 'JASONRHAN_DEEPSEEK_API_KEY'),
      baseUrl: (firstEnv('LCS_DEEPSEEK_BASE_URL', 'DEEPSEEK_BASE_URL', 'DEEPSEEK_AI_BASE_URL', 'JASONRHAN_DEEPSEEK_BASE_URL') || DEFAULT_DEEPSEEK_BASE_URL).replace(/\/+$/, ''),
      model: firstEnv('LCS_DEEPSEEK_MODEL', 'DEEPSEEK_MODEL', 'DEEPSEEK_AI_MODEL', 'JASONRHAN_DEEPSEEK_MODEL') || DEFAULT_DEEPSEEK_MODEL,
    };
  }
  return {
    provider: 'doubao',
    providerLabel: providerLabels.doubao,
    apiKey: firstEnv('LCS_AI_API_KEY', 'DOUBAO_API_KEY', 'ARK_API_KEY', 'VOLCENGINE_API_KEY'),
    baseUrl: (firstEnv('LCS_AI_BASE_URL', 'DOUBAO_BASE_URL', 'ARK_BASE_URL', 'VOLCENGINE_BASE_URL') || DEFAULT_DOUBAO_BASE_URL).replace(/\/+$/, ''),
    model: firstEnv('LCS_AI_MODEL', 'DOUBAO_MODEL', 'ARK_MODEL', 'VOLCENGINE_MODEL') || DEFAULT_DOUBAO_MODEL,
  };
}

function providerStatus() {
  const doubao = getProviderConfig('doubao');
  const deepseek = getProviderConfig('deepseek');
  return {
    doubao: { configured: Boolean(doubao.apiKey), model: doubao.model, providerLabel: doubao.providerLabel },
    deepseek: { configured: Boolean(deepseek.apiKey), model: deepseek.model, providerLabel: deepseek.providerLabel },
  };
}

function json(response, status, payload) {
  response.status(status).json(payload);
}

async function usagePayload(scope, context = {}) {
  const dailyLimit = getDailyLimit();
  const usage = await readUsage();
  const provider = chooseProvider(context);
  const config = getProviderConfig(provider);
  return {
    configured: Boolean(config.apiKey),
    provider,
    providerLabel: config.providerLabel,
    model: config.model,
    providers: providerStatus(),
    scope,
    scopeLabel: scopeLabels[scope] || '当前页面',
    limited: usage.count >= dailyLimit,
    used: usage.count,
    remaining: Math.max(dailyLimit - usage.count, 0),
    dailyLimit,
    resetAt: `${getShanghaiDateKey()} 24:00 Asia/Shanghai`,
    quotaStorage: usage.storage,
  };
}

export default async function handler(request, response) {
  setCorsHeaders(response);

  if (request.method === 'OPTIONS') {
    if (typeof response.status === 'function' && typeof response.end === 'function') return response.status(204).end();
    return json(response, 204, {});
  }

  const queryScope = request.query?.scope;
  const bodyScope = request.body?.chatScope || request.body?.context?.chatScope;
  const scope = resolveScope(queryScope || bodyScope || 'lcs_scs');

  if (request.method === 'GET') {
    return json(response, 200, await usagePayload(scope, { chatScope: scope, mode: request.query?.mode || '' }));
  }

  if (request.method !== 'POST') {
    response.setHeader('Allow', 'GET, POST, OPTIONS');
    return json(response, 405, { error: '仅支持 GET、POST 或 OPTIONS 请求。' });
  }

  const messages = normalizeMessages(request.body?.messages);
  const context = normalizeContext({ ...request.body?.context, chatScope: scope });
  const latestUserMessage = [...messages].reverse().find((message) => message.role === 'user');

  if (!latestUserMessage?.content) return json(response, 400, { error: '消息不能为空。' });
  if (containsSensitiveInfo(latestUserMessage.content)) {
    return json(response, 400, { error: '检测到可能包含敏感信息，请删除 API Key、密码、证件号或银行卡号后再发送。' });
  }

  const dailyLimit = getDailyLimit();
  const usage = await readUsage();
  if (usage.count >= dailyLimit) {
    const selectedConfig = getProviderConfig(chooseProvider(context));
    return json(response, 200, {
      limited: true,
      provider: selectedConfig.provider,
      providerLabel: selectedConfig.providerLabel,
      model: selectedConfig.model,
      scope,
      scopeLabel: scopeLabels[scope] || '当前页面',
      used: usage.count,
      remaining: 0,
      dailyLimit,
      quotaStorage: usage.storage,
      reply: `今日问答次数已达上限 ${dailyLimit} 次。`,
    });
  }

  const selectedProvider = chooseProvider(context);
  const { apiKey, baseUrl, model, provider, providerLabel } = getProviderConfig(selectedProvider);
  if (!apiKey) {
    return json(response, 200, {
      configured: false,
      provider,
      providerLabel,
      model,
      scope,
      scopeLabel: scopeLabels[scope] || '当前页面',
      used: usage.count,
      remaining: Math.max(dailyLimit - usage.count, 0),
      dailyLimit,
      quotaStorage: usage.storage,
      reply: `当前未启用 ${providerLabel} 在线回答。算法与可视化仍可完整运行，问答区会显示基础说明。`,
    });
  }

  const pdfContext = await extractPdfText(context);
  const modelContext = {
    ...context,
    provider,
    providerLabel,
    pdfText: pdfContext.text,
    pdfTextStatus: pdfContext.status,
  };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 24000);

  try {
    const modelResponse = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        stream: false,
        temperature: 0.25,
        max_tokens: 1500,
        messages: [
          {
            role: 'system',
            content:
              '你是 LCS&SCS Visualizer 的问答机器人。回答必须使用简洁中文，优先依据当前页面文本、PDF 正文摘录、PDF 文献元数据、文献方法说明和算法运行状态。若上下文没有某个细节，要明确说“页面或 PDF 上下文未提供该细节”，不要编造。不要索要或泄露密钥、隐私、未公开信息。',
          },
          {
            role: 'user',
            content: `当前页面、PDF、模型与文献上下文：${JSON.stringify(modelContext)}`,
          },
          ...messages,
        ],
      }),
    });

    const payload = await modelResponse.json().catch(() => ({}));
    if (!modelResponse.ok) {
      return json(response, modelResponse.status, {
        error: payload?.error?.message || '模型接口返回错误。',
      });
    }

    const nextUsage = await incrementUsage();
    return json(response, 200, {
      configured: true,
      provider,
      providerLabel,
      model,
      scope,
      scopeLabel: scopeLabels[scope] || '当前页面',
      used: nextUsage.count,
      remaining: Math.max(dailyLimit - nextUsage.count, 0),
      dailyLimit,
      quotaStorage: nextUsage.storage,
      reply: payload?.choices?.[0]?.message?.content || '暂时没有生成回复。',
    });
  } catch (error) {
    const message = error.name === 'AbortError' ? '请求超时，请稍后再试。' : '问答服务暂时不可用。';
    return json(response, 500, { error: message });
  } finally {
    clearTimeout(timeout);
  }
}
