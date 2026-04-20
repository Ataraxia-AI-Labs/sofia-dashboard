/**
 * SofIA Web Chat Widget — Embeddable chat for clinic websites
 * Usage: <script src="https://dashboard.ataraxiaialabs.ai/widget.js" data-org="ORG_ID"></script>
 *
 * The widget auto-initializes, fetches config from the backend, and renders
 * a floating chat bubble that expands into a full chat window.
 */
(function () {
  'use strict';

  const SCRIPT = document.currentScript;
  const ORG_ID = SCRIPT?.getAttribute('data-org-id') || SCRIPT?.getAttribute('data-org');
  const API_BASE = SCRIPT?.getAttribute('data-api') || 'https://ataraxia-api-core.onrender.com';
  const DATA_COLOR = SCRIPT?.getAttribute('data-color');
  const DATA_POSITION = SCRIPT?.getAttribute('data-position');

  if (!ORG_ID) {
    console.warn('[SofIA Widget] Missing data-org attribute');
    return;
  }

  // Session management
  const SESSION_KEY = `sofia_session_${ORG_ID}`;
  let sessionId = localStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = crypto.randomUUID?.() || Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(SESSION_KEY, sessionId);
  }

  let config = null;
  let isOpen = false;
  let isLoading = false;
  let messages = [];

  // ---------------------------------------------------------------
  // Styles
  // ---------------------------------------------------------------
  const STYLES = `
    @import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&display=swap');
    #sofia-widget-root { --sofia-color: #7c3aed; --sofia-color-soft: rgba(124,58,237,.08); }
    #sofia-widget-root * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
    .sofia-mono { font-family: 'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, Consolas, monospace !important; }

    #sofia-bubble { position: fixed; bottom: 24px; width: 56px; height: 56px; border-radius: 50%; background: var(--sofia-color); color: #fff; border: none; cursor: pointer; box-shadow: 0 8px 28px rgba(0,0,0,.16), 0 2px 6px rgba(0,0,0,.08); display: flex; align-items: center; justify-content: center; z-index: 99999; transition: transform .25s cubic-bezier(.4,0,.2,1), box-shadow .25s; }
    #sofia-widget-root[data-pos="right"] #sofia-bubble { right: 24px; }
    #sofia-widget-root[data-pos="left"] #sofia-bubble { left: 24px; }
    #sofia-bubble:hover { transform: scale(1.06) translateY(-2px); box-shadow: 0 12px 36px rgba(0,0,0,.22), 0 4px 10px rgba(0,0,0,.1); }
    #sofia-bubble svg { width: 24px; height: 24px; }

    #sofia-window { position: fixed; bottom: 96px; width: 380px; max-width: calc(100vw - 32px); height: 580px; max-height: calc(100vh - 128px); background: #fff; border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,.18), 0 4px 16px rgba(0,0,0,.06); display: none; flex-direction: column; z-index: 99999; overflow: hidden; }
    #sofia-widget-root[data-pos="right"] #sofia-window { right: 24px; }
    #sofia-widget-root[data-pos="left"] #sofia-window { left: 24px; }
    #sofia-window.open { display: flex; animation: sofia-slide-up .25s cubic-bezier(.4,0,.2,1); }
    @keyframes sofia-slide-up { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

    #sofia-widget-root #sofia-header { background: var(--sofia-color); color: #fff; padding: 16px 18px; display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
    #sofia-widget-root #sofia-header-avatar { width: 36px; height: 36px; border-radius: 50%; background: rgba(255,255,255,.2); display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 13px; letter-spacing: .3px; flex-shrink: 0; }
    #sofia-widget-root #sofia-header-info { flex: 1; min-width: 0; }
    #sofia-widget-root #sofia-header-name { font-family: 'JetBrains Mono', ui-monospace, monospace; font-weight: 600; font-size: 11px; letter-spacing: .8px; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    #sofia-widget-root #sofia-header-status { font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 9px; opacity: .8; letter-spacing: 1px; text-transform: uppercase; margin-top: 3px; display: flex; align-items: center; gap: 6px; }
    #sofia-widget-root #sofia-header-status::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: #4ade80; box-shadow: 0 0 8px #4ade80; animation: sofia-pulse 2s ease-in-out infinite; }
    @keyframes sofia-pulse { 0%, 100% { opacity: 1; } 50% { opacity: .55; } }
    #sofia-widget-root #sofia-close { background: none; border: none; color: #fff; cursor: pointer; font-size: 22px; padding: 4px 8px; line-height: 1; opacity: .75; transition: opacity .15s; font-weight: 300; }
    #sofia-widget-root #sofia-close:hover { opacity: 1; }

    #sofia-widget-root #sofia-messages { flex: 1; overflow-y: auto; padding: 20px 16px; display: flex; flex-direction: column; gap: 10px; background: #f8f8fa; scroll-behavior: smooth; }
    #sofia-messages::-webkit-scrollbar { width: 6px; }
    #sofia-messages::-webkit-scrollbar-thumb { background: rgba(0,0,0,.12); border-radius: 3px; }
    #sofia-messages::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,.22); }

    #sofia-widget-root .sofia-msg { max-width: 80%; padding: 12px 16px; border-radius: 18px; font-size: 14px; line-height: 1.5; word-wrap: break-word; white-space: pre-wrap; letter-spacing: -.005em; animation: sofia-msg-in .22s cubic-bezier(.4,0,.2,1); }
    @keyframes sofia-msg-in { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
    #sofia-widget-root .sofia-msg.bot { background: #fff; color: #1f2937; align-self: flex-start; border: 1px solid rgba(0,0,0,.06); box-shadow: 0 1px 3px rgba(0,0,0,.06); }
    #sofia-widget-root .sofia-msg.user { background: var(--sofia-color); color: #fff; align-self: flex-end; box-shadow: 0 2px 8px rgba(124,58,237,.22); }

    #sofia-widget-root .sofia-typing { align-self: flex-start; background: #fff; border: 1px solid rgba(0,0,0,.06); border-radius: 18px; padding: 12px 16px; display: flex; gap: 4px; box-shadow: 0 1px 3px rgba(0,0,0,.06); animation: sofia-msg-in .22s; }
    .sofia-typing span { width: 6px; height: 6px; background: #c4b5fd; border-radius: 50%; animation: sofia-bounce 1.2s infinite ease-in-out; }
    .sofia-typing span:nth-child(2) { animation-delay: .15s; }
    .sofia-typing span:nth-child(3) { animation-delay: .3s; }
    @keyframes sofia-bounce { 0%, 60%, 100% { transform: translateY(0); opacity: .4; } 30% { transform: translateY(-5px); opacity: 1; } }

    #sofia-widget-root #sofia-input-area { padding: 12px 14px; border-top: 1px solid #f0f0f3; display: flex; gap: 8px; background: #fff; align-items: flex-end; flex-shrink: 0; }
    #sofia-widget-root #sofia-input { flex: 1; border: 1px solid #e5e7eb; border-radius: 22px; padding: 10px 16px; font-size: 14px; outline: none; resize: none; max-height: 100px; line-height: 1.4; color: #1f2937; background: #f8f8fa; transition: border-color .15s, background .15s, box-shadow .15s; font-family: inherit; }
    #sofia-widget-root #sofia-input::placeholder { color: #9ca3af; }
    #sofia-widget-root #sofia-input:focus { border-color: var(--sofia-color); background: #fff; box-shadow: 0 0 0 3px var(--sofia-color-soft); }
    #sofia-widget-root #sofia-send { width: 38px; height: 38px; border-radius: 50%; background: var(--sofia-color); color: #fff; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: transform .15s, opacity .15s; }
    #sofia-widget-root #sofia-send:hover:not(:disabled) { transform: scale(1.06); }
    #sofia-widget-root #sofia-send:disabled { opacity: .35; cursor: not-allowed; }
    #sofia-widget-root #sofia-powered { font-family: 'JetBrains Mono', ui-monospace, monospace; text-align: center; padding: 7px; font-size: 8px; color: #9ca3af; background: #fff; letter-spacing: 1.2px; text-transform: uppercase; border-top: 1px solid #f3f4f6; flex-shrink: 0; }
    #sofia-widget-root #sofia-powered a { color: var(--sofia-color); text-decoration: none; font-weight: 600; }
  `;

  // ---------------------------------------------------------------
  // HTML
  // ---------------------------------------------------------------
  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function getInitials(name) {
    if (!name) return 'S';
    return name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
  }

  function render() {
    const botName = config?.bot_name || 'SofIA';
    const orgName = config?.org_name || botName;
    const displayName = orgName.length > 24 ? orgName.slice(0, 22) + '...' : orgName;
    const initials = getInitials(orgName);
    const color = DATA_COLOR || config?.primary_color || '#7c3aed';
    const position = DATA_POSITION || config?.position || 'bottom-right';
    const posKey = position === 'bottom-left' ? 'left' : 'right';

    const root = document.createElement('div');
    root.id = 'sofia-widget-root';
    root.setAttribute('data-pos', posKey);
    root.innerHTML = `
      <style>${STYLES}</style>
      <button id="sofia-bubble" aria-label="Chat con ${escapeHtml(botName)}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
      </button>
      <div id="sofia-window" role="dialog" aria-label="Chat">
        <div id="sofia-header">
          <div id="sofia-header-avatar">${escapeHtml(initials)}</div>
          <div id="sofia-header-info">
            <div id="sofia-header-name">${escapeHtml(displayName)}</div>
            <div id="sofia-header-status">EN LINEA</div>
          </div>
          <button id="sofia-close" aria-label="Cerrar">&times;</button>
        </div>
        <div id="sofia-messages"></div>
        <div id="sofia-input-area">
          <input id="sofia-input" placeholder="Escribe un mensaje..." autocomplete="off" />
          <button id="sofia-send" aria-label="Enviar">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
          </button>
        </div>
        <div id="sofia-powered">POWERED BY <a href="https://ataraxiaialabs.ai" target="_blank" rel="noopener">SOFIA</a></div>
      </div>
    `;
    document.body.appendChild(root);
    root.style.setProperty('--sofia-color', color);

    // Events
    document.getElementById('sofia-bubble').addEventListener('click', toggleChat);
    document.getElementById('sofia-close').addEventListener('click', toggleChat);
    document.getElementById('sofia-send').addEventListener('click', sendMessage);
    document.getElementById('sofia-input').addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    });
  }

  function toggleChat() {
    isOpen = !isOpen;
    const win = document.getElementById('sofia-window');
    win.classList.toggle('open', isOpen);

    if (isOpen && messages.length === 0) {
      const greeting = config?.welcome_message || config?.greeting;
      if (greeting) addMessage(greeting, 'bot');
    }
  }

  function addMessage(text, type) {
    messages.push({ text, type });
    const container = document.getElementById('sofia-messages');
    const div = document.createElement('div');
    div.className = `sofia-msg ${type}`;
    div.textContent = text;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  }

  function showTyping() {
    const container = document.getElementById('sofia-messages');
    const div = document.createElement('div');
    div.className = 'sofia-typing';
    div.id = 'sofia-typing-indicator';
    div.innerHTML = '<span></span><span></span><span></span>';
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  }

  function hideTyping() {
    const el = document.getElementById('sofia-typing-indicator');
    if (el) el.remove();
  }

  async function sendMessage() {
    const input = document.getElementById('sofia-input');
    const text = input.value.trim();
    if (!text || isLoading) return;

    input.value = '';
    addMessage(text, 'user');

    isLoading = true;
    document.getElementById('sofia-send').disabled = true;
    showTyping();

    try {
      const res = await fetch(`${API_BASE}/webchat/${ORG_ID}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, message: text }),
      });

      hideTyping();

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        addMessage(err.detail || 'Lo siento, hubo un error. Intenta de nuevo.', 'bot');
        return;
      }

      const data = await res.json();
      addMessage(data.response, 'bot');
    } catch (e) {
      hideTyping();
      addMessage('No se pudo conectar. Verifica tu conexion.', 'bot');
    } finally {
      isLoading = false;
      document.getElementById('sofia-send').disabled = false;
      document.getElementById('sofia-input').focus();
    }
  }

  // ---------------------------------------------------------------
  // Init
  // ---------------------------------------------------------------
  async function init() {
    try {
      const res = await fetch(`${API_BASE}/webchat/${ORG_ID}/config`);
      if (res.status === 403) {
        // Backend rejected the domain. Do NOT render — refusing silently
        // is safer than falling back to an open default config.
        console.warn('[SofIA Widget] Domain not authorized for this widget');
        return;
      }
      if (!res.ok) throw new Error('Config fetch failed');
      config = await res.json();
      if (!config.enabled) return;
    } catch (e) {
      console.warn('[SofIA Widget] Could not load config, using defaults');
      config = { bot_name: 'SofIA', welcome_message: 'Hola! ¿En que te puedo ayudar?', primary_color: '#7c3aed', enabled: true };
    }

    // Client-side defensive check mirrors the server allowlist.
    // '*.domain.com' patterns allow any subdomain, 'www.' is normalized.
    const domains = Array.isArray(config.allowed_domains) ? config.allowed_domains.filter(Boolean) : [];
    if (domains.length > 0) {
      const host = window.location.hostname.toLowerCase().replace(/^www\./, '');
      const allowed = domains.some(d => {
        let norm = String(d).trim().toLowerCase()
          .replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/\/$/, '');
        if (norm.startsWith('*.')) {
          const base = norm.slice(2);
          return host === base || host.endsWith('.' + base);
        }
        norm = norm.replace(/^www\./, '');
        return host === norm;
      });
      if (!allowed) {
        console.warn('[SofIA Widget] Current domain', host, 'not in allowlist:', domains);
        return;
      }
    }

    render();
    startPolling();

    // Auto-open after delay (0 = disabled)
    const delay = Number(config.auto_open_delay_ms) || 0;
    if (delay > 0) {
      setTimeout(() => { if (!isOpen) toggleChat(); }, Math.min(delay, 60000));
    }
  }

  // ---------------------------------------------------------------
  // Polling for doctor messages (takeover mode)
  // ---------------------------------------------------------------
  let pollInterval = null;
  let lastPollTimestamp = new Date().toISOString();

  function startPolling() {
    if (pollInterval) return;
    pollInterval = setInterval(async () => {
      if (!isOpen) return;
      try {
        const res = await fetch(`${API_BASE}/webchat/${ORG_ID}/poll?session_id=${sessionId}&after=${encodeURIComponent(lastPollTimestamp)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.messages && data.messages.length > 0) {
          for (const msg of data.messages) {
            addMessage(msg.content, 'bot');
            if (msg.timestamp) lastPollTimestamp = msg.timestamp;
          }
        }
      } catch (e) { /* silent */ }
    }, 5000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
