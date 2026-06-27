import { useEffect, useMemo, useRef, useState } from 'react';
import { CHAT_MODES } from '../config/chatModes.js';
import { fetchChatQuota, localAnalysis, sendChatMessage } from '../services/chatApi.js';

const welcome = {
  role: 'assistant',
  content: '我是问答机器人，会结合当前页面、PDF 文献信息和算法结果回答。',
};

function quotaHint(payload, fallback = '当前页面') {
  const label = payload?.scopeLabel || fallback;
  const dailyLimit = Number(payload?.dailyLimit);
  const remaining = Number(payload?.remaining);
  if (payload?.limited) return `${label}本日额度已用完，上限 ${dailyLimit} 次`;
  if (Number.isFinite(dailyLimit) && Number.isFinite(remaining)) {
    return `${label}本日上限 ${dailyLimit} 次，剩余 ${remaining} 次`;
  }
  return `${label}本日限额读取中`;
}

function contextChips(context = {}) {
  const chips = [];
  if (context.referenceTitleZh || context.referenceTitleEn || context.referenceHref) {
    chips.push(`PDF：${context.referenceTitleZh || context.referenceTitleEn || '已接入'}`);
  }
  if (context.pageText || context.pagePath || context.pageTitle) chips.push('页面：已读取');
  if (Number(context.lcsLength) || Number(context.scsLength)) {
    chips.push(`算法：LCS ${context.lcsLength || 0} / SCS ${context.scsLength || 0}`);
  }
  return chips.slice(0, 3);
}

function RobotAvatar({ small = false }) {
  return (
    <span className={`robot-avatar ${small ? 'robot-avatar-small' : ''}`} aria-hidden="true">
      <span className="robot-antenna" />
      <span className="robot-eye robot-eye-left" />
      <span className="robot-eye robot-eye-right" />
      <span className="robot-mouth" />
    </span>
  );
}

export default function AIChatBot({
  isOpen = true,
  setIsOpen = () => {},
  context,
  inline = false,
  title = '学习问答',
  subtitle = '已接入当前页面和算法状态',
  initialMode = '综合分析',
  quickPrompts = [],
}) {
  const [messages, setMessages] = useState([welcome]);
  const [input, setInput] = useState('');
  const [mode, setMode] = useState(initialMode);
  const [isTyping, setIsTyping] = useState(false);
  const [hint, setHint] = useState(subtitle);
  const scrollRef = useRef(null);

  const scopedContext = useMemo(() => ({ ...context, mode }), [context, mode]);
  const chips = useMemo(() => contextChips(scopedContext), [scopedContext]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isTyping, isOpen]);

  useEffect(() => {
    if (!isOpen && !inline) return undefined;
    let ignore = false;

    fetchChatQuota(scopedContext)
      .then((payload) => {
        if (!ignore) setHint(quotaHint(payload, title));
      })
      .catch(() => {
        if (!ignore) setHint(`${title}本日限额暂时无法读取`);
      });

    return () => {
      ignore = true;
    };
  }, [inline, isOpen, scopedContext, title]);

  async function submit(event) {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isTyping) return;

    const nextMessages = [...messages, { role: 'user', content: trimmed }];
    setMessages(nextMessages);
    setInput('');
    setIsTyping(true);

    try {
      const result = await sendChatMessage(nextMessages, scopedContext);
      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content: result.reply,
          providerLabel: result.providerLabel || result.provider || '在线服务',
          model: result.model || '',
        },
      ]);
      setHint(quotaHint(result, title));
      if (result.configured === false) setHint(`${quotaHint(result, title)}，当前显示基础说明`);
    } catch {
      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content: `${localAnalysis(scopedContext, trimmed)}\n\n暂时无法连接在线服务，已切换为基础说明。`,
          providerLabel: '基础说明',
        },
      ]);
      setHint('当前显示基础说明');
    } finally {
      setIsTyping(false);
    }
  }

  const panel = (
    <div className={`chat-panel ${isOpen ? 'chat-panel-open' : ''} ${inline ? 'chat-panel-inline' : ''}`} aria-hidden={!isOpen && !inline}>
      <div className="chat-head">
        <RobotAvatar />
        <div className="chat-title-block">
          <p>{title}</p>
          <span>{hint}</span>
        </div>
        {!inline ? (
          <button type="button" className="icon-button" onClick={() => setIsOpen(false)} aria-label="关闭问答">
            <span aria-hidden="true">X</span>
          </button>
        ) : null}
      </div>

      {chips.length ? (
        <div className="chat-context-strip" aria-label="当前读取上下文">
          {chips.map((chip) => (
            <span key={chip}>{chip}</span>
          ))}
        </div>
      ) : null}

      <div className="chat-mode">
        {CHAT_MODES.map((item) => (
          <button
            key={item}
            type="button"
            className={`mini-action ${mode === item ? 'mini-action-active' : ''}`}
            onClick={() => setMode(item)}
          >
            {item}
          </button>
        ))}
      </div>

      {quickPrompts.length ? (
        <div className="quick-prompts">
          {quickPrompts.map((prompt) => (
            <button key={prompt} type="button" className="mini-action" onClick={() => setInput(prompt)}>
              {prompt}
            </button>
          ))}
        </div>
      ) : null}

      <div ref={scrollRef} className="chat-body">
        {messages.map((message, index) => (
          <div key={`${message.role}-${index}`} className={`chat-row ${message.role === 'user' ? 'chat-row-user' : ''}`}>
            {message.role === 'assistant' ? <RobotAvatar small /> : null}
            <div className={`chat-message-stack ${message.role === 'user' ? 'chat-message-stack-user' : ''}`}>
              <p className={`chat-bubble ${message.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'}`}>{message.content}</p>
              {message.role === 'assistant' && message.providerLabel ? (
                <span className="chat-provider-note">
                  回答来源：{message.providerLabel}
                  {message.model ? ` · ${message.model}` : ''}
                </span>
              ) : null}
            </div>
          </div>
        ))}
        {isTyping ? (
          <div className="chat-row">
            <RobotAvatar small />
            <div className="chat-bubble chat-bubble-ai typing">
              <span className="typing-text">思考中...</span>
            </div>
          </div>
        ) : null}
      </div>

      <form className="chat-form" onSubmit={submit}>
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="输入问题，例如：为什么 SCS 长度公式成立？"
        />
        <button type="submit" className="btn-primary" aria-label="发送">
          <span aria-hidden="true">发送</span>
        </button>
      </form>
    </div>
  );

  if (inline) return <div className="chat-inline-wrap">{panel}</div>;

  return (
    <div className="chat-shell">
      {panel}

      <button type="button" className="chat-fab" onClick={() => setIsOpen((value) => !value)} aria-label="打开问答机器人">
        <RobotAvatar small />
      </button>
    </div>
  );
}
