import { useEffect, useRef, useState } from 'react';
import { WHATSAPP_NUMBER_E164 } from './contactConfig';
import './App.css';

/*
  Simple client-side chat widget simulating a basic assistant.
  - Rule-based intent detection (keywords)
  - Stores conversation in memory (resets on reload)
  - Can export conversation to WhatsApp with a single click
  Smarter add-ons:
  - Keyword scoring + entity extraction (budget, timeline, platform, type, email)
  - Slot-filling quote flow with quick-reply chips
  - Lead state persisted and included in WhatsApp export
  NOTE: This is NOT a real AI or WhatsApp bot. For production automation you would
  integrate WhatsApp Business Cloud API or a service like Twilio.
*/

const BOT_NAME = 'Assistant';
const OWNER_NAME = 'Bubacar';

// Lightweight knowledge base
const KB = {
  intents: {
    greeting: ['hello','hi','hey','salaam','salam','hallo','moin'],
    pricing: ['price','cost','fee','how much','budget','quote','estimate'],
    services: ['service','offer','what can you do','help','capabilities'],
    web: ['website','site','page','landing','portfolio','shop','ecommerce'],
    marketing: ['marketing','seo','promotion','traffic','analytics','content'],
    automation: ['automation','automate','zapier','workflow','form','sheet'],
    timeline: ['deadline','timeline','when','week','weeks','month','months','asap','soon'],
    thanks: ['thanks','thank you','great','cool','awesome'],
    bye: ['bye','goodbye','ciao','later','see you']
  },
  projectTypes: ['landing page','website','portfolio','shop','ecommerce','mini shop','one pager'],
  platforms: ['tiktok','instagram','youtube','shorts','facebook','linkedin']
};

function scoreIntent(text) {
  const t = text.toLowerCase();
  let best = { name: 'fallback', score: 0 };
  for (const [name, words] of Object.entries(KB.intents)) {
    const s = words.reduce((acc, w) => acc + (t.includes(w) ? (w.includes(' ') ? 2 : 1) : 0), 0);
    if (s > best.score) best = { name, score: s };
  }
  return best.score > 0 ? best.name : 'fallback';
}

function extractEntities(text) {
  const t = text.toLowerCase();
  // Budget: numbers like 300, 500, 1k
  const budgetMatch = t.match(/\b(€|eur|euro)?\s?(\d{2,5})(?:\s?(k))?\b/);
  let budget = null;
  if (budgetMatch) {
    const num = parseInt(budgetMatch[2], 10);
    budget = budgetMatch[3] ? num * 1000 : num;
  }
  // Timeline: e.g., 2 weeks, 1 month, asap
  const tlMatch = t.match(/\b(\d{1,2})\s*(week|weeks|month|months|day|days)\b/);
  const asap = /asap|soon|urgent|quick/.test(t);
  const timeline = asap ? 'ASAP' : (tlMatch ? `${tlMatch[1]} ${tlMatch[2]}` : null);
  // Platform and project type
  const platform = KB.platforms.find(p => t.includes(p)) || null;
  const projectType = KB.projectTypes.find(p => t.includes(p)) || null;
  // Email
  const contactEmailMatch = t.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
  const contactEmail = contactEmailMatch ? contactEmailMatch[0] : null;
  return { budget, timeline, platform, projectType, contactEmail };
}

const FLOW_ORDER = ['projectType','platform','budget','timeline','contactEmail'];
function nextMissing(lead) {
  return FLOW_ORDER.find(k => !lead[k]) || null;
}

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
  const [typing, setTyping] = useState(false);
  const initialMessages = (() => {
    try {
      const stored = localStorage.getItem('chat_messages');
      if (stored) return JSON.parse(stored);
    } catch {}
    return [{ from: 'bot', text: `Hello! I'm a helper for ${OWNER_NAME}. How can I help you?` }];
  })();
  const [messages, setMessages] = useState(initialMessages);
  const initialLead = (() => {
    try { const stored = localStorage.getItem('chat_lead'); if (stored) return JSON.parse(stored); } catch {}
    return { projectType: null, platform: null, budget: null, timeline: null, contactEmail: null };
  })();
  const [lead, setLead] = useState(initialLead);
  const [stage, setStage] = useState(nextMissing(initialLead) ? 'collect' : 'idle');
  const listRef = useRef(null);
  const inputRef = useRef(null);
  // Proactive greeting after 30s if chat not opened
  useEffect(() => {
    if (open) return;
    const timer = setTimeout(() => {
      setMessages(msgs => {
        // Only add if not already proactively greeted
        if (msgs.some(m => m.text.includes('Need help?'))) return msgs;
        return [...msgs, { from: 'bot', text: "Need help? Click the chat to ask anything or get a quote!" }];
      });
    }, 30000);
    return () => clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
    try { localStorage.setItem('chat_messages', JSON.stringify(messages)); } catch {}
  }, [messages, open]);

  useEffect(() => {
    try { localStorage.setItem('chat_lead', JSON.stringify(lead)); } catch {}
  }, [lead]);

  function sendUser() {
    const trimmed = input.trim();
    if (!trimmed) return;
    setMessages(prev => [...prev, { from: 'user', text: trimmed }]);
    setInput('');
    setTyping(true);
    setTimeout(() => {
      // Extract and store any entities
      const ent = extractEntities(trimmed);
      setLead(prev => ({ ...prev, ...Object.fromEntries(Object.entries(ent).filter(([_,v]) => v)) }));
      // Determine intent with scoring fallback
      const intent = scoreIntent(trimmed) || classifyMessage(trimmed);
      const reply = buildReply(intent, trimmed);
      const suggestions = buildQuickReplies(intent);
      setMessages(prev => [...prev, { from: 'bot', text: reply, suggestions }]);
      setTyping(false);
    }, 550);
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendUser();
    }
  }

  function exportToWhatsApp() {
    const leadSummary = `\n\nLead Summary\n- Project: ${lead.projectType || '—'}\n- Platform: ${lead.platform || '—'}\n- Budget: ${lead.budget ? '€'+lead.budget : '—'}\n- Timeline: ${lead.timeline || '—'}\n- Email: ${lead.contactEmail || '—'}`;
    const body = messages.map(m => (m.from === 'user' ? 'You: ' : BOT_NAME + ': ') + m.text).join('\n') + leadSummary;
    const url = `https://wa.me/${WHATSAPP_NUMBER_E164}?text=${encodeURIComponent('Conversation summary:%0A' + body + '\n\nMy message: ')}`;
    window.open(url, '_blank', 'noopener');
  }

  function clearChat() {
    setMessages([{ from: 'bot', text: `Chat cleared. I'm still here for ${OWNER_NAME}. How can I help now?` }]);
    setLead({ projectType: null, platform: null, budget: null, timeline: null, contactEmail: null });
    setStage('idle');
  }

  function askNext(state) {
    const missing = nextMissing(state);
    if (!missing) {
      setStage('done');
      return { text: 'Thanks! I have enough to draft an estimate. Send to WhatsApp now?', suggestions: ['Send to WhatsApp','Start over'] };
    }
    setStage('collect');
    switch (missing) {
      case 'projectType':
        return { text: 'Is this a landing page, website, portfolio, or small shop?', suggestions: ['Landing page','Website','Portfolio','Shop'] };
      case 'platform':
        return { text: 'Which platform matters most? (TikTok, Instagram, YouTube...)', suggestions: ['TikTok','Instagram','YouTube','Not sure'] };
      case 'budget':
        return { text: 'Rough budget helps scoping. Any range in mind?', suggestions: ['€300','€500','€1000','Not sure'] };
      case 'timeline':
        return { text: 'What timeline are you aiming for?', suggestions: ['ASAP','2 weeks','1 month','No rush'] };
      case 'contactEmail':
        return { text: 'What email should we use for a proposal?', suggestions: ['Use WhatsApp only'] };
      default:
        return { text: "Got it. Anything else you'd like to add?", suggestions: [] };
    }
  }

  function buildReply(intent, text) {
    const ent = extractEntities(text);
    const merged = { ...lead, ...Object.fromEntries(Object.entries(ent).filter(([_,v]) => v)) };
    const next = askNext(merged);
    if (next && next.text) return next.text;
    switch (intent) {
      case 'greeting': return 'Hi! I can help with websites, marketing and small automations. Want a quick quote?';
      case 'pricing': return 'Pricing depends on scope. I can note a few details and give you a rough estimate.';
      case 'services': return 'Core areas: Web, marketing support, and light automation. Start with project type?';
      case 'web': return 'Website help—great. Tell me if it is a landing page, portfolio or shop.';
      case 'marketing': return 'For marketing: quick SEO, analytics, and content workflows. Which platform matters most?';
      case 'thanks': return 'Glad to help! You can export this chat to WhatsApp for a direct follow-up.';
      case 'bye': return 'Talk soon! Ping me here or WhatsApp when ready.';
      default: return 'I noted that. Is this about a website, marketing, or automation?';
    }
  }

  function buildQuickReplies(intent) {
    if (stage === 'done') return ['Send to WhatsApp','Start over'];
    const missing = nextMissing(lead);
    if (missing) return askNext(lead).suggestions || [];
    switch (intent) {
      case 'greeting': return ['Get a quote','Services','Website'];
      case 'pricing': return ['€300','€500','€1000'];
      case 'web': return ['Landing page','Portfolio','Shop'];
      case 'marketing': return ['TikTok','Instagram','YouTube'];
      default: return ['Website','Marketing','Automation'];
    }
  }

  function onQuickReply(val) {
    if (/send to whatsapp/i.test(val) || /yes, whatsapp/i.test(val)) {
      exportToWhatsApp();
      return;
    }
    if (/start over/i.test(val)) {
      clearChat();
      return;
    }
    const text = val;
    setMessages(prev => [...prev, { from: 'user', text }]);
    setTyping(true);
    setTimeout(() => {
      const ent = extractEntities(text);
      setLead(prev => ({ ...prev, ...Object.fromEntries(Object.entries(ent).filter(([_,v]) => v)) }));
      const intent = scoreIntent(text) || classifyMessage(text);
      const reply = buildReply(intent, text);
      const suggestions = buildQuickReplies(intent);
      setMessages(prev => [...prev, { from: 'bot', text: reply, suggestions }]);
      setTyping(false);
    }, 350);
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
                {m.suggestions && m.suggestions.length > 0 && (
                  <div className="quick-replies" role="group" aria-label="Quick reply options">
                    {m.suggestions.map((s, idx) => (
                      <button key={idx} className="qr-btn" onClick={() => onQuickReply(s)} aria-label={`Reply: ${s}`}>{s}</button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {typing && <div className="msg bot" aria-live="polite"><em>Typing…</em></div>}
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
            <button className="chat-export" style={{background:'#555'}} onClick={clearChat} aria-label="Clear conversation">Clear</button>
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
