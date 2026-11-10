const ID = 'huanling-claude-usage';
const TIP = 'huanling-claude-usage-tip';
const DIALOG = 'huanling-claude-settings';
const BACKDROP = 'huanling-claude-backdrop';
const PREFS = 'ttjl.claude-usage.v1';
const NS = 'http://www.w3.org/2000/svg';
const initial = {paused:false, eyes:true, low:20, high:50, colors:['#b3443c', '#a46b20', '#327657']};
let prefs = {...initial, colors:[...initial.colors]};

// Glasses geometry (viewBox units = CSS px).
const W = 76;
const H = 26;
const CY = 13;
const LENSES = [{cx:18}, {cx:58}];
const R = 9.2;
const GLASS = 7.4;
// The pill sits inside Claude's ~37px title bar; the glasses scale from their 26-unit drawing.
const CHIP_H = 41;
const SCALE = 33 / H;
// Rows (px from the window top) sampled to find what the title bar already shows.
const PROBE_ROWS = [8, 18, 29];
const GAP = 12;

function ready(value) {
  return value && typeof value.paused === 'boolean' && typeof value.eyes === 'boolean'
    && Number.isFinite(value.low) && Number.isFinite(value.high) && value.low >= 0 && value.low < value.high && value.high <= 100
    && Array.isArray(value.colors) && value.colors.length === 3 && value.colors.every(color => /^#[0-9a-f]{6}$/i.test(color));
}

try {
  const saved = JSON.parse(localStorage.getItem(PREFS));
  if (ready(saved)) prefs = saved;
} catch { /* keep the defaults */ }

function level(remaining) {
  if (!Number.isFinite(remaining)) return -1;
  return remaining <= prefs.low ? 0 : remaining <= prefs.high ? 1 : 2;
}

function tone(remaining) {
  const index = level(remaining);
  return index < 0 ? '' : prefs.colors[index];
}

const FONT = '-apple-system,BlinkMacSystemFont,"SF Pro Text","PingFang SC","Helvetica Neue",sans-serif';

function ensureStyle(doc) {
  if (doc.getElementById('huanling-claude-usage-style')) return;
  const style = doc.createElement('style');
  style.id = 'huanling-claude-usage-style';
  style.textContent = `
    #${ID},#${TIP},#${DIALOG}{
      --hl-ink:#2b2a27;--hl-muted:#77736a;--hl-frame:#3a3833;--hl-track:rgba(58,56,51,.14);
      --hl-sclera:#fffdf8;--hl-pupil:#23221f;--hl-glint:#fff;--hl-hover:rgba(58,56,51,.07);--hl-pill:linear-gradient(180deg,rgba(255,255,255,.72) 0%,rgba(246,246,244,.5) 55%,rgba(232,232,228,.42) 100%);--hl-pill-hover:linear-gradient(180deg,rgba(255,255,255,.85) 0%,rgba(248,248,246,.62) 55%,rgba(236,236,232,.52) 100%);--hl-rim:rgba(255,255,255,.95);--hl-rim-low:rgba(0,0,0,.07);--hl-edge:rgba(0,0,0,.11);--hl-sheen:linear-gradient(180deg,rgba(255,255,255,.75) 0%,rgba(255,255,255,0) 52%);--hl-pill-shadow:0 .5px 1px rgba(0,0,0,.1),0 2px 5px rgba(0,0,0,.06);
      --hl-card:rgba(253,252,249,.72);--hl-sheet:#fdfcf9;--hl-sheet-field:#f1efea;--hl-card-line:rgba(58,56,51,.12);--hl-shadow:0 10px 30px rgba(40,36,28,.16),0 1px 3px rgba(40,36,28,.1);
      --hl-field:rgba(58,56,51,.07);--hl-lid:#d8d2c4;--hl-lash:#8f887a;--hl-accent:#c96442;--hl-error:#b3443c;--hl-value-filter:none;
    }
    @media(prefers-color-scheme:dark){#${ID},#${TIP},#${DIALOG}{
      --hl-ink:#f1eee7;--hl-muted:#a39e93;--hl-frame:#d9d4c9;--hl-track:rgba(241,238,231,.14);
      --hl-sclera:#e9e5dc;--hl-pupil:#1f1e1c;--hl-glint:#fff;--hl-hover:rgba(241,238,231,.08);--hl-pill:linear-gradient(180deg,rgba(80,78,73,.42),rgba(30,29,27,.3));--hl-pill-hover:linear-gradient(180deg,rgba(96,93,88,.46),rgba(40,39,36,.3));--hl-rim:rgba(255,255,255,.2);--hl-rim-low:rgba(0,0,0,.35);--hl-edge:rgba(255,255,255,.12);--hl-sheen:linear-gradient(180deg,rgba(255,255,255,.16) 0%,rgba(255,255,255,0) 50%);--hl-pill-shadow:0 .5px 1px rgba(0,0,0,.4),0 2px 5px rgba(0,0,0,.3);
      --hl-card:rgba(44,43,40,.7);--hl-sheet:#2c2b28;--hl-sheet-field:#383733;--hl-card-line:rgba(241,238,231,.1);--hl-shadow:0 12px 32px rgba(0,0,0,.45),0 1px 3px rgba(0,0,0,.3);
      --hl-field:rgba(241,238,231,.08);--hl-lid:#a8a294;--hl-lash:#5d5950;--hl-accent:#d97757;--hl-error:#e0786f;--hl-value-filter:brightness(1.35) saturate(1.1);
    }}

    #${ID}{position:fixed;top:2px;left:50%;transform:translateX(-50%);z-index:2147483000;display:flex;align-items:center;gap:8px;
      height:${CHIP_H}px;padding:0 16px;box-sizing:border-box;border-radius:999px;cursor:default;-webkit-app-region:no-drag;pointer-events:auto;
      color:var(--hl-ink);font:16px/1 ${FONT};font-variant-numeric:tabular-nums;-webkit-font-smoothing:antialiased;outline:none;isolation:isolate;
      background:var(--hl-pill);-webkit-backdrop-filter:blur(20px) saturate(190%) brightness(1.04);backdrop-filter:blur(20px) saturate(190%) brightness(1.04);
      box-shadow:0 0 0 .5px var(--hl-edge),inset 0 1px 0 var(--hl-rim),inset 0 -1px 1px var(--hl-rim-low),inset 0 0 0 1px rgba(255,255,255,.35),var(--hl-pill-shadow);
      transition:background 200ms ease,box-shadow 200ms ease,opacity 200ms ease,transform 200ms cubic-bezier(.3,.7,.2,1),left 260ms cubic-bezier(.3,.7,.2,1);user-select:none;-webkit-user-select:none}
    #${ID}::before{content:"";position:absolute;inset:1px 1px 50% 1px;border-radius:999px 999px 40% 40% / 999px 999px 100% 100%;
      background:var(--hl-sheen);pointer-events:none;z-index:-1;opacity:.9}
    #${ID}:hover{background:var(--hl-pill-hover)}
    #${ID}[data-placed]{transform:none}
    #${ID}[data-fit=compact] .hl-kind{display:none}
    #${ID}[data-fit=mini]{padding:0 8px}
    #${ID}[data-fit=mini] .hl-read,#${ID}[data-fit=none] .hl-read{display:none}
    #${ID}[data-fit=none]{visibility:hidden;pointer-events:none}
    #${ID}:active{transform:translateX(-50%) scale(.98)}
    #${ID}[data-placed]:active{transform:scale(.97)}
    #${ID}:focus-visible{box-shadow:0 0 0 .5px var(--hl-edge),inset 0 1px 0 var(--hl-rim),0 0 0 3px var(--hl-accent),var(--hl-pill-shadow)}
    #${ID}[data-stale]{opacity:.55}
    #${ID} .hl-read{display:flex;align-items:baseline;gap:3px;min-width:52px;white-space:nowrap}
    #${ID} .hl-read:first-child{justify-content:flex-end}
    #${ID} .hl-kind{font-size:13px;font-weight:500;color:var(--hl-muted)}
    #${ID} .hl-num{font-size:16px;font-weight:650;letter-spacing:-.01em}
    #${ID} svg{display:block;flex:none;width:${Math.round(W * SCALE)}px;height:${Math.round(H * SCALE)}px;overflow:visible}
    #${ID} .hl-eye{transform-box:fill-box;transform-origin:center;animation:hl-look 5.2s ease-in-out infinite}
    #${ID} .hl-lid{transform-box:fill-box;transform-origin:center;animation:hl-blink 5.2s ease-in-out infinite}
    #${ID} .hl-lens:last-of-type .hl-eye,#${ID} .hl-lens:last-of-type .hl-lid{animation-delay:.09s}
    #${ID} .hl-value{transition:stroke-dashoffset 420ms cubic-bezier(.3,.7,.2,1),stroke 300ms ease;filter:var(--hl-value-filter)}
    #${ID} .hl-lens[data-mood=tired] .hl-droop{opacity:1}
    #${ID} .hl-droop{opacity:0;transition:opacity 300ms ease}
    #${ID}[data-still] .hl-eye,#${ID}[data-still] .hl-lid{animation:none}
    @keyframes hl-look{0%,10%{transform:translate(0,0)}18%,30%{transform:translate(1.4px,-.5px)}38%,48%{transform:translate(.3px,.9px)}56%,68%{transform:translate(-1.4px,.2px)}76%,88%{transform:translate(-.3px,-.7px)}100%{transform:translate(0,0)}}
    @keyframes hl-blink{0%,40%,44.5%,80%,84.5%,100%{transform:scaleY(1)}42%,82%{transform:scaleY(.1)}}

    #${TIP}{position:fixed;z-index:2147483001;min-width:188px;padding:10px 12px;box-sizing:border-box;border-radius:12px;
      background:var(--hl-sheet);border:.5px solid var(--hl-card-line);box-shadow:var(--hl-shadow);color:var(--hl-ink);
      font:12px/1.35 ${FONT};font-variant-numeric:tabular-nums;pointer-events:none;
      opacity:0;transform:translate(-50%,-4px);transition:opacity 140ms ease,transform 140ms ease}
    #${TIP}[data-open]{opacity:1;transform:translate(-50%,0)}
    #${TIP}[hidden]{display:none}
    #${TIP} .hl-row{display:grid;grid-template-columns:8px 1fr auto;align-items:center;column-gap:8px;padding:3px 0}
    #${TIP} .hl-dot{width:8px;height:8px;border-radius:50%;background:var(--hl-track)}
    #${TIP} .hl-name{font-weight:500}
    #${TIP} .hl-pct{font-weight:650}
    #${TIP} .hl-when{grid-column:2/4;color:var(--hl-muted);font-size:11px}
    #${TIP} .hl-foot{margin-top:6px;padding-top:6px;border-top:.5px solid var(--hl-card-line);color:var(--hl-muted);font-size:11px}

    #${BACKDROP}{position:fixed;inset:0;z-index:2147483645;background:rgba(20,18,15,.22);-webkit-backdrop-filter:blur(2px);backdrop-filter:blur(2px)}
    #${BACKDROP}[hidden],#${DIALOG}[hidden]{display:none!important}
    #${DIALOG}{position:fixed;z-index:2147483646;top:50%;left:50%;transform:translate(-50%,-50%);width:min(360px,calc(100vw - 32px));
      box-sizing:border-box;margin:0;padding:20px;border-radius:16px;background:var(--hl-sheet);border:.5px solid var(--hl-card-line);
      box-shadow:0 24px 64px rgba(0,0,0,.24),0 2px 6px rgba(0,0,0,.08);color:var(--hl-ink);font:13px/1.4 ${FONT};
      -webkit-backdrop-filter:none;backdrop-filter:none}
    #${DIALOG}:focus{outline:none}
    #${DIALOG} *{box-sizing:border-box}
    #${DIALOG} header{margin:0 0 14px}
    #${DIALOG} h2{margin:0;font-size:15px;font-weight:650;letter-spacing:-.01em}
    #${DIALOG} header p{margin:2px 0 0;color:var(--hl-muted);font-size:12px}
    #${DIALOG} .hl-group{border-radius:10px;background:var(--hl-sheet-field);padding:0 12px;margin:0 0 12px}
    #${DIALOG} .hl-group-title{margin:0 0 6px 2px;color:var(--hl-muted);font-size:11px;font-weight:500}
    #${DIALOG} label.hl-line{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:40px;margin:0}
    #${DIALOG} label.hl-line+label.hl-line{border-top:.5px solid var(--hl-card-line)}
    #${DIALOG} input[type=checkbox]{appearance:none;-webkit-appearance:none;position:relative;flex:none;width:32px;height:19px;margin:0;border-radius:999px;
      background:rgba(120,116,106,.32);cursor:pointer;transition:background-color 160ms ease}
    #${DIALOG} input[type=checkbox]::after{content:"";position:absolute;top:2px;left:2px;width:15px;height:15px;border-radius:50%;background:#fff;
      box-shadow:0 1px 2px rgba(0,0,0,.25);transition:transform 160ms ease}
    #${DIALOG} input[type=checkbox]:checked{background:var(--hl-accent)}
    #${DIALOG} input[type=checkbox]:checked::after{transform:translateX(13px)}
    #${DIALOG} .hl-num-field{display:flex;align-items:center;gap:4px;color:var(--hl-muted)}
    #${DIALOG} input[type=number]{width:52px;height:26px;padding:0 8px;border:.5px solid var(--hl-card-line);border-radius:7px;background:var(--hl-sheet);
      color:var(--hl-ink);text-align:right;font:inherit;font-variant-numeric:tabular-nums;outline:none;-moz-appearance:textfield}
    #${DIALOG} input[type=number]::-webkit-inner-spin-button,#${DIALOG} input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}
    #${DIALOG} input:focus-visible{box-shadow:0 0 0 2px var(--hl-accent)}
    #${DIALOG} .hl-swatches{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:12px 0}
    #${DIALOG} .hl-swatch{display:flex;flex-direction:column;align-items:center;gap:6px;margin:0;font-size:11px;color:var(--hl-muted);cursor:pointer}
    #${DIALOG} input[type=color]{width:28px;height:28px;padding:0;border:0;border-radius:50%;background:none;cursor:pointer;
      box-shadow:0 0 0 .5px var(--hl-card-line),0 1px 2px rgba(0,0,0,.12)}
    #${DIALOG} input[type=color]::-webkit-color-swatch-wrapper{padding:0}
    #${DIALOG} input[type=color]::-webkit-color-swatch{border:0;border-radius:50%}
    #${DIALOG} .hl-error{min-height:0;margin:0 0 12px;color:var(--hl-error);font-size:12px}
    #${DIALOG} .hl-actions{display:flex;align-items:center;gap:8px}
    #${DIALOG} .hl-actions span{flex:1}
    #${DIALOG} button{min-height:30px;padding:0 14px;border:0;border-radius:8px;font:500 13px/1 ${FONT};cursor:pointer;
      background:var(--hl-field);color:var(--hl-ink)}
    #${DIALOG} button.hl-reset{padding:0 4px;background:none;color:var(--hl-muted)}
    #${DIALOG} button.hl-reset:hover{color:var(--hl-ink)}
    #${DIALOG} button[type=submit]{background:var(--hl-accent);color:#fff}
    #${DIALOG} button:focus-visible{outline:none;box-shadow:0 0 0 2px var(--hl-sheet),0 0 0 4px var(--hl-accent)}

    @media(prefers-reduced-motion:reduce){#${ID} .hl-eye,#${ID} .hl-lid{animation:none}#${ID} .hl-value,#${TIP}{transition:none}}
  `;
  (doc.head || doc.documentElement).append(style);
}

function svg(doc, tag, attrs = {}, paint = {}) {
  const element = doc.createElementNS(NS, tag);
  for (const [key, value] of Object.entries(attrs)) element.setAttribute(key, value);
  // Host pages style bare SVG shapes; pin the paint so the glasses always render as drawn.
  for (const [key, value] of Object.entries(paint)) element.style.setProperty(key, value, 'important');
  return element;
}

function buildLens(doc, index) {
  const {cx} = LENSES[index];
  const lens = svg(doc, 'g', {class:'hl-lens'});
  const clipId = `hl-clip-${index}`;
  const clip = svg(doc, 'clipPath', {id:clipId});
  clip.append(svg(doc, 'circle', {cx, cy:CY, r:GLASS}));
  const defs = svg(doc, 'defs');
  defs.append(clip);

  const glass = svg(doc, 'circle', {class:'hl-glass', cx, cy:CY, r:GLASS + .6}, {fill:'var(--hl-sclera)', stroke:'none'});
  const inside = svg(doc, 'g', {'clip-path':`url(#${clipId})`});
  const eye = svg(doc, 'g', {class:'hl-eye'});
  const lid = svg(doc, 'g', {class:'hl-lid'});
  lid.append(
    svg(doc, 'ellipse', {class:'hl-pupil', cx, cy:CY + .3, rx:2.9, ry:3.7}, {fill:'var(--hl-pupil)', stroke:'none'}),
    svg(doc, 'circle', {cx:cx - 1, cy:CY - 1.1, r:1.05}, {fill:'var(--hl-glint)', stroke:'none'})
  );
  eye.append(lid);
  // A heavy upper lid that drops in when this window is running low.
  const lidPath = `M${cx - GLASS - 1} ${CY - 9} H${cx + GLASS + 1} V${CY - 2.4} Q${cx} ${CY + .6} ${cx - GLASS - 1} ${CY - 2.4} Z`;
  const droop = svg(doc, 'g', {class:'hl-droop'});
  droop.append(
    svg(doc, 'path', {d:lidPath}, {fill:'var(--hl-lid)', stroke:'none'}),
    svg(doc, 'path', {d:`M${cx - GLASS - 1} ${CY - 2.4} Q${cx} ${CY + .6} ${cx + GLASS + 1} ${CY - 2.4}`},
      {fill:'none', stroke:'var(--hl-lash)', 'stroke-width':'1', 'stroke-linecap':'round'})
  );
  // Closed eye shown when there is no data.
  const closed = svg(doc, 'path', {class:'hl-closed', d:`M${cx - 3.4} ${CY - .4} Q${cx} ${CY + 2.6} ${cx + 3.4} ${CY - .4}`},
    {fill:'none', stroke:'var(--hl-pupil)', 'stroke-width':'1.4', 'stroke-linecap':'round', display:'none'});
  inside.append(eye, droop);

  const track = svg(doc, 'circle', {class:'hl-track', cx, cy:CY, r:R}, {fill:'none', stroke:'var(--hl-track)', 'stroke-width':'3'});
  const value = svg(doc, 'circle', {class:'hl-value', cx, cy:CY, r:R, pathLength:'100', transform:`rotate(-90 ${cx} ${CY})`},
    {fill:'none', stroke:'none', 'stroke-width':'3', 'stroke-linecap':'round', 'stroke-dasharray':'100 100', 'stroke-dashoffset':'100'});
  lens.append(defs, glass, inside, closed, track, value);
  return lens;
}

function buildGlasses(doc) {
  const root = svg(doc, 'svg', {viewBox:`0 0 ${W} ${H}`, 'aria-hidden':'true', focusable:'false'});
  const frame = {fill:'none', stroke:'var(--hl-frame)', 'stroke-width':'1.6', 'stroke-linecap':'round'};
  const outer = R + 1.5;
  const [a, b] = LENSES;
  root.append(
    // Temples tucked behind the outer edge of each lens.
    svg(doc, 'path', {class:'hl-frame', d:`M1 ${CY - 3.2} L${a.cx - outer + .6} ${CY - 2.6}`}, frame),
    svg(doc, 'path', {class:'hl-frame', d:`M${W - 1} ${CY - 3.2} L${b.cx + outer - .6} ${CY - 2.6}`}, frame),
    // Arched nose bridge.
    svg(doc, 'path', {class:'hl-frame', d:`M${a.cx + outer - .4} ${CY - 2} Q${(a.cx + b.cx) / 2} ${CY - 7.5} ${b.cx - outer + .4} ${CY - 2}`}, frame),
    buildLens(doc, 0),
    buildLens(doc, 1)
  );
  return root;
}

function readout(doc) {
  const box = doc.createElement('span');
  box.className = 'hl-read';
  const kind = doc.createElement('span');
  kind.className = 'hl-kind';
  const num = doc.createElement('span');
  num.className = 'hl-num';
  box.append(kind, num);
  return box;
}

function paintLens(lens, item) {
  const value = lens.querySelector('.hl-value');
  const known = Number.isFinite(item?.remaining);
  const eye = lens.querySelector('.hl-eye');
  const droop = lens.querySelector('.hl-droop');
  const closed = lens.querySelector('.hl-closed');
  const showEye = prefs.eyes && known;
  eye.style.setProperty('display', showEye ? 'inline' : 'none', 'important');
  droop.style.setProperty('display', showEye ? 'inline' : 'none', 'important');
  closed.style.setProperty('display', prefs.eyes && !known ? 'inline' : 'none', 'important');
  if (!known) {
    value.style.setProperty('stroke', 'none', 'important');
    value.style.setProperty('stroke-dashoffset', '100', 'important');
    delete lens.dataset.mood;
    return;
  }
  // Keep a visible sliver at 0–1% so a nearly empty ring still reads as "red", not "missing".
  const shown = item.remaining <= 0 ? 0 : Math.max(2, item.remaining);
  value.style.setProperty('stroke', tone(item.remaining), 'important');
  value.style.setProperty('stroke-dashoffset', String(100 - shown), 'important');
  value.style.setProperty('opacity', shown === 0 ? '0' : '1', 'important');
  if (level(item.remaining) === 0) lens.dataset.mood = 'tired';
  else delete lens.dataset.mood;
}

function resets(detail) {
  const lines = String(detail || '').split('\n');
  const find = prefix => lines.find(line => line.startsWith(prefix))?.slice(prefix.length).trim() || '';
  return [find('5小时重置'), find('每周重置')];
}

function renderTip(doc, tip, view) {
  tip.replaceChildren();
  const when = resets(view?.detail);
  const rows = [[view?.fiveHour, '5 小时', when[0]], [view?.week, '本周', when[1]]];
  for (const [item, name, at] of rows) {
    const row = doc.createElement('div');
    row.className = 'hl-row';
    const dot = doc.createElement('i');
    dot.className = 'hl-dot';
    if (Number.isFinite(item?.remaining)) dot.style.background = tone(item.remaining);
    const label = doc.createElement('span');
    label.className = 'hl-name';
    label.textContent = name;
    const pct = doc.createElement('span');
    pct.className = 'hl-pct';
    pct.textContent = Number.isFinite(item?.remaining) ? `剩 ${item.remaining}%` : '—';
    row.append(dot, label, pct);
    if (at) {
      const sub = doc.createElement('span');
      sub.className = 'hl-when';
      sub.textContent = `${at} 重置`;
      row.append(sub);
    }
    tip.append(row);
  }
  const foot = doc.createElement('div');
  foot.className = 'hl-foot';
  foot.textContent = view?.status !== 'ready' ? '暂时读不到 Claude 用量' : view?.stale ? '数据已过期，等待刷新' : '点击打开设置';
  tip.append(foot);
}

function placeTip(chip, tip) {
  const rect = chip.getBoundingClientRect();
  tip.style.top = `${Math.round(rect.bottom + 10)}px`;
  tip.style.left = `${Math.round(rect.left + rect.width / 2)}px`;
}

function el(doc, tag, props = {}, ...children) {
  const element = doc.createElement(tag);
  Object.assign(element, props);
  element.append(...children);
  return element;
}

function openSettings(doc, chip) {
  let dialog = doc.getElementById(DIALOG);
  let backdrop = doc.getElementById(BACKDROP);
  if (!dialog) {
    backdrop = el(doc, 'div', {id:BACKDROP});
    dialog = el(doc, 'form', {id:DIALOG, tabIndex:-1});
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-label', '环灵设置');
    doc.body.append(backdrop, dialog);
  }
  const tip = doc.getElementById(TIP);
  if (tip) { delete tip.dataset.open; tip.hidden = true; }

  const toggle = checked => el(doc, 'input', {type:'checkbox', checked});
  const number = (value, min, max) => el(doc, 'input', {type:'number', min:String(min), max:String(max), step:'1', value:String(value)});
  const eyes = toggle(prefs.eyes);
  const paused = toggle(prefs.paused);
  const low = number(prefs.low, 0, 99);
  const high = number(prefs.high, 1, 100);
  const colors = prefs.colors.map(value => el(doc, 'input', {type:'color', value}));
  const line = (text, control) => el(doc, 'label', {className:'hl-line'}, el(doc, 'span', {textContent:text}), control);
  const pctField = input => el(doc, 'span', {className:'hl-num-field'}, '≤', input, '%');
  const group = (title, ...rows) => [el(doc, 'p', {className:'hl-group-title', textContent:title}), el(doc, 'div', {className:'hl-group'}, ...rows)];
  const swatches = el(doc, 'div', {className:'hl-swatches'},
    ...['偏低', '注意', '充足'].map((text, index) => el(doc, 'label', {className:'hl-swatch'}, colors[index], text)));

  const error = el(doc, 'p', {className:'hl-error'});
  const reset = el(doc, 'button', {type:'button', className:'hl-reset', textContent:'恢复默认'});
  const cancel = el(doc, 'button', {type:'button', textContent:'取消'});
  const save = el(doc, 'button', {type:'submit', textContent:'完成'});

  dialog.replaceChildren(
    el(doc, 'header', {}, el(doc, 'h2', {textContent:'环灵'}), el(doc, 'p', {textContent:'Claude 用量眼镜'})),
    ...group('外观', line('显示眼睛', eyes), line('暂停动画', paused)),
    ...group('颜色分档（按剩余额度）', line('偏低', pctField(low)), line('注意', pctField(high)), swatches),
    error,
    el(doc, 'div', {className:'hl-actions'}, reset, el(doc, 'span'), cancel, save)
  );

  const restore = doc.activeElement;
  const close = () => {
    dialog.hidden = true;
    backdrop.hidden = true;
    doc.removeEventListener('keydown', onKey, true);
    if (restore && typeof restore.focus === 'function') restore.focus();
  };
  const onKey = event => { if (event.key === 'Escape') { event.preventDefault(); close(); } };
  doc.addEventListener('keydown', onKey, true);
  backdrop.onpointerdown = close;
  cancel.onclick = close;
  reset.onclick = () => {
    eyes.checked = initial.eyes;
    paused.checked = initial.paused;
    low.value = String(initial.low);
    high.value = String(initial.high);
    colors.forEach((input, index) => { input.value = initial.colors[index]; });
    error.textContent = '';
  };
  dialog.onsubmit = event => {
    event.preventDefault();
    const next = {paused:paused.checked, eyes:eyes.checked, low:low.valueAsNumber, high:high.valueAsNumber, colors:colors.map(input => input.value)};
    if (!ready(next)) { error.textContent = '需要满足 0 ≤ 偏低 < 注意 ≤ 100'; return; }
    try { localStorage.setItem(PREFS, JSON.stringify(next)); } catch { error.textContent = '本机存储不可用，设置未保存'; return; }
    prefs = next;
    close();
    mountClaudeUsageChip(doc, chip.__huanlingView || {});
  };
  dialog.hidden = false;
  backdrop.hidden = false;
  dialog.focus();
}


const INTERACTIVE = 'button,a,input,select,textarea,[role=button],[role=tab],[role=menuitem],[role=combobox],[role=link],svg,img,video,canvas';

// True when the title bar shows something at (x, y): a control, an icon, or actual glyphs of text.
function busyAt(doc, x, y, wide) {
  const el = doc.elementFromPoint(x, y);
  if (!el || el === doc.documentElement || el === doc.body) return false;
  if (el.closest(`#${TIP},#${DIALOG},#${BACKDROP}`)) return false;
  const control = el.closest(INTERACTIVE);
  if (control) {
    const box = control.getBoundingClientRect();
    if (box.width < wide) return true;
  }
  const range = doc.createRange();
  for (const node of el.childNodes) {
    if (node.nodeType !== 3 || !node.textContent.trim()) continue;
    range.selectNodeContents(node);
    for (const r of range.getClientRects()) {
      if (x >= r.left - 6 && x <= r.right + 6 && y >= r.top - 4 && y <= r.bottom + 4) return true;
    }
  }
  return false;
}

// Slide the pill into the widest free stretch of the title bar, as close to the middle as it fits.
function placeChip(doc, chip) {
  const win = doc.defaultView;
  const dialog = doc.getElementById(DIALOG);
  if (!win || (dialog && !dialog.hidden) || doc.visibilityState === 'hidden') return;
  const total = win.innerWidth;
  if (!total) return;
  const step = 6;
  const busy = [];
  const before = chip.style.visibility;
  chip.style.visibility = 'hidden';
  try {
    for (let x = 0; x < total; x += step) busy.push(PROBE_ROWS.some(y => busyAt(doc, x, y, total * .6)));
  } finally {
    chip.style.visibility = before;
  }
  const gaps = [];
  let start = null;
  busy.forEach((taken, index) => {
    if (!taken && start === null) start = index * step;
    if (taken && start !== null) { gaps.push([start, index * step]); start = null; }
  });
  if (start !== null) gaps.push([start, total]);
  const middle = total / 2;
  // Full readout first; then drop the 5h/周 labels; then glasses only (numbers stay in the hover card).
  for (const fit of ['', 'compact', 'mini']) {
    if (fit) chip.dataset.fit = fit;
    else delete chip.dataset.fit;
    const width = chip.offsetWidth;
    let best = null;
    for (const [from, to] of gaps) {
      // Stay out of the sidebar's corner: the pill belongs over the conversation, near the middle.
      const lo = Math.max(from + GAP, total * .3);
      const hi = to - GAP - width;
      if (hi < lo) continue;
      const left = Math.min(hi, Math.max(lo, middle - width / 2));
      const miss = Math.abs(left + width / 2 - middle);
      if (!best || miss < best.miss) best = {left, miss};
    }
    if (best) {
      chip.dataset.placed = '';
      chip.style.left = `${Math.round(best.left)}px`;
      return;
    }
  }
  // Nowhere to sit without covering the title: step aside until there is room.
  chip.dataset.fit = 'none';
}

export function mountClaudeUsageChip(doc, view) {
  ensureStyle(doc);
  let chip = doc.getElementById(ID);
  if (!chip) {
    chip = doc.createElement('div');
    chip.id = ID;
    chip.tabIndex = 0;
    chip.setAttribute('role', 'button');
    chip.append(readout(doc), buildGlasses(doc), readout(doc));
    const tip = doc.createElement('div');
    tip.id = TIP;
    tip.hidden = true;
    tip.setAttribute('role', 'tooltip');
    doc.body.append(chip, tip);
    const show = () => {
      const dialog = doc.getElementById(DIALOG);
      if (dialog && !dialog.hidden) return;
      tip.hidden = false;
      placeTip(chip, tip);
      requestAnimationFrame(() => { tip.dataset.open = ''; });
    };
    const hide = () => { delete tip.dataset.open; tip.hidden = true; };
    chip.addEventListener('pointerdown', event => { if (event.button === 0) { hide(); openSettings(doc, chip); } });
    chip.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); hide(); openSettings(doc, chip); }
    });
    chip.addEventListener('mouseenter', show);
    chip.addEventListener('mouseleave', hide);
    chip.addEventListener('focus', show);
    chip.addEventListener('blur', hide);
    const win = doc.defaultView;
    let queued = false;
    const reflow = () => {
      if (queued) return;
      queued = true;
      win.requestAnimationFrame(() => { queued = false; placeChip(doc, chip); });
    };
    win.addEventListener('resize', reflow);
    // Titles change as you switch chats; re-check the free space now and then.
    win.setInterval(reflow, 1500);
    chip.__huanlingReflow = reflow;
  }

  const parts = [view?.fiveHour, view?.week];
  const kinds = ['5h', '周'];
  const reads = chip.querySelectorAll('.hl-read');
  const lenses = chip.querySelectorAll('.hl-lens');
  parts.forEach((part, index) => {
    const item = part || {remaining:null, text:''};
    reads[index].querySelector('.hl-kind').textContent = item.kind || kinds[index];
    reads[index].querySelector('.hl-num').textContent = item.text || '—';
    paintLens(lenses[index], item);
  });

  chip.__huanlingView = view;
  if (view?.stale) chip.dataset.stale = '';
  else delete chip.dataset.stale;
  const detail = view?.detail || '';
  chip.setAttribute('aria-label', detail ? `Claude 用量：${detail.replaceAll('\n', '，')}` : 'Claude 用量：暂无数据');
  if (prefs.paused || matchMedia('(prefers-reduced-motion: reduce)').matches) chip.dataset.still = '1';
  else delete chip.dataset.still;
  const tip = doc.getElementById(TIP);
  if (tip) renderTip(doc, tip, view);
  chip.__huanlingReflow?.();
  return chip;
}
