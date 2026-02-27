import { useEffect, useRef, useState } from 'react';
import { WHATSAPP_NUMBER_E164 } from './contactConfig';
import './App.css';

/*
  Simple client-side chat widget simulating a shop assistant.
  - Rule-based intent detection (keywords)
  - Stores conversation in localStorage
  - Can export conversation to WhatsApp with a single click
  - Lightweight slot-filling (model, storage, condition, budget, delivery, email)
  NOTE: This is NOT a real AI or WhatsApp bot. For production you would
  integrate WhatsApp Business Cloud API or a service like Twilio.
*/

const BOT_NAME = 'Shop Assistant';
const STORE_NAME = 'Uncle Apple';


const KB = {
  intents: {
    greeting: ['hello','hi','hey','salaam','salam','hallo','moin'],
    models: ['model','which iphone','iphone','pro','plus','se','mini','max'],
    availability: ['available','in stock','stock','today'],
    shipping: ['shipping','delivery','ship','pickup','pick up','collection'],
    warranty: ['warranty','guarantee','return','returns','refund'],
    payment: ['pay','payment','invoice','cash','card','paypal','bank'],
    thanks: ['thanks','thank you','great','cool','awesome'],
    bye: ['bye','goodbye','ciao','later','see you']
  },
  models: ['iphone pro', 'iphone', 'iphone plus', 'iphone se'],
  conditions: ['new','sealed','refurbished','refurb','used'],
  delivery: ['delivery','shipping','pickup']
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
  const model = KB.models.find(m => t.includes(m)) || (t.includes('iphone') ? 'iPhone' : null);
  const storageMatch = t.match(/\b(64|128|256|512|1024)\s*gb\b/);
  const storage = storageMatch ? `${storageMatch[1]}GB` : null;
  const color = (() => {
    const colors = ['black','white','blue','red','green','pink','purple','gold','silver','grey','gray'];
    const c = colors.find(v => t.includes(v));
    return c ? (c === 'gray' ? 'Grey' : (c.charAt(0).toUpperCase() + c.slice(1))) : null;
  })();
  const condition = KB.conditions.find(c => t.includes(c)) || null;
  const deliveryPref = KB.delivery.find(d => t.includes(d)) || null;
  const contactEmailMatch = t.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
  const contactEmail = contactEmailMatch ? contactEmailMatch[0] : null;
  return { model, storage, color, condition, deliveryPref, contactEmail };
}

const FLOW_ORDER = ['model','storage','color','condition','deliveryPref','contactEmail'];
function nextMissing(lead) {
  return FLOW_ORDER.find(k => !lead[k]) || null;
}

function classifyMessage(text) {
  const t = text.toLowerCase();
  if (/hello|hi|hey|salaam|salam/.test(t)) return 'greeting';
  if (/stock|available/.test(t)) return 'availability';
  if (/delivery|shipping|pickup/.test(t)) return 'shipping';
  if (/warranty|return|refund/.test(t)) return 'warranty';
  if (/payment|pay|invoice|cash|card|paypal|bank/.test(t)) return 'payment';
  if (/thank|thanks|great|cool/.test(t)) return 'thanks';
  if (/bye|goodbye|later|see you/.test(t)) return 'bye';
  return 'fallback';
}


export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const defaultMessage = { from: 'bot', text: `Hi! I’m the ${BOT_NAME} for ${STORE_NAME}. Tell me which iPhone you want and I’ll help you request availability.` };
  const initialMessages = (() => {
    try {
      const stored = localStorage.getItem('chat_messages');
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed;
      }
    } catch (e) { void e; }
    return [defaultMessage];
  })();
  const [messages, setMessages] = useState(initialMessages);
  const initialLead = (() => {
    try {
      const stored = localStorage.getItem('chat_lead');
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed;
      }
    } catch (e) { void e; }
    return { model: null, storage: null, color: null, condition: null, deliveryPref: null, contactEmail: null };
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
        return [...msgs, { from: 'bot', text: 'Need help choosing an iPhone? Open chat and tell me your budget + preferred size.' }];
      });
    }, 30000);
    return () => clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
    try { localStorage.setItem('chat_messages', JSON.stringify(messages)); } catch (e) { void e; }
  }, [messages, open]);

  useEffect(() => {
    try { localStorage.setItem('chat_lead', JSON.stringify(lead)); } catch (e) { void e; }
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
      setLead(prev => ({ ...prev, ...Object.fromEntries(Object.entries(ent).filter(([, v]) => v)) }));
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
    const leadSummary = `\n\nAvailability Request\n- Model: ${lead.model || '—'}\n- Storage: ${lead.storage || '—'}\n- Color: ${lead.color || '—'}\n- Condition: ${lead.condition || '—'}\n- Delivery/Pickup: ${lead.deliveryPref || '—'}\n- Email: ${lead.contactEmail || '—'}\n\nNote: ${STORE_NAME} sells original Apple products/parts only.`;
    const body = messages.map(m => (m.from === 'user' ? 'You: ' : BOT_NAME + ': ') + m.text).join('\n') + leadSummary;
    const url = `https://wa.me/${WHATSAPP_NUMBER_E164}?text=${encodeURIComponent('Conversation summary:%0A' + body + '\n\nMy message: ')}`;
    window.open(url, '_blank', 'noopener');
  }

  function clearChat() {
    setMessages([{ from: 'bot', text: `Chat cleared. I’m still here for ${STORE_NAME}. What iPhone are you looking for?` }]);
    setLead({ model: null, storage: null, color: null, condition: null, deliveryPref: null, contactEmail: null });
    setStage('idle');
  }

  function askNext(state) {
    const missing = nextMissing(state);
    if (!missing) {
      setStage('done');
      return { text: 'Thanks! I have enough details. Send to WhatsApp now?', suggestions: ['Send to WhatsApp','Start over'] };
    }
    setStage('collect');
    switch (missing) {
      case 'model':
        return { text: 'Which model do you want?', suggestions: ['iPhone Pro','iPhone','iPhone Plus','iPhone SE'] };
      case 'storage':
        return { text: 'Preferred storage?', suggestions: ['128GB','256GB','512GB','Not sure'] };
      case 'color':
        return { text: 'Any preferred color?', suggestions: ['Black','White','Blue','Not sure'] };
      case 'condition':
        return { text: 'Condition?', suggestions: ['Original condition','New / Sealed','Used (original parts)','Not sure'] };
      case 'deliveryPref':
        return { text: 'Delivery or pickup?', suggestions: ['Delivery','Pickup','Not sure'] };
      case 'contactEmail':
        return { text: 'What email should we use for invoice/receipt (optional)?', suggestions: ['Use WhatsApp only'] };
      default:
        return { text: "Got it. Anything else you'd like to add?", suggestions: [] };
    }
  }

  function buildReply(intent, text) {
    const ent = extractEntities(text);
    const merged = { ...lead, ...Object.fromEntries(Object.entries(ent).filter(([, v]) => v)) };
    const next = askNext(merged);
    if (next && next.text) return next.text;
    switch (intent) {
      case 'greeting':
        return 'Hi! Tell me the model and storage you want — I’ll help you request availability.';
      case 'models':
        return 'We can help with iPhone Pro / iPhone / Plus / SE. Which one do you prefer?';
      case 'availability':
        return 'I can check availability. Which model + storage do you want?';
      case 'shipping':
        return 'We can do delivery or pickup. Which do you prefer?';
      case 'warranty':
        return 'We explain condition clearly before purchase. Which model are you considering?';
      case 'payment':
        return 'Payment options can be confirmed on WhatsApp. Want an invoice by email too?';
      case 'thanks':
        return 'Happy to help! When ready, tap “Send to WhatsApp” to place the enquiry.';
      case 'bye':
        return 'Talk soon — message us anytime if you want a quote.';
      default:
        return 'Tell me: model (Pro/Plus/SE), storage, and preferred color — and I’ll help you request availability.';
    }
  }

  function buildQuickReplies(intent) {
    if (stage === 'done') return ['Send to WhatsApp','Start over'];
    const missing = nextMissing(lead);
    if (missing) return askNext(lead).suggestions || [];
    switch (intent) {
      case 'greeting': return ['iPhone Pro','iPhone','iPhone Plus','iPhone SE'];
      case 'shipping': return ['Delivery','Pickup'];
      default: return ['iPhone Pro','Availability','Delivery'];
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
      setLead(prev => ({ ...prev, ...Object.fromEntries(Object.entries(ent).filter(([, v]) => v)) }));
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
