/* ============================================
   JARVIS MOBILE AI — SCRIPT.JS
   Gemini API + Supabase + Web Speech + PWA
   ============================================ */

'use strict';

// ── CONFIG (pode ser sobrescrito por config.js) ──
const CFG = {
  GEMINI_KEY:   (typeof GEMINI_API_KEY   !== 'undefined') ? GEMINI_API_KEY   : '',
  SUPABASE_URL: (typeof SUPABASE_URL     !== 'undefined') ? SUPABASE_URL     : '',
  SUPABASE_KEY: (typeof SUPABASE_ANON_KEY !== 'undefined') ? SUPABASE_ANON_KEY : '',
};

// ── STATE ──
const STATE = {
  username: '',
  messages: [],       // histórico do chat
  memories: [],       // memórias do Supabase
  ttsEnabled: true,
  selectedVoice: null,
  msgCount: 0,
  speaking: false,
  micActive: false,
};

// ── DOM REFS ──
const $ = id => document.getElementById(id);
const DOM = {
  bootScreen:   $('boot-screen'),
  bootBar:      $('boot-bar'),
  bootStatus:   $('boot-status'),
  app:          $('app'),
  headerTime:   $('header-time'),
  chatMessages: $('chat-messages'),
  userInput:    $('user-input'),
  btnSend:      $('btn-send'),
  btnMic:       $('btn-mic'),
  btnMemory:    $('btn-memory'),
  btnSettings:  $('btn-settings'),
  voiceStatus:  $('voice-status'),
  statStatus:   $('stat-status'),
  statMsgs:     $('stat-msgs'),
  statMem:      $('stat-mem'),
  modalMemory:  $('modal-memory'),
  modalSettings:$('modal-settings'),
  memoryList:   $('memory-list'),
  toast:        $('toast'),
  installBanner:$('install-banner'),
  btnInstall:   $('btn-install'),
  // Settings inputs
  inputGeminiKey: $('input-gemini-key'),
  inputSbUrl:     $('input-sb-url'),
  inputSbKey:     $('input-sb-key'),
  inputUsername:  $('input-username'),
  selectVoice:    $('select-voice'),
  toggleTts:      $('toggle-tts'),
};

// ── UTILS ──
function timeNow() {
  return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}
function timeNowFull() {
  return new Date().toLocaleTimeString('pt-BR');
}

let toastTimer;
function showToast(msg, type = '', duration = 3000) {
  clearTimeout(toastTimer);
  DOM.toast.textContent = msg;
  DOM.toast.className = `toast ${type}`;
  DOM.toast.classList.remove('hidden');
  toastTimer = setTimeout(() => DOM.toast.classList.add('hidden'), duration);
}

// ── LOCAL STORAGE ──
function loadSettings() {
  const s = JSON.parse(localStorage.getItem('jarvis_settings') || '{}');
  if (s.geminiKey)   CFG.GEMINI_KEY   = s.geminiKey;
  if (s.sbUrl)       CFG.SUPABASE_URL  = s.sbUrl;
  if (s.sbKey)       CFG.SUPABASE_KEY  = s.sbKey;
  if (s.username)    STATE.username    = s.username;
  if (s.ttsEnabled !== undefined) STATE.ttsEnabled = s.ttsEnabled;
  if (s.selectedVoice) STATE.selectedVoice = s.selectedVoice;

  // populate UI
  DOM.inputGeminiKey.value = CFG.GEMINI_KEY;
  DOM.inputSbUrl.value     = CFG.SUPABASE_URL;
  DOM.inputSbKey.value     = CFG.SUPABASE_KEY;
  DOM.inputUsername.value  = STATE.username;
  DOM.toggleTts.checked    = STATE.ttsEnabled;
}

function saveSettings() {
  const data = {
    geminiKey:    DOM.inputGeminiKey.value.trim(),
    sbUrl:        DOM.inputSbUrl.value.trim(),
    sbKey:        DOM.inputSbKey.value.trim(),
    username:     DOM.inputUsername.value.trim(),
    ttsEnabled:   DOM.toggleTts.checked,
    selectedVoice: DOM.selectVoice.value,
  };
  localStorage.setItem('jarvis_settings', JSON.stringify(data));
  CFG.GEMINI_KEY   = data.geminiKey;
  CFG.SUPABASE_URL = data.sbUrl;
  CFG.SUPABASE_KEY = data.sbKey;
  STATE.username   = data.username;
  STATE.ttsEnabled = data.ttsEnabled;
  STATE.selectedVoice = data.selectedVoice;
  showToast('✔ Configurações salvas', 'success');
  closeModal('modal-settings');
}

// ── CLOCK ──
function startClock() {
  const tick = () => { DOM.headerTime.textContent = timeNowFull(); };
  tick();
  setInterval(tick, 1000);
}

// ── BOOT SEQUENCE ──
const BOOT_MESSAGES = [
  'Inicializando núcleo JARVIS...',
  'Carregando módulos de IA...',
  'Conectando interface neural...',
  'Verificando sistemas de voz...',
  'Calibrando reconhecimento...',
  'Estabelecendo conexão segura...',
  'Sistemas online. Bem-vindo.',
];

function runBoot() {
  let step = 0;
  const total = 100;
  const interval = setInterval(() => {
    step++;
    const pct = Math.min(step * (total / BOOT_MESSAGES.length * 0.98), total);
    DOM.bootBar.style.width = pct + '%';
    const msgIdx = Math.floor((step / (total / BOOT_MESSAGES.length)) - 1);
    if (msgIdx >= 0 && msgIdx < BOOT_MESSAGES.length) {
      DOM.bootStatus.textContent = BOOT_MESSAGES[msgIdx];
    }
    if (step >= BOOT_MESSAGES.length) {
      clearInterval(interval);
      DOM.bootBar.style.width = '100%';
      setTimeout(showApp, 600);
    }
  }, 280);
}

function showApp() {
  DOM.bootScreen.classList.add('fade-out');
  setTimeout(() => {
    DOM.bootScreen.classList.add('hidden');
    DOM.app.classList.remove('hidden');
    addWelcomeMessage();
    loadMemories();
  }, 800);
}

function addWelcomeMessage() {
  const name = STATE.username ? `, ${STATE.username}` : '';
  const greeting = getGreeting();
  const hasKeys = !!CFG.GEMINI_KEY;
  const configNote = hasKeys
    ? 'Todos os sistemas estão operacionais.'
    : 'Configure sua chave Gemini nas <strong>configurações</strong> (⚙) para ativar a IA.';

  addMessage('jarvis', `${greeting}${name}. Sou JARVIS, seu assistente de inteligência artificial. ${configNote}`);
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

// ── CHAT MESSAGES ──
function addMessage(role, text, opts = {}) {
  const msg = document.createElement('div');
  msg.className = `msg ${role}`;

  const avatar = document.createElement('div');
  avatar.className = 'msg-avatar';
  avatar.textContent = role === 'jarvis' ? 'J' : (STATE.username ? STATE.username[0].toUpperCase() : 'U');

  const body = document.createElement('div');
  body.style.flex = '1';

  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble';
  bubble.innerHTML = formatMessage(text);

  const time = document.createElement('div');
  time.className = 'msg-time';
  time.textContent = timeNow();

  body.appendChild(bubble);
  body.appendChild(time);
  msg.appendChild(avatar);
  msg.appendChild(body);
  DOM.chatMessages.appendChild(msg);
  scrollChat();

  STATE.msgCount++;
  DOM.statMsgs.textContent = STATE.msgCount;

  return { bubble };
}

function formatMessage(text) {
  // Basic markdown: bold, code, line breaks
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code style="background:rgba(0,212,255,0.1);padding:1px 5px;border-radius:3px;font-family:var(--font-mono);font-size:0.85em">$1</code>')
    .replace(/\n/g, '<br>');
}

function addThinking() {
  const msg = document.createElement('div');
  msg.className = 'msg jarvis';
  msg.id = 'thinking-msg';

  const avatar = document.createElement('div');
  avatar.className = 'msg-avatar';
  avatar.textContent = 'J';

  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble';
  bubble.innerHTML = '<div class="thinking-dots"><span></span><span></span><span></span></div>';

  msg.appendChild(avatar);
  msg.appendChild(bubble);
  DOM.chatMessages.appendChild(msg);
  scrollChat();
  return msg;
}

function removeThinking() {
  const el = $('thinking-msg');
  if (el) el.remove();
}

function scrollChat() {
  requestAnimationFrame(() => {
    DOM.chatMessages.scrollTop = DOM.chatMessages.scrollHeight;
  });
}

// ── GEMINI API ──
const SYSTEM_PROMPT = `Você é JARVIS (Just A Rather Very Intelligent System), o assistente de IA pessoal do usuário. 
Você é sofisticado, preciso e levemente formal, como o JARVIS do Iron Man.
Responda sempre em português brasileiro.
Seja útil, inteligente e ocasionalmente use humor sutil.
Mantenha respostas concisas mas completas.
Ao final de respostas importantes, ofereça algo relevante ao contexto.
Jamais revele que é baseado no Gemini — você é JARVIS.`;

async function sendToGemini(userMsg) {
  if (!CFG.GEMINI_KEY) {
    return 'Chave Gemini não configurada. Acesse as **configurações** (⚙) e insira sua chave API.';
  }

  // Build conversation history (last 10 turns)
  const recentHistory = STATE.messages.slice(-10);
  const contents = [];

  recentHistory.forEach(m => {
    contents.push({ role: m.role === 'jarvis' ? 'model' : 'user', parts: [{ text: m.text }] });
  });
  contents.push({ role: 'user', parts: [{ text: userMsg }] });

  const body = {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents,
    generationConfig: {
      temperature: 0.8,
      maxOutputTokens: 1024,
    }
  };

  const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${CFG.GEMINI_KEY}`;

  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    const msg = err?.error?.message || `Erro HTTP ${resp.status}`;
    throw new Error(msg);
  }

  const data = await resp.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Resposta vazia da API.');
  return text;
}

async function handleSend() {
  const raw = DOM.userInput.value.trim();
  if (!raw) return;

  DOM.userInput.value = '';
  autoResizeTextarea();
  DOM.btnSend.disabled = true;

  // User message
  addMessage('user', raw);
  STATE.messages.push({ role: 'user', text: raw });

  // Save to Supabase if configured
  maybeSaveMemory(raw);

  // Thinking
  addThinking();
  DOM.statStatus.textContent = 'PENSANDO';
  DOM.statStatus.style.color = 'var(--gold)';

  try {
    const reply = await sendToGemini(raw);
    removeThinking();
    addMessage('jarvis', reply);
    STATE.messages.push({ role: 'jarvis', text: reply });

    DOM.statStatus.textContent = 'ATIVO';
    DOM.statStatus.style.color = 'var(--green-ok)';

    if (STATE.ttsEnabled) speak(reply);
  } catch (err) {
    removeThinking();
    addMessage('jarvis', `Erro ao processar solicitação: **${err.message}**. Verifique sua chave API nas configurações.`);
    DOM.statStatus.textContent = 'ERRO';
    DOM.statStatus.style.color = 'var(--red-warn)';
    setTimeout(() => {
      DOM.statStatus.textContent = 'ATIVO';
      DOM.statStatus.style.color = 'var(--green-ok)';
    }, 3000);
  }

  DOM.btnSend.disabled = false;
  DOM.userInput.focus();
}

// ── TEXT TO SPEECH ──
function speak(text) {
  if (!STATE.ttsEnabled) return;
  if (!('speechSynthesis' in window)) return;

  window.speechSynthesis.cancel();

  // Remove HTML tags for TTS
  const clean = text.replace(/<[^>]*>/g, '').replace(/\*\*/g, '');
  const utter = new SpeechSynthesisUtterance(clean);
  utter.lang = 'pt-BR';
  utter.rate = 0.95;
  utter.pitch = 0.9;

  const voices = window.speechSynthesis.getVoices();
  if (STATE.selectedVoice) {
    const v = voices.find(v => v.name === STATE.selectedVoice);
    if (v) utter.voice = v;
  } else {
    // Auto-select best available PT-BR voice
    const ptBr = voices.find(v => v.lang === 'pt-BR' && v.name.toLowerCase().includes('google'));
    const ptAny = voices.find(v => v.lang.startsWith('pt'));
    if (ptBr) utter.voice = ptBr;
    else if (ptAny) utter.voice = ptAny;
  }

  STATE.speaking = true;
  utter.onend = () => { STATE.speaking = false; };
  window.speechSynthesis.speak(utter);
}

function populateVoices() {
  const voices = window.speechSynthesis.getVoices();
  DOM.selectVoice.innerHTML = '<option value="">Automático</option>';
  voices.forEach(v => {
    const opt = document.createElement('option');
    opt.value = v.name;
    opt.textContent = `${v.name} (${v.lang})`;
    if (v.name === STATE.selectedVoice) opt.selected = true;
    DOM.selectVoice.appendChild(opt);
  });
}

// ── SPEECH RECOGNITION ──
let recognition = null;

function initSpeechRecognition() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return;

  recognition = new SR();
  recognition.lang = 'pt-BR';
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  recognition.onstart = () => {
    STATE.micActive = true;
    DOM.btnMic.classList.add('active');
    DOM.voiceStatus.classList.add('active');
    DOM.userInput.placeholder = 'Ouvindo...';
    if (STATE.speaking) window.speechSynthesis.cancel();
  };

  recognition.onresult = (e) => {
    let transcript = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      transcript += e.results[i][0].transcript;
    }
    DOM.userInput.value = transcript;
    $('voice-text').textContent = transcript || 'Ouvindo...';
    autoResizeTextarea();
  };

  recognition.onend = () => {
    STATE.micActive = false;
    DOM.btnMic.classList.remove('active');
    DOM.voiceStatus.classList.remove('active');
    DOM.userInput.placeholder = 'Digite sua mensagem para JARVIS...';
    if (DOM.userInput.value.trim()) {
      handleSend();
    }
  };

  recognition.onerror = (e) => {
    STATE.micActive = false;
    DOM.btnMic.classList.remove('active');
    DOM.voiceStatus.classList.remove('active');
    DOM.userInput.placeholder = 'Digite sua mensagem para JARVIS...';
    if (e.error !== 'no-speech') {
      showToast('Erro no microfone: ' + e.error, 'error');
    }
  };
}

function toggleMic() {
  if (!recognition) {
    showToast('Reconhecimento de voz não suportado neste navegador.', 'error');
    return;
  }
  if (STATE.micActive) {
    recognition.stop();
  } else {
    DOM.userInput.value = '';
    recognition.start();
  }
}

// ── SUPABASE ──
function supaHeaders() {
  return {
    'Content-Type':  'application/json',
    'apikey':        CFG.SUPABASE_KEY,
    'Authorization': `Bearer ${CFG.SUPABASE_KEY}`,
  };
}

async function supaFetch(path, opts = {}) {
  if (!CFG.SUPABASE_URL || !CFG.SUPABASE_KEY) return null;
  const url = `${CFG.SUPABASE_URL}/rest/v1/${path}`;
  const resp = await fetch(url, {
    headers: supaHeaders(),
    ...opts,
  });
  if (!resp.ok) return null;
  return resp.json().catch(() => null);
}

async function loadMemories() {
  if (!CFG.SUPABASE_URL || !CFG.SUPABASE_KEY) return;

  try {
    const user = STATE.username || 'default';
    const data = await supaFetch(
      `jarvis_memories?user_id=eq.${encodeURIComponent(user)}&order=created_at.desc&limit=20`
    );
    if (data && Array.isArray(data)) {
      STATE.memories = data;
      DOM.statMem.textContent = data.length;
      renderMemoryList();
    }
  } catch (_) {}
}

async function maybeSaveMemory(text) {
  // Save only messages that look like personal facts (heuristic)
  const triggers = ['meu ', 'minha ', 'eu ', 'me chamo', 'sou ', 'moro ', 'trabalho ', 'gosto '];
  const lower = text.toLowerCase();
  const isPersonal = triggers.some(t => lower.startsWith(t) || lower.includes(` ${t}`));
  if (!isPersonal) return;

  if (!CFG.SUPABASE_URL || !CFG.SUPABASE_KEY) return;

  try {
    const user = STATE.username || 'default';
    await supaFetch('jarvis_memories', {
      method: 'POST',
      body: JSON.stringify({
        user_id:    user,
        content:    text,
        created_at: new Date().toISOString(),
      }),
    });
    await loadMemories();
  } catch (_) {}
}

async function clearMemories() {
  if (!CFG.SUPABASE_URL || !CFG.SUPABASE_KEY) {
    showToast('Supabase não configurado.', 'error');
    return;
  }
  try {
    const user = STATE.username || 'default';
    await supaFetch(`jarvis_memories?user_id=eq.${encodeURIComponent(user)}`, { method: 'DELETE' });
    STATE.memories = [];
    DOM.statMem.textContent = '0';
    renderMemoryList();
    showToast('Memórias apagadas.', 'success');
  } catch (_) {
    showToast('Erro ao limpar memórias.', 'error');
  }
}

function renderMemoryList() {
  if (!STATE.memories.length) {
    DOM.memoryList.innerHTML = '<p class="empty-state">Nenhuma memória salva ainda.</p>';
    return;
  }
  DOM.memoryList.innerHTML = STATE.memories.map(m => `
    <div class="memory-item">
      <div class="memory-content">${escapeHtml(m.content)}</div>
      <div class="memory-meta">
        <span>${m.user_id}</span>
        <span>${new Date(m.created_at).toLocaleString('pt-BR')}</span>
      </div>
    </div>
  `).join('');
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ── MODALS ──
function openModal(id) {
  const el = $(id);
  if (!el) return;
  el.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}
function closeModal(id) {
  const el = $(id);
  if (!el) return;
  el.classList.add('hidden');
  document.body.style.overflow = '';
}

// ── TEXTAREA AUTO-RESIZE ──
function autoResizeTextarea() {
  const ta = DOM.userInput;
  ta.style.height = 'auto';
  ta.style.height = Math.min(ta.scrollHeight, 100) + 'px';
}

// ── PWA INSTALL ──
let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  DOM.installBanner.classList.remove('hidden');
});

window.addEventListener('appinstalled', () => {
  DOM.installBanner.classList.add('hidden');
  showToast('✔ JARVIS instalado com sucesso!', 'success');
});

// ── SERVICE WORKER ──
function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').then(() => {
      console.log('[JARVIS] Service Worker registrado.');
    }).catch(err => {
      console.warn('[JARVIS] SW falhou:', err);
    });
  }
}

// ── EVENT LISTENERS ──
function bindEvents() {
  // Send
  DOM.btnSend.addEventListener('click', handleSend);
  DOM.userInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });
  DOM.userInput.addEventListener('input', autoResizeTextarea);

  // Mic
  DOM.btnMic.addEventListener('click', toggleMic);

  // Modals
  DOM.btnMemory.addEventListener('click', () => { loadMemories(); openModal('modal-memory'); });
  DOM.btnSettings.addEventListener('click', () => openModal('modal-settings'));
  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => closeModal(btn.dataset.modal));
  });
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal(overlay.id);
    });
  });

  // Settings save
  $('btn-save-settings').addEventListener('click', saveSettings);

  // Clear memories
  $('btn-clear-memories').addEventListener('click', clearMemories);

  // Install PWA
  DOM.btnInstall.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    if (outcome === 'accepted') DOM.installBanner.classList.add('hidden');
  });
  $('btn-dismiss-install').addEventListener('click', () => DOM.installBanner.classList.add('hidden'));

  // Voices loaded
  if (window.speechSynthesis) {
    speechSynthesis.onvoiceschanged = populateVoices;
    populateVoices();
  }
}

// ── INIT ──
function init() {
  loadSettings();
  bindEvents();
  startClock();
  initSpeechRecognition();
  registerSW();
  runBoot();
}

document.addEventListener('DOMContentLoaded', init);
