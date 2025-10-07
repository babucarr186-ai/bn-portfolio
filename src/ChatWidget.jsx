import { useEffect, useRef, useState } from 'react';
import './App.css';

/*
  Simple client-side chat widget simulating a basic assistant.
  - Rule-based intent detection (keywords)
  - Stores conversation in memory (resets on reload)
  - Can export conversation to WhatsApp with a single click
  NOTE: This is NOT a real AI or WhatsApp bot. For production automation you would
  integrate WhatsApp Business Cloud API or a service like Twilio.
*/

const BOT_NAME = 'Assistant';
const OWNER_NAME = 'Bubacar';
const WHATSAPP_NUMBER_E164 = '491743173671'; // without leading + for wa.me

function classifyMessage(text) {
  const t = text.toLowerCase();
  if (/hello|hi|hey|salaam|salam/.test(t)) return 'greeting';
  if (/price|cost|fee|much/.test(t)) return 'pricing';
  if (/service|offer|what can you do|help/.test(t)) return 'services';
  if (/website|site|page|landing/.test(t)) return 'web';
  if (/market|seo|promotion|traffic/.test(t)) return 'marketing';
  if (/thank|thanks|great|cool/.test(t)) return 'thanks';
  if (/bye|goodbye|later|see you/.test(t)) return 'bye';
  return 'fallback';
}

function respond(intent) {
  switch (intent) {
    case 'greeting':
      return "Hi! I'm here for Bubacar. How can I help you today?";
    case 'pricing':
      return 'Pricing depends on scope. Basic landing pages start simple; tell me what you need and I can note it for a quote.';
    case 'services':
      return 'Core areas: Web development, digital marketing support, light automation, and content help. What are you interested in?';
    case 'web':
      return 'Need a website or landing page? Share purpose (portfolio, event, business leads) and rough content length.';
    case 'marketing':
      return 'For marketing we keep it lean: quick SEO setup, analytics, and content workflow. What platform matters most to you?';
    case 'thanks':
      return 'Glad to help! Ask anything else or send the chat to WhatsApp so Bubacar can follow up.';
    case 'bye':
      return 'Talk soon! You can export this conversation to WhatsApp if you want a direct follow-up.';
    default:
      return "I noted that. Want to tell me if this is about a website, marketing, automation, or something else?";
  }
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { from: 'bot', text: `Hello! I'm a helper for ${OWNER_NAME}. How can I help you?` }
  ]);
  const listRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, open]);

  function sendUser() {
    const trimmed = input.trim();
    if (!trimmed) return;
    setMessages(prev => [...prev, { from: 'user', text: trimmed }]);
    setInput('');
    setTimeout(() => {
      const intent = classifyMessage(trimmed);
      const reply = respond(intent);
      setMessages(prev => [...prev, { from: 'bot', text: reply }]);
    }, 400);
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendUser();
    }
  }

  function exportToWhatsApp() {
    const body = messages.map(m => (m.from === 'user' ? 'You: ' : BOT_NAME + ': ') + m.text).join('\n');
    const url = `https://wa.me/${WHATSAPP_NUMBER_E164}?text=${encodeURIComponent('Conversation summary:%0A' + body + '\n\nMy message: ')}`;
    window.open(url, '_blank', 'noopener');
  }

  return (
    <div className={open ? 'chat-root open' : 'chat-root'} aria-live="polite">
      {open && (
        <div className="chat-panel" role="dialog" aria-label="Chat assistant" aria-modal="false">
          <div className="chat-header">
            <strong>Chat Assistant</strong>
            <button className="chat-close" onClick={() => setOpen(false)} aria-label="Close chat">×</button>
          </div>
          <div className="chat-messages" ref={listRef}>
            {messages.map((m, i) => (
              <div key={i} className={m.from === 'bot' ? 'msg bot' : 'msg user'}>
                {m.text}
              </div>
            ))}
          </div>
          <div className="chat-input-row">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Type a message..."
              rows={1}
              className="chat-input"
              aria-label="Message"
            />
            <button onClick={sendUser} className="chat-send" aria-label="Send message">Send</button>
          </div>
          <div className="chat-footer">
            <button className="chat-export" onClick={exportToWhatsApp} aria-label="Send conversation to WhatsApp">Send to WhatsApp</button>
            <span className="chat-note">Replies are simulated. For urgent queries use WhatsApp directly.</span>
          </div>
        </div>
      )}
      {!open && (
        <button className="chat-fab" onClick={() => { setOpen(true); setTimeout(()=>inputRef.current?.focus(),150); }} aria-label="Open chat assistant">
          Chat
        </button>
      )}
    </div>
  );
}
