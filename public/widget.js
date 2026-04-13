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
    @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap');
    #sofia-widget-root { --sofia-color: #7c3aed; --sofia-pos-h: right; }
    #sofia-widget-root * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, Consolas, monospace; }
    #sofia-bubble { position: fixed; bottom: 24px; width: 56px; height: 56px; border-radius: 50%; background: var(--sofia-color); color: #fff; border: none; cursor: pointer; box-shadow: 0 6px 24px rgba(0,0,0,.18); display: flex; align-items: center; justify-content: center; z-index: 99999; transition: transform .2s ease, box-shadow .2s ease; }
    #sofia-widget-root[data-pos="right"] #sofia-bubble { right: 24px; }
    #sofia-widget-root[data-pos="left"] #sofia-bubble { left: 24px; }
    #sofia-bubble:hover { transform: scale(1.08); box-shadow: 0 8px 32px rgba(0,0,0,.24); }
    #sofia-bubble svg { width: 24px; height: 24px; }
    #sofia-window { position: fixed; bottom: 96px; width: 360px; max-width: calc(100vw - 32px); height: 540px; max-height: calc(100vh - 128px); background: #fff; border-radius: 12px; box-shadow: 0 12px 48px rgba(0,0,0,.16); display: none; flex-direction: column; z-index: 99999; overflow: hidden; border: 1px solid rgba(0,0,0,.06); }
    #sofia-widget-root[data-pos="right"] #sofia-window { right: 24px; }
    #sofia-widget-root[data-pos="left"] #sofia-window { left: 24px; }
    #sofia-window.open { display: flex; }
    #sofia-header { background: var(--sofia-color); color: #fff; padding: 14px 16px; display: flex; align-items: center; gap: 10px; }
    #sofia-header-avatar { width: 32px; height: 32px; border-radius: 50%; background: rgba(255,255,255,.18); display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 11px; letter-spacing: .5px; }
    #sofia-header-info { flex: 1; min-width: 0; }
    #sofia-header-name { font-weight: 600; font-size: 12px; letter-spacing: .2px; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    #sofia-header-status { font-size: 9px; opacity: .75; letter-spacing: .8px; text-transform: uppercase; margin-top: 2px; display: flex; align-items: center; gap: 5px; }
    #sofia-header-status::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: #10b981; box-shadow: 0 0 6px #10b981; }
    #sofia-close { background: none; border: none; color: #fff; cursor: pointer; font-size: 18px; padding: 4px 8px; line-height: 1; opacity: .8; transition: opacity .2s; }
    #sofia-close:hover { opacity: 1; }
    #sofia-messages { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 6px; background: #fafafa; }
    .sofia-msg { max-width: 78%; padding: 8px 12px; border-radius: 10px; font-size: 12px; line-height: 1.55; word-wrap: break-word; white-space: pre-wrap; letter-spacing: .1px; }
    .sofia-msg.bot { background: #fff; color: #111827; border: 1px solid #e5e7eb; align-self: flex-start; border-bottom-left-radius: 3px; }
    .sofia-msg.user { background: var(--sofia-color); color: #fff; align-self: flex-end; border-bottom-right-radius: 3px; }
    .sofia-typing { align-self: flex-start; background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; border-bottom-left-radius: 3px; padding: 10px 12px; display: flex; gap: 4px; }
    .sofia-typing span { width: 5px; height: 5px; background: #9ca3af; border-radius: 50%; animation: sofia-bounce .6s infinite alternate; }
    .sofia-typing span:nth-child(2) { animation-delay: .2s; }
    .sofia-typing span:nth-child(3) { animation-delay: .4s; }
    @keyframes sofia-bounce { to { transform: translateY(-4px); opacity: .5; } }
    #sofia-input-area { padding: 10px 12px; border-top: 1px solid #e5e7eb; display: flex; gap: 8px; background: #fff; align-items: center; }
    #sofia-input { flex: 1; border: 1px solid #d1d5db; border-radius: 8px; padding: 8px 12px; font-size: 12px; outline: none; resize: none; max-height: 72px; line-height: 1.4; color: #111827; background: #fafafa; transition: border-color .15s, background .15s; }
    #sofia-input:focus { border-color: var(--sofia-color); background: #fff; }
    #sofia-send { width: 34px; height: 34px; border-radius: 8px; background: var(--sofia-color); color: #fff; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: opacity .15s; }
    #sofia-send:disabled { opacity: .4; cursor: not-allowed; }
    #sofia-powered { text-align: center; padding: 6px; font-size: 8px; color: #9ca3af; background: #fff; letter-spacing: 1px; text-transform: uppercase; border-top: 1px solid #f3f4f6; }
    #sofia-powered a { color: var(--sofia-color); text-decoration: none; font-weight: 600; }
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
      if (!res.ok) throw new Error('Config fetch failed');
      config = await res.json();
      if (!config.enabled) return;
    } catch (e) {
      console.warn('[SofIA Widget] Could not load config, using defaults');
      config = { bot_name: 'SofIA', welcome_message: 'Hola! ¿En que te puedo ayudar?', primary_color: '#7c3aed', enabled: true };
    }

    // Domain allowlist — if configured, widget only renders on approved domains
    const domains = Array.isArray(config.allowed_domains) ? config.allowed_domains.filter(Boolean) : [];
    if (domains.length > 0) {
      const host = window.location.hostname.toLowerCase();
      const allowed = domains.some(d => {
        const norm = String(d).toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
        return host === norm || host.endsWith('.' + norm);
      });
      if (!allowed) {
        console.warn('[SofIA Widget] Current domain not in allowlist');
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
