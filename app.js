/* Pendulum Lab — ET 617 End-Sem, 24B3024 (Aditya Koli)
 * P5 Inquiry virtual lab · T1 Simple pendulum · L1 rural Marathi-medium learner · C3 mobile-first one-handed.
 * Plain JS, no framework. The whole app is a small state machine: S.screen decides what render() draws.
 */
'use strict';

const ROLL = '24B3024';
const STORE = 'pendulumLab.24B3024.v1';
const G = 9.81; // m/s^2

/* ---------- Variables the learner can test ---------- */
const VARS = {
  L: { name: 'string length', mr: 'दोरीची लांबी', unit: 'cm', min: 20, max: 200, step: 10 },
  m: { name: 'bob mass',      mr: 'गोळ्याचे वस्तुमान', unit: 'g', min: 50, max: 500, step: 50 },
  A: { name: 'swing angle (amplitude)', mr: 'विस्तार', unit: '°', min: 5, max: 30, step: 5 },
};
// What really happens when the variable is made BIGGER (used only by the checker, never shown as a rule)
const TRUTH = { L: 'more', m: 'same', A: 'same' };
const EFFECT_TXT = { less: 'less time (faster swing)', same: 'the same time', more: 'more time (slower swing)' };

/* ---------- State (saved on the phone so Sunita can stop and continue later) ---------- */
function fresh() {
  return {
    screen: 'home', v: null, hyp: null, hypHistory: [], cfg: { L: 50, m: 100, A: 20 }, runs: [],
    hint: 0, done: {}, mis: { M1: 0, M2: 0 }, explain: {},
    quiz: { i: 0, score: 0, detourFrom: null, fb: null }, log: [],
  };
}
let S;
try { S = JSON.parse(localStorage.getItem(STORE)) || fresh(); } catch (e) { S = fresh(); }
function save() { try { localStorage.setItem(STORE, JSON.stringify(S)); } catch (e) { /* private mode: app still works */ } }
function log(type, data) { S.log.push({ t: Date.now(), type, ...data }); if (S.log.length > 300) S.log.shift(); }
function go(screen) { S.screen = screen; if (!['home', 'about'].includes(screen)) S.resume = screen; log('screen', { screen }); save(); render(); window.scrollTo(0, 0); }

/* ---------- Physics: integrate θ'' = -(g/L)·sin θ (RK4). Mass does not appear — that is the physics. ---------- */
function stepRK4(th, w, L, dt) {
  const f = (t) => -(G / L) * Math.sin(t);
  const k1t = w, k1w = f(th);
  const k2t = w + k1w * dt / 2, k2w = f(th + k1t * dt / 2);
  const k3t = w + k2w * dt / 2, k3w = f(th + k2t * dt / 2);
  const k4t = w + k3w * dt, k4w = f(th + k3t * dt);
  return [th + dt * (k1t + 2 * k2t + 2 * k3t + k4t) / 6, w + dt * (k1w + 2 * k2w + 2 * k3w + k4w) / 6];
}
// Time for 10 full swings, found the same way a student would: count returns to the release side.
function timeFor10(Lcm, Adeg) {
  const L = Lcm / 100, dt = 0.0005;
  let th = Adeg * Math.PI / 180, w = 0, t = 0, count = 0, prevW = 0;
  while (count < 10 && t < 120) {
    [th, w] = stepRK4(th, w, L, dt); t += dt;
    if (prevW > 0 && w <= 0 && th > 0) count++; // back at the release side = one full oscillation
    prevW = w;
  }
  return t;
}

/* ---------- Helpers ---------- */
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function bar(buttons) {
  $('#bar').innerHTML = '<div class="inner">' + buttons.map((b, i) =>
    `<button class="btn ${b.primary ? 'primary' : ''}" data-i="${i}" ${b.disabled ? 'disabled' : ''}>${b.label}</button>`).join('') + '</div>';
  $('#bar').querySelectorAll('button').forEach((el) => { el.onclick = () => buttons[+el.dataset.i].on(); });
}
function compareLast() {
  const n = S.runs.length; if (n < 2) return null;
  const b = S.runs[n - 1];
  const diff = (a) => ['L', 'm', 'A'].filter((k) => a[k] !== b[k]);
  // Prefer the latest earlier run that makes a fair test with the newest run (only the tested variable differs)
  for (let i = n - 2; i >= 0; i--) {
    const d = diff(S.runs[i]);
    if (d.length === 1 && d[0] === S.v) return { a: S.runs[i], b, ia: i + 1, ib: n, changed: d };
  }
  const a = S.runs[n - 2];
  return { a, b, ia: n - 1, ib: n, changed: diff(a) };
}
// Effect of making the variable bigger, judged from two runs (3% band = "same", like a real stopwatch)
function observedEffect(c, v) {
  const rel = (c.b.T - c.a.T) / c.a.T;
  if (Math.abs(rel) < 0.03) return 'same';
  const dir = Math.sign(c.b[v] - c.a[v]);
  return Math.sign(rel) * dir > 0 ? 'more' : 'less';
}
function runsTable(highlight) {
  if (!S.runs.length) return '<p class="mr">No runs yet. Your results will appear here.</p>';
  const rows = S.runs.map((r, i) => {
    const prev = S.runs[i - 1];
    const cls = (k) => (highlight && prev && prev[k] !== r[k] ? ' class="chg"' : '');
    return `<tr><td>Run ${i + 1}</td><td${cls('L')}>${r.L}</td><td${cls('m')}>${r.m}</td><td${cls('A')}>${r.A}</td><td>${r.t10.toFixed(2)}</td><td><b>${r.T.toFixed(2)}</b></td></tr>`;
  }).join('');
  return `<table aria-label="Your results"><thead><tr><th></th><th>L cm</th><th>m g</th><th>A °</th><th>10 swings s</th><th>Period s</th></tr></thead><tbody>${rows}</tbody></table>`;
}

/* ================= SCREENS ================= */
const screens = {};

/* Small pendulum drawing used on Home and Learn. The <g class="pend"> rotates about the pivot (160,24). */
function pendSvg(cls, labels) {
  return `<svg viewBox="0 0 320 210" role="img" aria-label="A swinging pendulum${labels ? ' with length, mass and angle labelled' : ''}">
    <rect x="70" y="12" width="180" height="12" rx="4" fill="#64748b"/>
    <line x1="160" y1="24" x2="160" y2="196" stroke="#b6c6c1" stroke-dasharray="5 6"/>
    ${labels ? '<path d="M160 74 A50 50 0 0 1 181 69" fill="none" stroke="#b45309" stroke-width="3" transform="rotate(-24 160 24)"/>' : ''}
    <g class="pend ${cls}" style="transform-origin:160px 24px">
      <line x1="160" y1="24" x2="160" y2="170" stroke="#14201d" stroke-width="2.5"/>
      <circle cx="160" cy="170" r="20" fill="url(#bobg)"/>
      ${labels ? '<text x="168" y="110" font-size="14" font-weight="700" fill="#14201d">L</text><text x="160" y="175" font-size="12" font-weight="700" fill="#fff" text-anchor="middle">m</text>' : ''}
    </g>
    ${labels ? '<text x="96" y="90" font-size="14" font-weight="700" fill="#b45309">A</text>' : ''}
    <defs><radialGradient id="bobg" cx=".35" cy=".35"><stop offset="0" stop-color="#5eead4"/><stop offset="1" stop-color="#0f766e"/></radialGradient></defs>
  </svg>`;
}

/* 1. Home */
screens.home = () => {
  const n = Object.keys(S.done).length, started = S.runs.length || n;
  $('#app').innerHTML = `
    <div class="hero">${pendSvg('loop')}</div>
    <p class="step">लोलक प्रयोगशाळा · Pendulum Lab</p>
    <h1>What decides how fast a pendulum swings?</h1>
    <div class="card"><p>Namaskar! 🙏 Think of a <b>jhoka</b> (झोका) in your village. Some swing back and forth quickly, some slowly. <b>Why?</b></p>
    <p style="margin:0">Today <b>we</b> will guess, test and find out ourselves — like real scientists. About 20 minutes. Your work is saved on this phone, so you can stop any time.</p></div>
    ${started ? `<div class="key">Welcome back! You have finished <b>${n} of 3</b> experiments.</div>` : ''}`;
  bar(started
    ? [{ label: 'Start over', on: () => { if (confirm('Clear your saved work and start again?')) { S = fresh(); save(); go('home'); } } },
       { label: 'Continue ▶', primary: true, on: () => go(S.resume || 'choose') }]
    : [{ label: "Let's start ▶", primary: true, on: () => go('learn') }]);
};

/* 2. Concept — tap to watch exactly one oscillation */
screens.learn = () => {
  $('#app').innerHTML = `
    <p class="step">Learn · words we need</p>
    <h2>Let us meet the pendulum</h2>
    <div class="hero">${pendSvg('', true)}</div>
    <button class="btn inline" id="oneOsc">▶ Show me ONE oscillation</button>
    <div class="key" id="oscTxt"><b>One oscillation</b> = from one side → to the other side → <b>back again</b>.<br>
    <b>Period</b> <span class="mr">(आवर्तकाल)</span> = time for one oscillation, in seconds.</div>
    <p>We can change three things:</p>
    <div class="vocab">
      <div><b>L · length</b><span class="mr">दोरीची लांबी</span><br>How long the string is (cm)</div>
      <div><b>m · mass</b><span class="mr">वस्तुमान</span><br>How heavy the bob is (g)</div>
      <div><b>A · angle</b><span class="mr">विस्तार</span><br>How far we pull it before letting go (°)</div>
      <div><b>⏱ 10 swings</b><span class="mr">१० आंदोलने</span><br>One swing is too quick to time, so we time 10 and divide by 10</div>
    </div>`;
  let count = 0;
  $('#oneOsc').onclick = () => {
    const g = document.querySelector('.hero .pend'); g.classList.remove('go'); void g.getBBox(); g.classList.add('go');
    count++; $('#oneOsc').textContent = `▶ Again (watched ${count})`;
    setTimeout(() => { $('#oscTxt').classList.add('pop'); }, 1800);
  };
  bar([{ label: '◀ Back', on: () => go('home') }, { label: 'I am ready ▶', primary: true, on: () => go('choose') }]);
};

/* 3. Choose a question */
const VICON = { m: '⚖️', A: '📐', L: '📏' };
screens.choose = () => {
  const order = ['m', 'A', 'L'], n = Object.keys(S.done).length;
  $('#app').innerHTML = `
    <p class="step">Guess · pick a question</p>
    <h2>Which question shall we test?</h2>
    <div class="progress" aria-label="${n} of 3 done"><i style="width:${n / 3 * 100}%"></i></div>
    <div class="choices">${order.map((k) => `<button class="choice ${S.done[k] ? 'done' : ''}" data-k="${k}"><span class="ic">${VICON[k]}</span><span>Does the <b>${VARS[k].name}</b> change the period?<span class="sub">${VARS[k].mr}</span></span></button>`).join('')}</div>
    ${n >= 3 ? '<div class="ok pop">🎉 You tested all three! Now try the check-up.</div>' : '<p class="mr">Tip: start with the bob mass.</p>'}`;
  document.querySelectorAll('.choice').forEach((el) => { el.onclick = () => { S.v = el.dataset.k; S.hyp = null; S.hint = 0; log('question', { v: S.v }); go('hypothesis'); }; });
  bar([{ label: '◀ Back', on: () => go('learn') },
       { label: 'Check-up ▶', primary: true, disabled: n < 3, on: () => go('quiz') }]);
};

/* 4. Hypothesis */
const HICON = { less: '🐇', same: '⚖️', more: '🐢' };
screens.hypothesis = () => {
  const V = VARS[S.v];
  const revising = S.hypHistory.some((h) => h.v === S.v);
  $('#app').innerHTML = `
    <p class="step">Guess · ${revising ? 'change your guess' : 'make a guess'}</p>
    <h2>${VICON[S.v]} If we make the <mark>${V.name}</mark> bigger, one swing will take…</h2>
    ${revising ? `<div class="warn">Your earlier guess was “${EFFECT_TXT[S.hypHistory.filter((h) => h.v === S.v).pop().hyp]}”. Look at your data and choose again.</div>` : ''}
    <div class="choices">${['less', 'same', 'more'].map((h) => `<button class="choice" data-h="${h}" aria-pressed="${S.hyp === h}"><span class="ic">${HICON[h]}</span>${EFFECT_TXT[h]}</button>`).join('')}</div>
    <p class="mr">There is no wrong guess. A guess we can test is called a <b>hypothesis</b> (गृहीतक).</p>`;
  document.querySelectorAll('.choice').forEach((el) => { el.onclick = () => { S.hyp = el.dataset.h; save(); render(); }; });
  bar([{ label: '◀ Back', on: () => go('choose') }, { label: 'Test it 🔬', primary: true, disabled: !S.hyp, on: () => {
    S.hypHistory.push({ v: S.v, hyp: S.hyp, t: Date.now() });
    // Diagnose the two persona misconceptions from the guess itself
    if (S.v === 'm' && S.hyp === 'less') S.mis.M1++;
    if (S.v === 'A' && S.hyp === 'more') S.mis.M2++;
    log('hypothesis', { v: S.v, hyp: S.hyp });
    go('lab');
  } }]);
};

/* 5. Lab — drag the bob, ruler + protractor, stopwatch, predict each run, live graph */
let anim = null;
screens.lab = () => {
  const V = VARS[S.v];
  const ctrl = (k) => { const X = VARS[k]; return `
    <div class="ctrl ${k === S.v ? 'focus' : ''}">
      <label for="r${k}"><span>${k === S.v ? '👉 ' : ''}${X.name} <span class="mr">${X.mr}</span></span><span class="val" id="o${k}">${S.cfg[k]} ${X.unit}</span></label>
      <div class="row"><button class="pm" data-k="${k}" data-d="-1" aria-label="Decrease ${X.name}">−</button>
      <input type="range" id="r${k}" min="${X.min}" max="${X.max}" step="${X.step}" value="${S.cfg[k]}">
      <button class="pm" data-k="${k}" data-d="1" aria-label="Increase ${X.name}">+</button></div>
    </div>`; };
  const msg = S.lastMsg; S.lastMsg = null;
  $('#app').innerHTML = `
    <p class="step">Test · ${VICON[S.v]} does the ${V.name} matter?</p>
    ${msg ? `<div class="result pop">${msg}</div>` : ''}
    <div class="labbox">
      <canvas id="cv" width="640" height="420" aria-label="Pendulum. Drag the bob to set the angle."></canvas>
      <div class="watch"><span>⏱ <span id="tw">0.00</span> s</span><span class="dots" id="dots">${'<i></i>'.repeat(10)}</span></div>
      <p class="draghint">✋ Drag the bob to set the angle · ruler on the string = 10 cm marks</p>
    </div>
    ${S.runs.length ? `<p style="margin:0 0 6px;font-weight:700">Before you release: compared to Run ${S.runs.length}, this swing will be…</p>
    <div class="chips">${['less', 'same', 'more'].map((h) => `<button class="chip" data-p="${h}" aria-pressed="${S.pred === h}">${HICON[h]} ${h === 'less' ? 'faster' : h === 'same' ? 'same' : 'slower'}</button>`).join('')}</div>` : ''}
    <div class="key" style="font-size:.93rem">Fair test: change <b>only the ${V.name}</b>. Keep the other two the same.</div>
    ${ctrl(S.v)}${['L', 'm', 'A'].filter((k) => k !== S.v).map(ctrl).join('')}
    <div class="card"><h2 style="margin-top:0">📈 Period vs ${V.name}</h2><canvas id="gr" width="640" height="300" aria-label="Graph of your runs"></canvas>
    <p class="mr" style="margin:6px 0 0">Each dot is one run where only the ${V.name} was different.</p></div>
    <div class="card"><h2 style="margin-top:0">📋 Your results</h2>${runsTable(true)}<p class="mr" style="margin:6px 0 0">Yellow = what you changed from the run before.</p></div>`;
  const setVal = (k, val) => { const X = VARS[k]; S.cfg[k] = Math.max(X.min, Math.min(X.max, val)); $('#r' + k).value = S.cfg[k]; $('#o' + k).textContent = S.cfg[k] + ' ' + X.unit; save(); drawStill(); };
  ['L', 'm', 'A'].forEach((k) => { $('#r' + k).oninput = (e) => setVal(k, +e.target.value); });
  document.querySelectorAll('.pm').forEach((b) => { b.onclick = () => setVal(b.dataset.k, S.cfg[b.dataset.k] + (+b.dataset.d) * VARS[b.dataset.k].step); });
  document.querySelectorAll('.chip').forEach((b) => { b.onclick = () => { S.pred = b.dataset.p; save(); document.querySelectorAll('.chip').forEach((x) => x.setAttribute('aria-pressed', x === b)); }; });
  // Drag the bob: natural mapping — pull it sideways to set the release angle (snaps to 5°)
  const cv = $('#cv'); let dragging = false;
  const angleFrom = (e) => { const r = cv.getBoundingClientRect(); const x = (e.clientX - r.left) * cv.width / r.width - cv.width / 2; const y = (e.clientY - r.top) * cv.height / r.height - 34;
    return Math.round(Math.abs(Math.atan2(x, Math.max(y, 1))) * 180 / Math.PI / 5) * 5; };
  cv.onpointerdown = (e) => { if (anim) return; dragging = true; cv.setPointerCapture(e.pointerId); setVal('A', angleFrom(e)); };
  cv.onpointermove = (e) => { if (dragging) setVal('A', angleFrom(e)); };
  cv.onpointerup = cv.onpointercancel = () => { dragging = false; };
  drawStill(); drawGraph();
  labBar();
};
function labBar(running) {
  bar([
    { label: S.runs.length >= 2 ? 'Compare ▶' : `Need ${2 - S.runs.length} more run${S.runs.length === 1 ? '' : 's'}`, disabled: S.runs.length < 2 || running, on: () => { log('compare', {}); go('compare'); } },
    running ? { label: '⏩ Skip to result', primary: true, on: () => finishRun(true) }
            : { label: '▶ Release & time', primary: true, on: startRun },
  ]);
}
function drawPendulum(th, trail) {
  const cv = $('#cv'); if (!cv) return; const c = cv.getContext('2d');
  const W = cv.width, H = cv.height, px = W / 2, py = 34;
  const len = 60 + (S.cfg.L - 20) / 180 * 290;  // 20–200 cm onto the canvas
  const r = 13 + Math.sqrt(S.cfg.m / 500) * 19;   // heavier bob drawn bigger
  const pos = (a) => [px + len * Math.sin(a), py + len * Math.cos(a)];
  const [x, y] = pos(th);
  c.clearRect(0, 0, W, H);
  // Protractor around the pivot (tool for reading the angle)
  c.save(); c.strokeStyle = 'rgba(180,83,9,.55)'; c.fillStyle = '#b45309'; c.lineWidth = 2; c.font = 'bold 15px system-ui'; c.textAlign = 'center';
  c.beginPath(); c.arc(px, py, 70, Math.PI / 2 - 0.56, Math.PI / 2 + 0.56); c.stroke();
  for (let d = -30; d <= 30; d += 5) { const a = d * Math.PI / 180, r2 = d % 10 === 0 ? 84 : 77;
    c.beginPath(); c.moveTo(px + 70 * Math.sin(a), py + 70 * Math.cos(a)); c.lineTo(px + r2 * Math.sin(a), py + r2 * Math.cos(a)); c.stroke();
    if (d % 10 === 0 && d) c.fillText(Math.abs(d) + '°', px + 100 * Math.sin(a), py + 100 * Math.cos(a) + 5); }
  c.restore();
  // Ceiling + vertical reference line
  c.fillStyle = '#64748b'; c.fillRect(px - 150, py - 14, 300, 14);
  c.strokeStyle = '#475569'; c.lineWidth = 2; for (let i = -150; i < 150; i += 14) { c.beginPath(); c.moveTo(px + i, py - 14); c.lineTo(px + i + 10, py - 26); c.stroke(); }
  c.setLineDash([6, 7]); c.strokeStyle = '#b6c6c1'; c.lineWidth = 2; c.beginPath(); c.moveTo(px, py); c.lineTo(px, H - 30); c.stroke(); c.setLineDash([]);
  // Motion trail (ghost bobs)
  (trail || []).forEach((a, i, arr) => { const [tx, ty] = pos(a); c.fillStyle = `rgba(20,184,166,${(i + 1) / arr.length * 0.22})`; c.beginPath(); c.arc(tx, ty, r * 0.8, 0, 7); c.fill(); });
  // String with ruler marks every 10 cm
  c.strokeStyle = '#14201d'; c.lineWidth = 3; c.beginPath(); c.moveTo(px, py); c.lineTo(x, y); c.stroke();
  const nx = Math.cos(th), ny = -Math.sin(th); c.lineWidth = 2;
  for (let k = 10; k < S.cfg.L; k += 10) { const f = k / S.cfg.L, tx = px + (x - px) * f, ty = py + (y - py) * f, s = k % 50 === 0 ? 10 : 5;
    c.beginPath(); c.moveTo(tx - nx * s, ty - ny * s); c.lineTo(tx + nx * s, ty + ny * s); c.stroke(); }
  // Bob
  c.fillStyle = 'rgba(0,0,0,.12)'; c.beginPath(); c.ellipse(x + 4, y + r + 6, r * 0.9, 5, 0, 0, 7); c.fill();
  const g = c.createRadialGradient(x - r / 3, y - r / 3, 2, x, y, r); g.addColorStop(0, '#5eead4'); g.addColorStop(1, '#0f766e');
  c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
  c.fillStyle = '#fff'; c.font = 'bold 14px system-ui'; c.textAlign = 'center'; c.fillText(S.cfg.m + 'g', x, y + 5);
  c.fillStyle = '#14201d'; c.font = 'bold 18px system-ui'; c.textAlign = 'left'; c.fillText(`L = ${S.cfg.L} cm`, 14, H - 12);
  c.textAlign = 'right'; c.fillText(`A = ${S.cfg.A}°`, W - 14, H - 12);
}
function drawStill() { drawPendulum(S.cfg.A * Math.PI / 180); }
// Graph: period against the tested variable, only runs that form fair tests with the current settings
function drawGraph() {
  const cv = $('#gr'); if (!cv) return; const c = cv.getContext('2d'), V = VARS[S.v];
  const W = cv.width, H = cv.height, l = 64, r = 20, t = 20, b = 52;
  const others = ['L', 'm', 'A'].filter((k) => k !== S.v);
  const pts = S.runs.filter((run) => others.every((k) => run[k] === S.cfg[k])).map((run) => [run[S.v], run.T]);
  const yMax = Math.max(3, ...pts.map((p) => p[1] * 1.15));
  const X = (v) => l + (v - V.min) / (V.max - V.min) * (W - l - r), Y = (v) => H - b - v / yMax * (H - t - b);
  c.clearRect(0, 0, W, H); c.strokeStyle = '#d3e0dc'; c.fillStyle = '#5b6b66'; c.font = '15px system-ui'; c.lineWidth = 1;
  for (let v = 0; v <= yMax; v += 0.5) { c.beginPath(); c.moveTo(l, Y(v)); c.lineTo(W - r, Y(v)); c.stroke(); c.textAlign = 'right'; c.fillText(v.toFixed(1), l - 8, Y(v) + 5); }
  c.textAlign = 'center';
  for (let i = 0; i <= 4; i++) { const v = V.min + (V.max - V.min) * i / 4; c.fillText(Math.round(v), X(v), H - b + 22); }
  c.fillStyle = '#14201d'; c.font = 'bold 15px system-ui'; c.fillText(`${V.name} (${V.unit})`, (l + W - r) / 2, H - 8);
  c.save(); c.translate(16, (t + H - b) / 2); c.rotate(-Math.PI / 2); c.fillText('period (s)', 0, 0); c.restore();
  if (!pts.length) { c.fillStyle = '#5b6b66'; c.font = '16px system-ui'; c.fillText('Your runs will appear here', (l + W) / 2, (t + H - b) / 2); return; }
  const sorted = [...pts].sort((p, q) => p[0] - q[0]);
  c.strokeStyle = 'rgba(15,118,110,.5)'; c.lineWidth = 3; c.beginPath(); sorted.forEach((p, i) => (i ? c.lineTo(X(p[0]), Y(p[1])) : c.moveTo(X(p[0]), Y(p[1])))); c.stroke();
  pts.forEach((p, i) => { const last = i === pts.length - 1; c.fillStyle = last ? '#f59e0b' : '#0f766e'; c.beginPath(); c.arc(X(p[0]), Y(p[1]), last ? 10 : 7, 0, 7); c.fill(); });
}
function startRun() {
  const L = S.cfg.L / 100; let th = S.cfg.A * Math.PI / 180, w = 0, t = 0, count = 0, prevW = 0, last = performance.now();
  const target = timeFor10(S.cfg.L, S.cfg.A), trail = [];
  anim = { target, stop: false };
  labBar(true);
  document.querySelectorAll('.chip').forEach((b) => { b.disabled = true; });
  const tick = (now) => {
    if (!anim || anim.stop) return;
    let dtReal = Math.min(0.05, (now - last) / 1000); last = now;
    while (dtReal > 0) { const dt = Math.min(0.002, dtReal); [th, w] = stepRK4(th, w, L, dt); t += dt; dtReal -= dt;
      if (prevW > 0 && w <= 0 && th > 0) count++; prevW = w; }
    trail.push(th); if (trail.length > 14) trail.shift();
    drawPendulum(th, trail);
    $('#tw').textContent = t.toFixed(2);
    document.querySelectorAll('#dots i').forEach((d, i) => d.classList.toggle('on', i < count));
    if (count >= 10 || t >= target) finishRun(false); else requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
function finishRun(skipped) {
  if (!anim) return; const t10 = anim.target; anim.stop = true; anim = null;
  const run = { L: S.cfg.L, m: S.cfg.m, A: S.cfg.A, t10, T: t10 / 10, v: S.v };
  const prev = S.runs[S.runs.length - 1];
  S.runs.push(run);
  let msg = `<b>Run ${S.runs.length}</b>: 10 swings took <b>${t10.toFixed(2)} s</b> → period = ${t10.toFixed(2)} ÷ 10 = <b>${run.T.toFixed(2)} s</b>`;
  if (prev && S.pred) {
    const rel = (run.T - prev.T) / prev.T, actual = Math.abs(rel) < 0.03 ? 'same' : rel < 0 ? 'less' : 'more';
    const word = { less: 'faster', same: 'the same', more: 'slower' };
    msg += `<br>${actual === S.pred ? '✅' : '🤔'} You predicted <b>${word[S.pred]}</b> — it was <b>${word[actual]}</b> than Run ${S.runs.length - 1}.`;
    log('predict', { pred: S.pred, actual });
  }
  S.pred = null; S.lastMsg = msg;
  log('run', { ...run, skipped });
  save(); render();
}

/* 6. Compare — the heart of the inquiry loop, incl. support after an unsuccessful experiment */
screens.compare = () => {
  const V = VARS[S.v], c = compareLast();
  let html = `<p class="step">Compare your runs</p>${runsTable(true)}`;
  let buttons = [{ label: '◀ Lab', on: () => go('lab') }];
  if (!c.changed.length || !c.changed.includes(S.v)) {
    html += `<div class="warn"><b>We cannot answer our question yet.</b> Between Run ${c.ia} and Run ${c.ib} the <b>${V.name}</b> did not change. Change the ${V.name} and run again.</div>`;
    buttons.push({ label: 'Back to lab ▶', primary: true, on: () => go('lab') });
  } else if (c.changed.length > 1) {
    // Unsuccessful experiment type 1: not a fair test
    const others = c.changed.filter((k) => k !== S.v).map((k) => VARS[k].name).join(' and ');
    log('unfair', { changed: c.changed });
    html += `<div class="warn"><b>Not a fair test yet.</b> You changed the ${V.name} <b>and</b> the ${others} at the same time (see the yellow cells).<br>
      If the period changed, which one caused it? We cannot tell! Set the ${others} back to Run ${c.ia}'s value, and run again.</div>`;
    buttons.push({ label: 'Fix it in the lab ▶', primary: true, on: () => go('lab') });
  } else {
    const eff = observedEffect(c, S.v);
    const pct = Math.abs((c.b.T - c.a.T) / c.a.T * 100).toFixed(1);
    html += `<div class="card">${V.name}: <b>${c.a[S.v]} → ${c.b[S.v]} ${V.unit}</b><br>Period: <b>${c.a.T.toFixed(2)} s → ${c.b.T.toFixed(2)} s</b> (${pct}% change)</div>`;
    if (S.returnToQuiz) {
      // Came from a check-up question: show the evidence, then let her answer again herself
      html += `<div class="key">What happened to the period when you made the ${V.name} ${c.b[S.v] > c.a[S.v] ? 'bigger' : 'smaller'}? Keep this in mind and answer the question again.</div>`;
      buttons.push({ label: 'Answer again ▶', primary: true, on: () => { S.returnToQuiz = false; log('detourDone', { v: S.v }); go('quiz'); } });
    } else if (eff === S.hyp) {
      S.done[S.v] = true; save();
      log('confirmed', { v: S.v, eff });
      html += `<div class="ok pop"><span class="big">🎉</span> <b>Your data agrees with your guess!</b> Making the ${V.name} bigger → one swing takes ${EFFECT_TXT[eff]}.</div>
        ${S.v === 'L' ? '<p>Look closely: did the period double when the length doubled? Try 25 cm and 100 cm (4 times longer). What happens to the period?</p>' : ''}
        ${explainBox()}`;
      buttons.push({ label: 'Next question ▶', primary: true, on: () => go(Object.keys(S.done).length >= 3 ? 'quiz' : 'choose') });
    } else {
      // Unsuccessful experiment type 2: result contradicts hypothesis → hint ladder, never the answer
      log('contradict', { v: S.v, hyp: S.hyp, eff, hint: S.hint });
      const hints = [
        `Look at the table. In Run ${c.ia} the ${V.name} was ${c.a[S.v]} ${V.unit}; in Run ${c.ib} it was ${c.b[S.v]} ${V.unit}. Now look only at the <b>Period</b> column. What happened to it?`,
        `Your guess said the swing would take <b>${EFFECT_TXT[S.hyp]}</b>. The period went from ${c.a.T.toFixed(2)} s to ${c.b.T.toFixed(2)} s. Do these two numbers agree with your guess?`,
        `To be really sure, make a <b>bigger</b> change: put the ${V.name} at ${S.v === 'L' ? '25 then 100 cm' : S.v === 'm' ? '50 then 500 g' : '5 then 30°'}, keep the rest the same, and run twice. Then decide.`,
      ];
      html += `<div class="bad"><b>Hmm, the result did not match your guess.</b> That is OK! Scientists learn the most when this happens. Let us look at the evidence together.</div>
        ${hints.slice(0, S.hint).map((h, i) => `<div class="key"><b>Hint ${i + 1}:</b> ${h}</div>`).join('')}
        ${S.hint < 3 ? '<button class="btn inline" id="hintBtn">💡 Give me a hint</button>' : ''}
        <button class="btn inline" id="moreBtn">🔁 Run another test</button>`;
      buttons.push({ label: 'Change my guess ▶', primary: true, on: () => { log('revise', { v: S.v }); S.hyp = null; go('hypothesis'); } });
    }
  }
  $('#app').innerHTML = html;
  const hb = $('#hintBtn'); if (hb) hb.onclick = () => { S.hint++; log('hint', { v: S.v, level: S.hint }); save(); render(); };
  const mb = $('#moreBtn'); if (mb) mb.onclick = () => go('lab');
  wireExplain(S.v);
  bar(buttons);
};

/* Explanation box + feedback (AI with rule-based fallback) */
function explainBox() {
  const prev = S.explain[S.v];
  return `<h2>Explain in your own words</h2>
    <p>Why does the ${VARS[S.v].name} ${TRUTH[S.v] === 'same' ? '<b>not</b> change' : 'change'} the period? Use your numbers. (English, Marathi or Hinglish is fine.)</p>
    <textarea id="exTxt" placeholder="My data shows…">${prev ? esc(prev.text) : ''}</textarea>
    <button class="btn inline" id="exBtn">Check my explanation</button>
    <div id="exFb">${prev ? fbHtml(prev.fb) : ''}</div>`;
}
function fbHtml(fb) {
  const cls = fb.verdict === 'correct' ? 'ok' : fb.verdict === 'misconception' ? 'bad' : 'warn';
  return `<div class="${cls}">${esc(fb.feedback)}</div><p class="src">${fb.source === 'ai' ? 'Feedback by AI, checked by the app' : 'Offline feedback (AI not available)'}</p>`;
}
function wireExplain(v, onDone) {
  const b = $('#exBtn'); if (!b) return;
  b.onclick = async () => {
    const text = $('#exTxt').value.trim();
    if (text.length < 5) { $('#exFb').innerHTML = '<div class="warn">Write at least one sentence first.</div>'; return; }
    b.disabled = true; b.textContent = 'Checking…';
    const fb = await getFeedback(v, text);
    S.explain[v] = { text, fb }; if (fb.misconception) S.mis[fb.misconception]++;
    log('explain', { v, verdict: fb.verdict, source: fb.source }); save();
    $('#exFb').innerHTML = fbHtml(fb); b.disabled = false; b.textContent = 'Check again';
    if (onDone) onDone(fb);
  };
}
async function getFeedback(v, text) {
  const runs = S.runs.slice(-6).map(({ L, m, A, T }) => ({ L, m, A, T: +T.toFixed(3) }));
  try {
    const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), 9000);
    const r = await fetch('/api/feedback', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ variable: v, explanation: text, runs }), signal: ctl.signal });
    clearTimeout(to);
    if (!r.ok) throw new Error('status ' + r.status);
    const j = await r.json();
    if (!['correct', 'partial', 'misconception'].includes(j.verdict) || typeof j.feedback !== 'string') throw new Error('bad shape');
    return { ...j, source: 'ai' };
  } catch (e) {
    return { ...ruleFeedback(v, text), source: 'offline' };
  }
}
// Rule-based fallback: keyword rubric for each variable (also documented in the report, D6)
function ruleFeedback(v, raw) {
  const t = raw.toLowerCase();
  const sameWords = /(same|no change|not change|doesn'?t change|does not change|equal|nahi|नाही|सारखा|same time|no effect|doesn'?t matter)/;
  const dataWords = /(\d|run|table|data|period|time)/;
  if (v === 'm') {
    if (/(heav\w*.*(fast|quick|less time))|(light\w*.*slow)/.test(t)) return { verdict: 'misconception', misconception: 'M1',
      feedback: 'Many people think a heavier bob swings faster. Look at your runs: the mass changed but the period stayed the same. Gravity pulls every gram equally, so a heavy bob is not quicker.' };
    if (sameWords.test(t)) return { verdict: dataWords.test(t) ? 'correct' : 'partial',
      feedback: dataWords.test(t) ? 'Well done! You used your data: the mass changed but the period stayed the same.' : 'Right idea: mass does not change the period. Now add your numbers, e.g. “at 100 g and 400 g the period was the same”.' };
  }
  if (v === 'A') {
    if (/(big|large|more|wide).*(more time|slow|longer|takes more)/.test(t)) return { verdict: 'misconception', misconception: 'M2',
      feedback: 'A bigger swing travels further, but it also moves faster. Look at your table: for small angles the period stayed almost the same.' };
    if (sameWords.test(t) || /(fast|speed)/.test(t)) return { verdict: dataWords.test(t) ? 'correct' : 'partial',
      feedback: dataWords.test(t) ? 'Good! The bob goes further but also faster, so the time stays almost the same for small swings.' : 'Right idea. Add numbers from your table to support it.' };
  }
  if (v === 'L') {
    if (/(long|length).*(more time|slow|longer|bigger period|increase)/.test(t) || /(short).*(fast|less)/.test(t)) return { verdict: dataWords.test(t) ? 'correct' : 'partial',
      feedback: dataWords.test(t) ? 'Yes! A longer string gives a longer period. Did you notice 4 times the length gives only 2 times the period?' : 'Correct direction. Use your numbers to show how much the period grew.' };
  }
  return { verdict: 'partial', feedback: 'Thanks for trying! Look at the Period column in your table and say what happened to it when you changed the ' + VARS[v].name + '.' };
}

/* 7. Check-up quiz: 5 tasks in 3 formats (MCQ, numeric, explanation), adaptive detours */
const QUIZ = [
  { id: 'q1', type: 'mcq', fix: 'm', text: 'Meena\'s pendulum has a 50 cm string and a 100 g bob. She changes to a 400 g bob (same string, same angle). The period will be…',
    opts: [['shorter', 'M1'], ['the same', true], ['longer', 'X']],
    fb: { true: 'Correct! Mass does not change the period — just like in your experiment.',
          M1: 'This is a common idea: “heavy = fast”. But your own runs showed the period stayed the same when only the mass changed. Let us test it again.',
          X: 'Not quite. Check your mass runs: did the period change at all?' } },
  { id: 'q2', type: 'mcq', fix: 'A', text: 'Ravi releases the same pendulum from 10° instead of 25°. One swing will take…',
    opts: [['less time, because it moves a shorter distance', 'M2'], ['about the same time', true], ['more time', 'X']],
    fb: { true: 'Correct! For small swings the angle hardly changes the period.',
          M2: 'It does move a shorter distance — but it also moves slower. Both effects cancel. Your amplitude runs showed this. Let us look again.',
          X: 'Not quite. Look at your amplitude runs again.' } },
  { id: 'q3', type: 'num', fix: 'L', text: 'A 25 cm pendulum has a period of 1.0 s. We make the string 100 cm (4 times longer). What is the new period, in seconds?',
    check: (x) => (Math.abs(x - 2) <= 0.1 ? true : Math.abs(x - 4) <= 0.2 ? 'LIN' : Math.abs(x - 1) <= 0.05 ? 'NOCH' : 'X'),
    fb: { true: 'Correct! 4 times the length gives 2 times the period. The period grows like the square root of the length.',
          LIN: 'Close thinking, but the period does not grow as fast as the length. Try 25 cm and 100 cm in the lab and see.',
          NOCH: 'The length does change the period. Let us test 25 cm and 100 cm in the lab.',
          X: 'Not quite. Try it in the lab: 25 cm, then 100 cm.' } },
  { id: 'q4', type: 'mcq', fix: 'm', text: 'Priya wants to test if mass changes the period. Which pair of runs is a FAIR test?',
    opts: [['50 cm, 100 g, 20°  and  50 cm, 400 g, 20°', true], ['50 cm, 100 g, 20°  and  100 cm, 400 g, 20°', 'X'], ['50 cm, 100 g, 10°  and  50 cm, 400 g, 30°', 'X']],
    fb: { true: 'Correct! Only the mass changes; length and angle stay the same.',
          X: 'In that pair, more than one thing changes, so we cannot tell which one caused a change. Look for the pair where only the mass changes.' } },
  { id: 'q5', type: 'explain', fix: 'm', text: 'Your friend says: “A heavy stone on a string will swing faster than a light one.” Explain to your friend why this is not right. Use what you saw in the lab.' },
];
screens.quiz = () => {
  const q = QUIZ[S.quiz.i];
  if (!q) return go('summary');
  const fb = S.quiz.fb;
  let body = `<p class="step">Check-up · question ${S.quiz.i + 1} of ${QUIZ.length}</p>
    <div class="progress"><i style="width:${S.quiz.i / QUIZ.length * 100}%"></i></div>
    <h2>${q.text}</h2>`;
  if (q.type === 'mcq') body += `<div class="choices">${q.opts.map((o, i) => `<button class="choice ${fb ? (o[1] === true ? 'right' : fb.pick === i ? 'wrong' : '') : ''}" data-i="${i}" ${fb ? 'disabled' : ''}><span class="let">${'ABC'[i]}</span>${o[0]}</button>`).join('')}</div>`;
  if (q.type === 'num') body += `<input type="number" id="numIn" inputmode="decimal" step="0.1" placeholder="e.g. 1.5" ${fb ? 'disabled value="' + fb.pick + '"' : ''}><br><br>`;
  if (q.type === 'explain') { S.v = 'm'; body += explainBox(); }
  if (fb) body += `<div class="pop ${fb.key === true || fb.key === 'true' ? 'ok' : 'bad'}">${q.fb[fb.key]}</div>`;
  $('#app').innerHTML = body;
  const answer = (key, pick) => {
    S.quiz.fb = { key: String(key), pick };
    if (key === true) S.quiz.score++;
    if (key === 'M1' || key === 'M2') S.mis[key]++;
    log('quiz', { q: q.id, key: String(key), pick }); save(); render();
  };
  document.querySelectorAll('.choice').forEach((el) => { el.onclick = () => answer(q.opts[+el.dataset.i][1], +el.dataset.i); });
  const next = () => { S.quiz.i++; S.quiz.fb = null; save(); render(); };
  if (q.type === 'explain') {
    wireExplain('m', (f) => { if (!S.quiz.fb) { S.quiz.fb = { key: f.verdict === 'correct' ? 'true' : 'x', pick: 0 }; if (f.verdict === 'correct') S.quiz.score++; save(); } });
    bar([{ label: 'Skip', on: next }, { label: 'Finish ▶', primary: true, on: next }]);
    return;
  }
  if (!fb) {
    bar([{ label: 'Check ✓', primary: true, disabled: q.type === 'mcq', on: () => {
      const x = parseFloat($('#numIn').value); if (isNaN(x)) return;
      answer(q.check(x), x);
    } }]);
    const n = $('#numIn'); if (n) n.oninput = () => { $('#bar .primary').disabled = !n.value; };
    if (n) $('#bar .primary').disabled = true;
  } else if (fb.key === 'true') {
    bar([{ label: 'Next ▶', primary: true, on: next }]);
  } else {
    // Adaptive detour: misconception → back to the matching experiment, then return to this question
    bar([{ label: 'Skip', on: next }, { label: '🔬 Test it in the lab', primary: true, on: () => {
      S.v = q.fix; S.hyp = null; S.hint = 0; S.quiz.fb = null; S.quiz.detourFrom = S.quiz.i; log('detour', { q: q.id, v: q.fix }); go('detour');
    } }]);
  }
};
screens.detour = () => {
  const V = VARS[S.v];
  $('#app').innerHTML = `<p class="step">Let us check with an experiment</p>
    <h2>Test the ${V.name} again</h2>
    <div class="key">Do two runs. Change <b>only</b> the ${V.name}. Make the change big (for example ${S.v === 'L' ? '25 cm and 100 cm' : S.v === 'm' ? '50 g and 500 g' : '5° and 30°'}). Watch the Period column.</div>
    <p>Then come back and answer the question again.</p>`;
  bar([{ label: 'Back to question', on: () => go('quiz') }, { label: 'Open lab ▶', primary: true, on: () => { S.screen = 'lab'; S.returnToQuiz = true; save(); render(); } }]);
};

/* 8. Summary */
screens.summary = () => {
  const hyps = S.hypHistory.length, revised = S.log.filter((l) => l.type === 'revise').length;
  $('#app').innerHTML = `<div class="hero">${pendSvg('loop')}</div>
    <p class="step">Well done, scientist! 🎉</p>
    <h1>What we found out</h1>
    <div class="stats"><div><b>${S.quiz.score}/${QUIZ.length}</b>check-up</div><div><b>${S.runs.length}</b>runs</div><div><b>${revised}</b>guesses changed</div></div>
    <div class="ok pop">📏 <b>Longer string → longer period.</b> 4× the length → 2× the period.<br>
    ⚖️ <b>Heavier bob → same period.</b><br>📐 <b>Bigger (small) angle → same period.</b></div>
    <div class="card">You made <b>${hyps}</b> guesses and tested every one with your own data.</div>
    ${S.mis.M1 || S.mis.M2 ? `<div class="key">You started with ${[S.mis.M1 ? '“heavier swings faster”' : '', S.mis.M2 ? '“bigger swing takes longer”' : ''].filter(Boolean).join(' and ')}. Your own data changed your mind — that is real science!</div>` : ''}
    <p class="mr">Tip: show this screen to your science teacher.</p>`;
  bar([{ label: 'Start over', on: () => { if (confirm('Clear your saved work?')) { S = fresh(); save(); go('home'); } } }, { label: 'Home', primary: true, on: () => go('home') }]);
};

/* About */
screens.about = () => {
  $('#app').innerHTML = `<h1>About this app</h1>
    <div class="card"><b>Pendulum Lab</b> — an inquiry-based virtual lab for Class 9.<br>
    Made by <b>Aditya Koli</b>, roll no. <b>${ROLL}</b>, for the ET 617 end-semester exam (18 Nov 2026).</div>
    <table><tbody>
      <tr><td>Problem</td><td>P5 Virtual laboratory</td></tr>
      <tr><td>Topic</td><td>P5-T1 Simple pendulum</td></tr>
      <tr><td>Learner</td><td>L1 Rural, regional-language medium, parent's phone</td></tr>
      <tr><td>Constraint</td><td>C3 Mobile-first, one-handed</td></tr>
    </tbody></table>
    <p class="mr">The simulation solves the pendulum equation step by step (RK4). Bob mass is not in the equation — just like in nature (no air drag).</p>`;
  bar([{ label: '◀ Back', primary: true, on: () => go(S.prev || 'home') }]);
};

/* ---------- Render ---------- */
function render() {
  if (anim) { anim.stop = true; anim = null; }
  (screens[S.screen] || screens.home)();
  const app = $('#app'); app.classList.remove('enter'); void app.offsetWidth; app.classList.add('enter');
  // Progress stepper in the top bar: Learn → Guess → Test → Think → Check
  const STEP = { home: -1, about: -1, learn: 0, choose: 1, hypothesis: 1, lab: 2, detour: 2, compare: 3, quiz: 4, summary: 5 };
  const cur = STEP[S.screen] ?? -1;
  $('#steps').innerHTML = ['Learn', 'Guess', 'Test', 'Think', 'Check'].map((n, i) => `<li class="${i === cur ? 'on' : i < cur ? 'past' : ''}" title="${n}">${i === cur ? `${i + 1} · ${n}` : i < cur ? '✓' : i + 1}</li>`).join('');
}
$('#aboutLink').onclick = () => { if (S.screen !== 'about') S.prev = S.screen; go('about'); };
render(); // resumes on the saved screen
