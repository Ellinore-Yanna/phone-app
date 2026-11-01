let phoneUnlocked = false;

function dismissUnlock() {
  document.getElementById('unlock-popup').classList.remove('open');
  initAudioContext(); // must happen during a user tap to unlock the browser audio policy
  goHome();
  setTimeout(triggerIncomingCall, 10000);
}

/* ══════════════════════════════
   INCOMING CALL + RINGTONE
══════════════════════════════ */
let ringCtx = null, ringTimer = null;
let callTimerInterval = null, callStartTime = null;
let activeCallType = 'incoming', activeCallName = 'Unknown', activeCallNumber = 'Unknown';

function initAudioContext() {
  if (!ringCtx) ringCtx = new (window.AudioContext || window.webkitAudioContext)();
}

const callAudio   = new Audio('4700-rick-roll.mp3');
const puzzleAudio = new Audio('5837-near-puzzle-quote.mp3');
const gregAudio   = new Audio('greg-call.mp3');
const anneAudio   = new Audio('anne-call.mp3');

callAudio.addEventListener('ended',   () => finishCall());
puzzleAudio.addEventListener('ended', () => finishCall());
gregAudio.addEventListener('ended',   () => finishCall());
anneAudio.addEventListener('ended',   () => finishCall());

function playRingBurst(startTime, duration) {
  if (!ringCtx) return;
  [900, 1400].forEach(freq => {
    const osc = ringCtx.createOscillator();
    const gain = ringCtx.createGain();
    const lfo = ringCtx.createOscillator();
    const lfoGain = ringCtx.createGain();
    osc.type = 'square'; osc.frequency.value = freq;
    lfo.type = 'sine';   lfo.frequency.value = 25;
    lfoGain.gain.value = 0.12;
    lfo.connect(lfoGain); lfoGain.connect(gain.gain);
    gain.gain.setValueAtTime(0.18, startTime);
    gain.gain.linearRampToValueAtTime(0, startTime + duration);
    osc.connect(gain); gain.connect(ringCtx.destination);
    osc.start(startTime); osc.stop(startTime + duration);
    lfo.start(startTime); lfo.stop(startTime + duration);
  });
}

function singleRing() {
  if (!ringCtx) return;
  const now = ringCtx.currentTime;
  playRingBurst(now, 0.45);
  playRingBurst(now + 0.7, 0.45);
}

function startRing() {
  if (ringCtx && ringCtx.state === 'suspended') ringCtx.resume();
  singleRing();
  ringTimer = setInterval(singleRing, 3500);
}

function stopRing() {
  clearInterval(ringTimer); ringTimer = null;
}

function triggerIncomingCall() {
  document.getElementById('incoming-call').classList.add('open');
  startRing();
}

function declineCall() {
  document.getElementById('incoming-call').classList.remove('open');
  stopRing();
  addCallRecord('incoming', 'Unknown', 'Unknown', 0);
}

function startCallTimer() {
  callStartTime = Date.now();
  callTimerInterval = setInterval(() => {
    const s = Math.floor((Date.now() - callStartTime) / 1000);
    document.getElementById('call-timer').textContent =
      Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  }, 1000);
}

function stopCallTimer() {
  clearInterval(callTimerInterval); callTimerInterval = null;
}

function finishCall() {
  const duration = callStartTime ? Math.floor((Date.now() - callStartTime) / 1000) : 0;
  stopCallTimer();
  addCallRecord(activeCallType, activeCallName, activeCallNumber, duration);
  callStartTime = null; // so a call ended before connecting does not reuse the last call's start time
  document.getElementById('call-status-label').textContent = 'Call Ended';
  document.getElementById('call-timer').textContent = '';
  setTimeout(() => {
    document.getElementById('active-call').classList.remove('open');
    if (phoneUnlocked) openApp('phone', 'Phone');
  }, 1500);
}

function answerCall() {
  activeCallType = 'incoming'; activeCallName = 'Unknown'; activeCallNumber = 'Unknown';
  document.getElementById('incoming-call').classList.remove('open');
  stopRing();
  document.getElementById('active-call-name').textContent = 'Unknown';
  document.getElementById('call-status-label').textContent = 'Connected';
  document.getElementById('call-timer').textContent = '0:00';
  document.getElementById('active-call').classList.add('open');
  startCallTimer();
  callAudio.currentTime = 0;
  callAudio.play().catch(() => {});
}

function beginOutgoingCall(name, number, audio) {
  activeCallType = 'outgoing'; activeCallName = name; activeCallNumber = number;
  document.getElementById('active-call-name').textContent = name;
  document.getElementById('call-status-label').textContent = 'Calling…';
  document.getElementById('call-timer').textContent = '';
  document.getElementById('active-call').classList.add('open');
  setTimeout(() => {
    if (!document.getElementById('active-call').classList.contains('open')) return;
    document.getElementById('call-status-label').textContent = 'Connected';
    startCallTimer();
    audio.currentTime = 0;
    audio.play().catch(() => {});
  }, 2500);
}

function endCall() {
  callAudio.pause();   callAudio.currentTime = 0;
  puzzleAudio.pause(); puzzleAudio.currentTime = 0;
  gregAudio.pause();   gregAudio.currentTime = 0;
  anneAudio.pause();   anneAudio.currentTime = 0;
  finishCall();
}

/* ══════════════════════════════
   HOME SCREEN + NAVIGATION
══════════════════════════════ */
function openApp(id, title) {
  document.getElementById('home-screen').classList.remove('visible');
  document.getElementById('app').style.display = 'flex';

  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  const matchingTab = [...document.querySelectorAll('.tab')].find(t =>
    t.getAttribute('onclick') && t.getAttribute('onclick').includes("'" + id + "'")
  );
  if (matchingTab) matchingTab.classList.add('active');
  document.getElementById('page-title').textContent = title;

  if (id === 'photos') initPhotos();
  if (id === 'messages') closeThread();
  if (id === 'clock') startClock();
}

function goHome() {
  document.getElementById('app').style.display = 'none';
  document.getElementById('home-screen').classList.add('visible');
}

function showTab(id, title, btn) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  btn.classList.add('active');
  document.getElementById('page-title').textContent = title;

  if (id === 'photos') initPhotos();
  if (id === 'messages') closeThread();
  if (id === 'clock') startClock();
}

// Home screen clock
function tickHomeClock() {
  const now = new Date();
  const pad = n => String(n).padStart(2,'0');
  const h = now.getHours(), m = now.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  document.getElementById('home-big-time').textContent = h12 + ':' + pad(m) + ' ' + ampm;
  document.getElementById('home-status-time').textContent = h12 + ':' + pad(m);
  document.getElementById('home-big-date').textContent =
    now.toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' });
}
tickHomeClock();
setInterval(tickHomeClock, 1000);

// Hide app shell initially — home screen shows after unlock
document.getElementById('app').style.display = 'none';

/* ══════════════════════════════
   CALCULATOR
══════════════════════════════ */
(function() {
  const buttons = [
    { label: 'C',   cls: 'gray' },
    { label: '+/−', cls: 'gray' },
    { label: '%',   cls: 'gray' },
    { label: '÷',   cls: 'orange' },
    { label: '7' }, { label: '8' }, { label: '9' },
    { label: '×',   cls: 'orange' },
    { label: '4' }, { label: '5' }, { label: '6' },
    { label: '−',   cls: 'orange' },
    { label: '1' }, { label: '2' }, { label: '3' },
    { label: '+',   cls: 'orange' },
    { label: '0',   cls: 'wide'  }, { label: '.' },
    { label: '=',   cls: 'orange' },
  ];

  const grid = document.getElementById('calc-grid');
  buttons.forEach(b => {
    const btn = document.createElement('button');
    btn.className = 'calc-btn' + (b.cls ? ' ' + b.cls : '');
    btn.textContent = b.label;
    btn.addEventListener('click', () => calcPress(b.label));
    grid.appendChild(btn);
  });

  let display = '0', prev = null, op = null, fresh = false;
  const opMap = { '÷': '/', '×': '*', '−': '-', '+': '+' };
  const res = document.getElementById('calc-result');
  const expr = document.getElementById('calc-expr');

  // Secret sequence: 3 × 2 ÷ 2 + 6 + 5 + 10 − 3 − 8 − 9
  const SECRET = ['3','×','2','÷','2','+','6','+','5','+','1','0','−','3','−','8','−','9'];
  let history = [];

  function update() { res.textContent = display; }

  window.calcPress = function(btn) {
    if (btn === 'C') {
      display = '0'; prev = null; op = null; fresh = false;
      expr.textContent = ''; history = [];
    } else if (btn in opMap) {
      prev = parseFloat(display); op = opMap[btn]; fresh = true;
      expr.textContent = display + ' ' + btn;
      history.push(btn);
    } else if (btn === '=') {
      if (prev !== null && op) {
        const r = Function('a,b', 'return a ' + op + ' b')(prev, parseFloat(display));
        expr.textContent = '';
        display = String(parseFloat(r.toFixed(10)));
        prev = null; op = null; fresh = false;
        checkSecret();
        history = [];
      }
    } else if (btn === '+/−') {
      display = String(parseFloat(display) * -1);
    } else if (btn === '%') {
      display = String(parseFloat(display) / 100);
    } else if (btn === '.') {
      if (fresh) { display = '0.'; fresh = false; }
      else if (!display.includes('.')) display += '.';
      history.push(btn);
    } else {
      if (fresh || display === '0') { display = btn; fresh = false; }
      else if (display.length < 12) display += btn;
      history.push(btn);
    }
    update();

  function checkSecret() {
    if (history.length !== SECRET.length) return;
    const match = history.every((v, i) => v === SECRET[i]);
    if (match && !phoneUnlocked) {
      phoneUnlocked = true;
      document.getElementById('phone-icon').classList.remove('disabled');
      document.getElementById('nav-phone').classList.remove('disabled');
      document.getElementById('unlock-popup').classList.add('open');
    }
  }
  };
})();

/* ══════════════════════════════
   MESSAGES
══════════════════════════════ */
const conversations = [
  { id: 'c1', name: 'Captain Blackbeard', avatar: '🏴‍☠️', msgs: [
    { from: 'them', text: "Ahoy, matey! Did ye find the map I buried?" },
    { from: 'me',   text: "Aye Cap'n, X marks the spot behind the old lighthouse." },
    { from: 'them', text: "Arr, good lad! Bring a shovel and a barrel o' rum." },
    { from: 'me',   text: "Shovel packed. Rum... already half drunk." },
    { from: 'them', text: "Ye'll be walkin' the plank at dawn! 😂" },
    { from: 'them', text: "Listen, matey, there be somethin' we need to talk about. Call me at 8675309. Tonight." },
  ]},
  { id: 'c2', name: 'Anne "Cutlass" Bonny', avatar: '⚔️', secret: { phrase: 'the silver key sleeps beneath the broken bell', reply: "Ye cracked it! The pin is 496." }, msgs: [
    { from: 'them', text: "Sorry I missed yer call, matey! Dial me at 493293 and we'll talk proper." },
    { from: 'me',   text: "Set sail at noon. Is the crew ready?" },
    { from: 'them', text: "Aye, the crew be ready and the cannons be loaded." },
    { from: 'me',   text: "Ye heard anythin' about that Navy sloop off the port bow?" },
    { from: 'them', text: "Aye. Dinna fret, we'll outrun the scurvy dogs. Hoist the colors!" },
    { from: 'me',   text: "And the powder? Last time half of it got soaked." },
    { from: 'them', text: "Dry as bone, stowed below deck in oilskin barrels." },
    { from: 'me',   text: "Good. Who's takin' the first watch tonight?" },
    { from: 'them', text: "Old One-Eyed Jim. He swears he sees the whole sea with the one eye." },
    { from: 'me',   text: "Aye, and he's usually right. Annoyin', that." },
    { from: 'them', text: "Ha! Get some rest. We'll need clear heads come mornin'." },
    { from: 'me',   text: "Fair winds to ye, Anne." },
    { from: 'them', text: "And to ye, matey. Fair winds." },
  ]},
  { id: 'c3', name: 'Salty Pete Peglegson', avatar: '🦜', msgs: [
    { from: 'them', text: "Yo ho ho! Polly the parrot learnt a new word." },
    { from: 'me',   text: "Please tell me it isn't another swear..." },
    { from: 'them', text: 'Squawk! "Pieces o\' eight!" She said it plain as day.' },
    { from: 'me',   text: "Shiver me timbers, that's grand! Bringin' her a cracker." },
    { from: 'them', text: "Ye spoil that bird, ye landlubber." },
  ]},
  { id: 'c4', name: 'Greg "Barnacle" Bones', avatar: '⚓', secret: { phrase: 'the drowned keep watch', reply: "Ye did it. Call me at 883021." }, msgs: [
    { from: 'them', text: "Ahoy! Ye be around this weekend?" },
    { from: 'me',   text: "Aye, what be the plan?" },
    { from: 'them', text: "Fancy a feast at the tavern Saturday?" },
    { from: 'me',   text: "Aye, noon suits me fine." },
    { from: 'them', text: "Grand! I'll save ye a seat and a mug o' grog." },
  ]},
  { id: 'c5', name: 'Calico Jack', avatar: '🦈', secret: { phrase: '3423', reply: "Aye, that be the code. The pin is 392." }, msgs: [
    { from: 'them', text: "Ahoy!" },
  ]},
  { id: 'c6', name: 'Polly Pennywhistle', avatar: '🧭', msgs: [
    { from: 'them', text: "Hello there, matey." },
  ]},
];
// A conversation with a secret answers only its exact phrase (ignoring case, punctuation and extra spaces);
// every other message is ignored.
const normalize = t => t.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
let openConv = null;

function renderConversations() {
  const list = document.getElementById('msg-list');
  list.innerHTML = '';
  conversations.forEach(c => {
    const last = c.msgs[c.msgs.length - 1];
    const row = document.createElement('div');
    row.className = 'msg-row';
    row.onclick = () => openThread(c.id);
    row.innerHTML = '<div class="msg-avatar">' + c.avatar + '</div>' +
      '<div class="msg-info"><div class="msg-name">' + escHtml(c.name) + '</div>' +
      '<div class="msg-preview">' + (last.from === 'me' ? 'You: ' : '') + escHtml(last.text) + '</div></div>';
    list.appendChild(row);
  });
}

function renderThread() {
  const box = document.getElementById('thread-bubbles');
  const c = conversations.find(x => x.id === openConv);
  box.innerHTML = '';
  c.msgs.forEach(m => {
    const b = document.createElement('div');
    b.className = 'bubble ' + m.from;
    b.textContent = m.text;
    box.appendChild(b);
  });
  box.scrollTop = box.scrollHeight;
}

function openThread(id) {
  openConv = id;
  const c = conversations.find(x => x.id === id);
  document.getElementById('thread-name').textContent = c.avatar + ' ' + c.name;
  document.getElementById('msg-list').style.display = 'none';
  document.getElementById('msg-thread').classList.add('open');
  renderThread();
}

function closeThread() {
  openConv = null;
  document.getElementById('msg-thread').classList.remove('open');
  document.getElementById('msg-list').style.display = 'block';
  renderConversations();
}

function sendMessage(e) {
  e.preventDefault();
  const input = document.getElementById('thread-text');
  const text = input.value.trim();
  if (!text || !openConv) return;
  const c = conversations.find(x => x.id === openConv);
  c.msgs.push({ from: 'me', text });
  input.value = '';
  renderThread();
  if (c.secret && normalize(text) === c.secret.phrase) {
    setTimeout(() => {
      c.msgs.push({ from: 'them', text: c.secret.reply });
      if (openConv === c.id) renderThread();
    }, 1200);
  }
}

/* ══════════════════════════════
   PHOTOS
══════════════════════════════ */
let photos = [];

function initPhotos() { renderGallery(); }

function addPhoto(uri) {
  photos.unshift(uri);
  renderGallery();
}

function pickFromLibrary() {
  document.getElementById('file-input').click();
}

function libraryPicked(e) {
  Array.from(e.target.files).forEach(file => {
    const reader = new FileReader();
    reader.onload = ev => addPhoto(ev.target.result);
    reader.readAsDataURL(file);
  });
  e.target.value = '';
}

// Videos that ship with the app; they appear first in the gallery.
const videos = [
  { src: 'video.mp4', poster: 'video-cover.svg', label: 'Video' },
];

function renderGallery() {
  const grid = document.getElementById('gallery-grid');
  const empty = document.getElementById('gallery-empty');
  grid.innerHTML = '';
  document.getElementById('gallery-count').textContent = videos.length + photos.length;
  empty.style.display = videos.length + photos.length ? 'none' : 'block';
  videos.forEach(v => {
    const tile = document.createElement('div');
    tile.className = 'video-tile';
    tile.onclick = () => openVideo(v.src);
    tile.innerHTML = '<img src="' + v.poster + '" alt="' + v.label + '"><span class="play-badge">▶</span>';
    grid.appendChild(tile);
  });
  photos.forEach((uri, i) => {
    const img = document.createElement('img');
    img.src = uri;
    img.alt = 'Photo ' + (i + 1);
    img.onclick = () => openLightbox(uri);
    grid.appendChild(img);
  });
}

function openLightbox(uri) {
  document.getElementById('lightbox-video').style.display = 'none';
  const img = document.getElementById('lightbox-img');
  img.style.display = 'block';
  img.src = uri;
  document.getElementById('lightbox').classList.add('open');
}
function openVideo(src) {
  document.getElementById('lightbox-img').style.display = 'none';
  const vid = document.getElementById('lightbox-video');
  vid.style.display = 'block';
  vid.poster = 'video-cover.svg';
  vid.src = src;
  document.getElementById('lightbox').classList.add('open');
  vid.play().catch(() => {});
}
function closeLightbox() {
  const vid = document.getElementById('lightbox-video');
  vid.pause();
  vid.removeAttribute('src');
  vid.load();
  document.getElementById('lightbox').classList.remove('open');
}

/* ══════════════════════════════
   PHONE DIALER
══════════════════════════════ */
(function() {
  const keys = [
    ['1',''],['2','ABC'],['3','DEF'],
    ['4','GHI'],['5','JKL'],['6','MNO'],
    ['7','PQRS'],['8','TUV'],['9','WXYZ'],
    ['*',''],['0','+'],['#',''],
  ];
  const grid = document.getElementById('dial-grid');
  keys.forEach(([num, sub]) => {
    const btn = document.createElement('button');
    btn.className = 'dial-key';
    btn.innerHTML = `<span class="num">${num}</span>${sub ? `<span class="sub">${sub}</span>` : ''}`;
    btn.addEventListener('click', () => dialPress(num));
    grid.appendChild(btn);
  });
})();

// Numbers that place a call when fully dialed; every other number does nothing.
const SECRET_CALLS = {
  '8675309': { name: '867-5309', audio: () => puzzleAudio },
  '883021':  { name: 'Greg "Barnacle" Bones', audio: () => gregAudio },
  '493293':  { name: 'Anne "Cutlass" Bonny', audio: () => anneAudio },
};

function dialPress(k) {
  const el = document.getElementById('dial-number');
  if (el.textContent.length >= 15) return;
  el.textContent += k;
  document.getElementById('dial-del').style.visibility = 'visible';

  const call = SECRET_CALLS[el.textContent];
  if (call) {
    const number = el.textContent;
    setTimeout(() => {
      el.textContent = '';
      document.getElementById('dial-del').style.visibility = 'hidden';
      beginOutgoingCall(call.name, number, call.audio());
    }, 400);
  }
}
function dialDel() {
  const el = document.getElementById('dial-number');
  el.textContent = el.textContent.slice(0, -1);
  if (!el.textContent) document.getElementById('dial-del').style.visibility = 'hidden';
}
/* ══════════════════════════════
   PHONE APP — TABS + HISTORY
══════════════════════════════ */
let callHistory = JSON.parse(localStorage.getItem('callHistory') || '[]');

function phoneTab(id, btn) {
  document.getElementById('phone-keypad-view').style.display = id === 'keypad' ? 'flex' : 'none';
  document.getElementById('phone-recents-view').style.display = id === 'recents' ? 'flex' : 'none';
  document.querySelectorAll('.phone-tab').forEach(t => t.classList.remove('active'));
  if (btn) btn.classList.add('active');
  if (id === 'recents') renderCallHistory();
}

function addCallRecord(type, name, number, durationSecs) {
  callHistory.unshift({ type, name, number, duration: durationSecs, time: Date.now() });
  localStorage.setItem('callHistory', JSON.stringify(callHistory));
}

function renderCallHistory() {
  const list = document.getElementById('recents-list');
  if (!list) return;
  if (!callHistory.length) {
    list.innerHTML = '<p class="recents-empty">No recent calls yet.</p>';
    return;
  }
  list.innerHTML = callHistory.map(c => {
    const label = c.type === 'incoming' ? '↙ Incoming' : '↗ Outgoing';
    const cls   = c.type === 'incoming' ? 'incoming' : 'outgoing';
    const icon  = c.type === 'incoming' ? '📲' : '📞';
    const dur   = c.duration > 0 ? fmtDuration(c.duration) : 'Missed';
    const time  = new Date(c.time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    return `<div class="recent-item">
      <div class="recent-icon">${icon}</div>
      <div class="recent-info">
        <div class="recent-name">${escHtml(c.name || c.number)}</div>
        <div class="recent-sub ${cls}">${label} · ${time}</div>
      </div>
      <div class="recent-dur">${dur}</div>
    </div>`;
  }).join('');
}

function fmtDuration(s) {
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
}

// Only the numbers in SECRET_CALLS place a call, and they are handled in dialPress.
// The call button never dials a real number.
function makeCall() {}

/* ══════════════════════════════
   NOTES
══════════════════════════════ */
let notesData = JSON.parse(localStorage.getItem('notes') || '[]');
let editingId = null;

function saveNotes() { localStorage.setItem('notes', JSON.stringify(notesData)); }

function renderNotes() {
  const list = document.getElementById('notes-list');
  if (!notesData.length) {
    list.innerHTML = '<p class="notes-empty">No notes yet. Write one above!</p>';
    return;
  }
  list.innerHTML = notesData.map(n => `
    <div class="note-card" onclick="editNote(${n.id})">
      <div class="note-body">${escHtml(n.body)}</div>
      <div class="note-meta">
        <span>${fmtDate(n.updated)}</span>
        <button class="note-del" onclick="event.stopPropagation();delNote(${n.id})">🗑</button>
      </div>
    </div>`).join('');
}

function saveNote() {
  const input = document.getElementById('note-input');
  const text = input.value.trim();
  if (!text) return;
  if (editingId !== null) {
    const note = notesData.find(n => n.id === editingId);
    if (note) { note.body = text; note.updated = Date.now(); }
    editingId = null;
    document.getElementById('note-save').textContent = 'Add';
    document.getElementById('note-cancel').style.display = 'none';
  } else {
    notesData.unshift({ id: Date.now(), body: text, updated: Date.now() });
  }
  input.value = '';
  saveNotes(); renderNotes();
}

function editNote(id) {
  const note = notesData.find(n => n.id === id);
  if (!note) return;
  editingId = id;
  document.getElementById('note-input').value = note.body;
  document.getElementById('note-save').textContent = 'Update';
  document.getElementById('note-cancel').style.display = 'block';
  document.getElementById('note-input').focus();
}

function cancelEdit() {
  editingId = null;
  document.getElementById('note-input').value = '';
  document.getElementById('note-save').textContent = 'Add';
  document.getElementById('note-cancel').style.display = 'none';
}

function delNote(id) {
  if (!confirm('Delete this note?')) return;
  notesData = notesData.filter(n => n.id !== id);
  if (editingId === id) cancelEdit();
  saveNotes(); renderNotes();
}

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function fmtDate(ts) {
  return new Date(ts).toLocaleString('en-US', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
}

renderNotes();

/* ══════════════════════════════
   CLOCK + STOPWATCH
══════════════════════════════ */
let clockInterval = null;

function startClock() {
  if (clockInterval) return;
  tickClock();
  clockInterval = setInterval(tickClock, 1000);
}

function tickClock() {
  const now = new Date();
  const pad = n => String(n).padStart(2,'0');
  document.getElementById('clock-time').textContent =
    pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':' + pad(now.getSeconds());
  document.getElementById('clock-date').textContent =
    now.toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' });
}

function clockMode(mode) {
  document.querySelectorAll('.clock-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.clock-tab')[mode === 'clock' ? 0 : 1].classList.add('active');
  document.getElementById('clock-face').style.display = mode === 'clock' ? 'flex' : 'none';
  const sw = document.getElementById('stopwatch-face');
  sw.classList.toggle('visible', mode === 'stopwatch');
}

// Stopwatch
let swRunning = false, swElapsed = 0, swStart = 0, swRaf = null, laps = [];

function swTick() {
  swElapsed = Date.now() - swStart;
  document.getElementById('sw-time').textContent = fmtMs(swElapsed);
  swRaf = requestAnimationFrame(swTick);
}

function swToggle() {
  const btn = document.getElementById('sw-start');
  if (swRunning) {
    cancelAnimationFrame(swRaf);
    swRunning = false;
    btn.textContent = 'Start';
    btn.classList.remove('running');
  } else {
    swStart = Date.now() - swElapsed;
    swRunning = true;
    btn.textContent = 'Stop';
    btn.classList.add('running');
    swTick();
  }
}

function swLap() {
  if (swRunning) {
    laps.unshift({ n: laps.length + 1, t: fmtMs(swElapsed) });
    renderLaps();
  } else {
    swElapsed = 0; laps = [];
    document.getElementById('sw-time').textContent = '00:00.00';
    renderLaps();
  }
}

function renderLaps() {
  document.getElementById('lap-list').innerHTML = laps.map(l =>
    `<div class="lap-row"><span class="lap-label">Lap ${l.n}</span><span>${l.t}</span></div>`
  ).join('');
}

function fmtMs(ms) {
  const pad = (n, d=2) => String(Math.floor(n)).padStart(d,'0');
  return pad(ms/60000) + ':' + pad((ms%60000)/1000) + '.' + pad((ms%1000)/10);
}

// Start clock immediately since it's the default tab
startClock();

/* ══════════════════════════════
   LOCK SCREEN
══════════════════════════════ */
(function() {
  const PASSCODE = '1947';
  let entered = '';

  const keys = [
    ['1',''],['2','ABC'],['3','DEF'],
    ['4','GHI'],['5','JKL'],['6','MNO'],
    ['7','PQRS'],['8','TUV'],['9','WXYZ'],
    [null,''],['0','+'],['del',''],
  ];

  const grid = document.getElementById('lock-grid');
  keys.forEach(([k, sub]) => {
    const btn = document.createElement('button');
    if (k === null) {
      btn.className = 'lock-key ghost';
    } else if (k === 'del') {
      btn.className = 'lock-key';
      btn.innerHTML = '<span class="lock-del">⌫</span>';
      btn.addEventListener('click', () => lockDel());
    } else {
      btn.className = 'lock-key';
      btn.innerHTML = `<span class="lk-num">${k}</span>${sub ? `<span class="lk-sub">${sub}</span>` : ''}`;
      btn.addEventListener('click', () => lockPress(k));
    }
    grid.appendChild(btn);
  });

  function lockPress(digit) {
    if (entered.length >= 4) return;
    entered += digit;
    updateDots();
    if (entered.length === 4) {
      setTimeout(checkCode, 120);
    }
  }

  function lockDel() {
    entered = entered.slice(0, -1);
    updateDots();
    document.getElementById('lock-error').textContent = '';
  }

  function updateDots() {
    for (let i = 0; i < 4; i++) {
      document.getElementById('d' + i).classList.toggle('filled', i < entered.length);
    }
  }

  function checkCode() {
    if (entered === PASSCODE) {
      document.getElementById('lock-screen').classList.add('hidden');
      document.getElementById('home-screen').classList.add('visible');
    } else {
      const dots = document.getElementById('pin-dots');
      dots.classList.add('shake');
      document.getElementById('lock-error').textContent = 'Incorrect passcode';
      setTimeout(() => {
        dots.classList.remove('shake');
        entered = '';
        updateDots();
      }, 420);
    }
  }

  // Lock clock
  function tickLock() {
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const h = now.getHours(), m = now.getMinutes();
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    document.getElementById('lock-time').textContent = h12 + ':' + pad(m) + ' ' + ampm;
    document.getElementById('lock-date').textContent =
      now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  }
  tickLock();
  setInterval(tickLock, 1000);
})();
