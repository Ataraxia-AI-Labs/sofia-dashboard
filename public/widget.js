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
  const ORG_ID = SCRIPT?.getAttribute('data-org');
  const API_BASE = SCRIPT?.getAttribute('data-api') || 'https://ataraxia-api-core.onrender.com';

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
    #sofia-widget-root * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    #sofia-bubble { position: fixed; bottom: 20px; right: 20px; width: 60px; height: 60px; border-radius: 50%; background: var(--sofia-color, #7c3aed); color: #fff; border: none; cursor: pointer; box-shadow: 0 4px 20px rgba(0,0,0,.25); display: flex; align-items: center; justify-content: center; z-index: 99999; transition: transform .2s; }
    #sofia-bubble:hover { transform: scale(1.1); }
    #sofia-bubble svg { width: 28px; height: 28px; }
    #sofia-window { position: fixed; bottom: 90px; right: 20px; width: 380px; max-width: calc(100vw - 40px); height: 520px; max-height: calc(100vh - 120px); background: #fff; border-radius: 16px; box-shadow: 0 8px 40px rgba(0,0,0,.2); display: none; flex-direction: column; z-index: 99999; overflow: hidden; }
    #sofia-window.open { display: flex; }
    #sofia-header { background: var(--sofia-color, #7c3aed); color: #fff; padding: 16px; display: flex; align-items: center; gap: 12px; }
    #sofia-header-avatar { width: 36px; height: 36px; border-radius: 50%; background: rgba(255,255,255,.2); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; }
    #sofia-header-info { flex: 1; }
    #sofia-header-name { font-weight: 600; font-size: 15px; }
    #sofia-header-status { font-size: 11px; opacity: .8; }
    #sofia-close { background: none; border: none; color: #fff; cursor: pointer; font-size: 20px; padding: 4px; }
    #sofia-messages { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 8px; background: #f9fafb; }
    .sofia-msg { max-width: 80%; padding: 10px 14px; border-radius: 16px; font-size: 14px; line-height: 1.5; word-wrap: break-word; white-space: pre-wrap; }
    .sofia-msg.bot { background: #fff; color: #1f2937; border: 1px solid #e5e7eb; align-self: flex-start; border-bottom-left-radius: 4px; }
    .sofia-msg.user { background: var(--sofia-color, #7c3aed); color: #fff; align-self: flex-end; border-bottom-right-radius: 4px; }
    .sofia-typing { align-self: flex-start; background: #fff; border: 1px solid #e5e7eb; border-radius: 16px; padding: 10px 14px; display: flex; gap: 4px; }
    .sofia-typing span { width: 6px; height: 6px; background: #9ca3af; border-radius: 50%; animation: sofia-bounce .6s infinite alternate; }
    .sofia-typing span:nth-child(2) { animation-delay: .2s; }
    .sofia-typing span:nth-child(3) { animation-delay: .4s; }
    @keyframes sofia-bounce { to { transform: translateY(-4px); opacity: .5; } }
    #sofia-input-area { padding: 12px; border-top: 1px solid #e5e7eb; display: flex; gap: 8px; background: #fff; }
    #sofia-input { flex: 1; border: 1px solid #d1d5db; border-radius: 24px; padding: 10px 16px; font-size: 14px; outline: none; resize: none; max-height: 80px; }
    #sofia-input:focus { border-color: var(--sofia-color, #7c3aed); }
    #sofia-send { width: 40px; height: 40px; border-radius: 50%; background: var(--sofia-color, #7c3aed); color: #fff; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; }
    #sofia-send:disabled { opacity: .5; cursor: not-allowed; }
    #sofia-powered { text-align: center; padding: 6px; font-size: 10px; color: #9ca3af; background: #fff; }
    #sofia-powered a { color: #7c3aed; text-decoration: none; }
  `;

  // ---------------------------------------------------------------
  // HTML
  // ---------------------------------------------------------------
  function render() {
    const root = document.createElement('div');
    root.id = 'sofia-widget-root';
    root.innerHTML = `
      <style>${STYLES}</style>
      <button id="sofia-bubble" aria-label="Chat con ${config?.bot_name || 'SofIA'}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
      </button>
      <div id="sofia-window">
        <div id="sofia-header">
          <div id="sofia-header-avatar">S</div>
          <div id="sofia-header-info">
            <div id="sofia-header-name">${config?.bot_name || 'SofIA'}</div>
            <div id="sofia-header-status">En linea</div>
          </div>
          <button id="sofia-close">&times;</button>
        </div>
        <div id="sofia-messages"></div>
        <div id="sofia-input-area">
          <input id="sofia-input" placeholder="Escribe un mensaje..." autocomplete="off" />
          <button id="sofia-send" aria-label="Enviar">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
          </button>
        </div>
        <div id="sofia-powered">Powered by <a href="https://ataraxiaialabs.ai" target="_blank">SofIA</a></div>
      </div>
    `;
    document.body.appendChild(root);

    if (config?.primary_color) {
      root.style.setProperty('--sofia-color', config.primary_color);
    }

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

    if (isOpen && messages.length === 0 && config?.greeting) {
      addMessage(config.greeting, 'bot');
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
      config = { bot_name: 'SofIA', greeting: 'Hola! ¿En que te puedo ayudar?', primary_color: '#7c3aed', enabled: true };
    }
    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
