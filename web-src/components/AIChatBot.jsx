import { useEffect, useMemo, useRef, useState } from 'react';
import { CHAT_MODES } from '../config/chatModes.js';
import { localAnalysis, sendChatMessage } from '../services/chatApi.js';

const welcome = {
  role: 'assistant',
  content: '输入问题后，可查看当前输入、动态规划过程、效率对比或参考文献说明。',
};

/**
 * 可浮动也可内嵌的问答面板。
 * inline=true 时用于文献阅读页右侧；默认模式用于主界面右下角浮窗。
 */
export default function AIChatBot({
  isOpen = true,
  setIsOpen = () => {},
  context,
  inline = false,
  title = '学习问答',
  subtitle = '围绕当前页面整理说明',
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

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isTyping, isOpen]);

  /**
   * 提交用户问题并追加回答。
   * 在线服务失败时自动降级到基础说明，确保现场演示不断线。
   */
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
      setMessages((current) => [...current, { role: 'assistant', content: result.reply }]);
      if (result.configured === false) setHint('当前显示基础说明');
      else if (Number.isFinite(Number(result.remaining))) setHint(`今日剩余次数 ${result.remaining} 次`);
    } catch {
      setMessages((current) => [
        ...current,
        { role: 'assistant', content: `${localAnalysis(scopedContext, trimmed)}\n\n暂时无法连接在线服务，已切换为基础说明。` },
      ]);
      setHint('当前显示基础说明');
    } finally {
      setIsTyping(false);
    }
  }

  const panel = (
    <div className={`chat-panel ${isOpen ? 'chat-panel-open' : ''} ${inline ? 'chat-panel-inline' : ''}`} aria-hidden={!isOpen && !inline}>
        <div className="chat-head">
          <div>
            <p>{title}</p>
            <span>{hint}</span>
          </div>
          {!inline ? (
            <button type="button" className="icon-button" onClick={() => setIsOpen(false)} aria-label="关闭问答">
              <span aria-hidden="true">X</span>
            </button>
          ) : null}
        </div>

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
              <p className={`chat-bubble ${message.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'}`}>
                {message.content}
              </p>
            </div>
          ))}
          {isTyping ? (
            <div className="chat-row">
              <div className="chat-bubble chat-bubble-ai typing">
                <span className="typing-dot" />
                <span className="typing-dot delay-150" />
                <span className="typing-dot delay-300" />
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

      <button type="button" className="chat-fab" onClick={() => setIsOpen((value) => !value)} aria-label="打开问答">
        <span aria-hidden="true">{isOpen ? '问' : '问'}</span>
      </button>
    </div>
  );
}
