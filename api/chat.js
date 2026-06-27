const DEFAULT_DAILY_LIMIT = 30;
const COOKIE_NAME = 'jasonrhan_lcs_ai_usage';
const DEFAULT_BASE_URL = 'https://ark.cn-beijing.volces.com/api/v3';
const DEFAULT_MODEL = 'doubao-seed-1-6-250615';

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

function firstEnv(...names) {
  return names.map((name) => process.env[name]).find(Boolean);
}

function resolveScope(value = 'lcs_scs') {
  const scope = String(value || 'lcs_scs').replace(/[^\w-]/g, '').slice(0, 48);
  return scope || 'lcs_scs';
}

function getCookieName(scope) {
  return scope === 'lcs_scs' ? COOKIE_NAME : `${COOKIE_NAME}_${scope}`;
}

/**
 * 检查用户输入是否疑似包含敏感信息。
 * 命中时拒绝请求，避免把密钥、证件号或银行卡号转发给外部服务。
 */
function containsSensitiveInfo(value = '') {
  return sensitivePatterns.some((pattern) => pattern.test(value));
}

/**
 * 生成上海时区的日期 key。
 * 每日限额按课程演示常用的本地日期切分，而不是按服务器所在时区切分。
 */
function getShanghaiDateKey() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/**
 * 解析 Cookie 请求头。
 * 这里不依赖第三方库，保证 Vercel Serverless Function 打包足够轻。
 */
function parseCookies(header = '') {
  return Object.fromEntries(
    header
      .split(';')
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => {
        const index = item.indexOf('=');
        if (index === -1) return [item, ''];
        return [item.slice(0, index), decodeURIComponent(item.slice(index + 1))];
      }),
  );
}

/**
 * 从 Cookie 读取今日已使用次数。
 * Cookie 无效或跨日期时自动归零。
 */
function readUsage(request, scope) {
  const date = getShanghaiDateKey();
  const raw = parseCookies(request.headers.cookie || '')[getCookieName(scope)];
  try {
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed?.date === date && Number.isFinite(Number(parsed?.count))) {
      return { date, count: Number(parsed.count) };
    }
  } catch {
    return { date, count: 0 };
  }
  return { date, count: 0 };
}

/**
 * 写回今日使用次数。
 * Vercel 环境下自动加 Secure，普通本地预览则保持可调试。
 */
function writeUsage(response, usage, scope) {
  const secure = process.env.VERCEL ? '; Secure' : '';
  response.setHeader(
    'Set-Cookie',
    `${getCookieName(scope)}=${encodeURIComponent(JSON.stringify(usage))}; Path=/; Max-Age=86400; HttpOnly; SameSite=Lax${secure}`,
  );
}

/**
 * 清洗前端传来的消息列表。
 * 只保留最近少量 user/assistant 消息，防止请求体无限增长。
 */
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

/**
 * 清洗前端实验上下文。
 * 所有字符串都裁剪到固定长度，避免大输入或页面信息撑爆代理请求。
 */
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
  };
}

/**
 * 统一 JSON 响应写法。
 * 减少每个分支重复 status().json() 的样板代码。
 */
function json(response, status, payload) {
  response.status(status).json(payload);
}

function getDailyLimit() {
  const value = Number(process.env.LCS_AI_DAILY_LIMIT || process.env.JASONRHAN_AI_DAILY_LIMIT || DEFAULT_DAILY_LIMIT);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_DAILY_LIMIT;
}

function getModelConfig() {
  return {
    apiKey: firstEnv('LCS_AI_API_KEY', 'DOUBAO_API_KEY', 'ARK_API_KEY', 'VOLCENGINE_API_KEY', 'JASONRHAN_DEEPSEEK_API_KEY'),
    baseUrl: (firstEnv('LCS_AI_BASE_URL', 'DOUBAO_BASE_URL', 'ARK_BASE_URL', 'VOLCENGINE_BASE_URL', 'JASONRHAN_DEEPSEEK_BASE_URL') || DEFAULT_BASE_URL).replace(/\/+$/, ''),
    model: firstEnv('LCS_AI_MODEL', 'DOUBAO_MODEL', 'ARK_MODEL', 'VOLCENGINE_MODEL', 'JASONRHAN_DEEPSEEK_MODEL') || DEFAULT_MODEL,
    provider: firstEnv('LCS_AI_PROVIDER', 'DOUBAO_PROVIDER', 'ARK_PROVIDER') || 'doubao-compatible',
  };
}

function usagePayload(request, scope) {
  const dailyLimit = getDailyLimit();
  const usage = readUsage(request, scope);
  const { apiKey, model, provider } = getModelConfig();
  return {
    configured: Boolean(apiKey),
    provider,
    model,
    scope,
    scopeLabel: scopeLabels[scope] || '当前页面',
    limited: usage.count >= dailyLimit,
    remaining: Math.max(dailyLimit - usage.count, 0),
    dailyLimit,
  };
}

/**
 * Vercel Serverless Function 主入口。
 * 负责限额、敏感信息拦截、在线服务调用和降级提示。
 */
export default async function handler(request, response) {
  const queryScope = request.query?.scope;
  const bodyScope = request.body?.chatScope || request.body?.context?.chatScope;
  const scope = resolveScope(queryScope || bodyScope || 'lcs_scs');

  if (request.method === 'GET') {
    return json(response, 200, usagePayload(request, scope));
  }

  if (request.method !== 'POST') {
    response.setHeader('Allow', 'GET, POST');
    return json(response, 405, { error: '仅支持 GET 或 POST 请求。' });
  }

  const messages = normalizeMessages(request.body?.messages);
  const context = normalizeContext({ ...request.body?.context, chatScope: scope });
  const latestUserMessage = [...messages].reverse().find((message) => message.role === 'user');

  if (!latestUserMessage?.content) return json(response, 400, { error: '消息不能为空。' });
  if (containsSensitiveInfo(latestUserMessage.content)) {
    return json(response, 400, { error: '检测到可能包含敏感信息，请删除 API Key、密码、证件号或银行卡号后再发送。' });
  }

  const dailyLimit = getDailyLimit();
  const usage = readUsage(request, scope);
  if (usage.count >= dailyLimit) {
    writeUsage(response, usage, scope);
    return json(response, 200, {
      limited: true,
      scope,
      scopeLabel: scopeLabels[scope] || '当前页面',
      remaining: 0,
      dailyLimit,
      reply: `今日问答次数已达上限 ${dailyLimit} 次。`,
    });
  }

  const { apiKey, baseUrl, model, provider } = getModelConfig();
  if (!apiKey) {
    return json(response, 200, {
      configured: false,
      provider,
      model,
      scope,
      scopeLabel: scopeLabels[scope] || '当前页面',
      remaining: Math.max(dailyLimit - usage.count, 0),
      dailyLimit,
      reply: '当前未启用在线回答。算法与可视化仍可完整运行，问答区会显示基础说明。',
    });
  }

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
              '你是 LCS&SCS Visualizer 的问答机器人。回答必须使用简洁中文，优先依据当前页面文本、PDF 文献元数据、文献方法说明和算法运行状态。若上下文没有某个细节，要明确说“页面上下文未提供该细节”，不要编造。不要索要或泄露密钥、隐私、未公开信息。',
          },
          {
            role: 'user',
            content: `当前页面与文献上下文：${JSON.stringify(context)}`,
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

    const nextUsage = { date: usage.date, count: usage.count + 1 };
    writeUsage(response, nextUsage, scope);

    return json(response, 200, {
      configured: true,
      provider,
      model,
      scope,
      scopeLabel: scopeLabels[scope] || '当前页面',
      remaining: Math.max(dailyLimit - nextUsage.count, 0),
      dailyLimit,
      reply: payload?.choices?.[0]?.message?.content || '暂时没有生成回复。',
    });
  } catch (error) {
    const message = error.name === 'AbortError' ? '请求超时，请稍后再试。' : '问答服务暂时不可用。';
    return json(response, 500, { error: message });
  } finally {
    clearTimeout(timeout);
  }
}
