import {billingView, clampTip, normalizeCursorBilling} from './huanling-billing-logic.js';

const ID = 'cursor-billing-chip';
const SUMMARY = 'http://127.0.0.1:39231/usage-summary';
const UNINSTALL = 'http://127.0.0.1:39231/uninstall';
const PREFS = 'ttjl.cursor-billing.v1';
const initial = {visible:false, paused:false, pet:'', eyes:true, face:'#f3f6fb', low:20, high:50, colors:['#b3443c', '#a46b20', '#327657']};
let view = {label:'读取中', detail:'正在读取 Cursor 账单', percent:null};
let scanTimer = 0;
let refreshTimer = 0;
let retired = false;
let prefs = structuredClone(initial);

function ready(value) {
  return value && typeof value.visible === 'boolean' && typeof value.paused === 'boolean' && typeof value.pet === 'string'
    && (!value.pet || /^data:image\/(png|jpeg|webp|gif);base64,/.test(value.pet))
    && Number.isFinite(value.low) && Number.isFinite(value.high) && value.low >= 0 && value.low < value.high && value.high <= 100
    && Array.isArray(value.colors) && value.colors.length === 3 && value.colors.every(color => /^#[0-9a-f]{6}$/i.test(color))
    && typeof value.eyes === 'boolean' && /^#[0-9a-f]{6}$/i.test(value.face || '');
}

try {
  const saved = JSON.parse(localStorage.getItem(PREFS));
  if (ready(saved)) prefs = saved;
} catch { /* keep the defaults */ }

function ensureStyle() {
  if (document.getElementById('cursor-billing-style')) return;
  const style = document.createElement('style');
  style.id = 'cursor-billing-style';
  style.textContent = `
    #${ID}{position:fixed;top:4px;left:50%;transform:translateX(-50%);z-index:100000;display:flex;align-items:center;gap:8px;height:36px;padding:4px 12px 4px 6px;box-sizing:border-box;border:1px solid rgba(255,255,255,.7);border-radius:22px;background:rgba(255,255,255,.42);color:#1d1d1f;box-shadow:0 10px 24px rgba(0,0,0,.12),inset 0 1px 0 rgba(255,255,255,.8);backdrop-filter:blur(18px) saturate(160%);-webkit-backdrop-filter:blur(18px) saturate(160%);pointer-events:auto;-webkit-app-region:no-drag;font:700 12px/16px -apple-system,BlinkMacSystemFont,"SF Pro Text",sans-serif;font-variant-numeric:tabular-nums}
    #${ID} .usage-primary{position:relative;width:28px;height:28px;flex:none}
    #${ID} .usage-ring{display:block;width:28px;height:28px}
    #${ID} .usage-ring circle{fill:none;stroke-width:6.6}
    #${ID} .usage-ring-track{stroke:rgba(60,60,67,.18)}
    #${ID} .usage-ring circle.usage-ring-value{stroke-width:7.2;stroke-linecap:round;transform:rotate(-90deg);transform-origin:18px 18px;stroke-dasharray:100;transition:stroke-dashoffset 240ms ease}
    #${ID} .usage-figure{letter-spacing:-.03em;white-space:nowrap}
    #${ID} .ttjl-face{position:absolute;z-index:1;left:50%;top:50%;width:18px;height:18px;display:flex;align-items:center;justify-content:center;gap:3px;overflow:hidden;border-radius:50%;transform:translate(-50%,-50%);pointer-events:none}
    #${ID} .ttjl-face[hidden]{display:none!important}
    #${ID} .ttjl-eye{position:relative;width:4px;height:7px;animation:ttjl-look 4.6s ease-in-out infinite}
    #${ID} .ttjl-eye i{display:block;width:100%;height:100%;border-radius:3px;background:var(--ttjl-ink,#1c1c1e);transform-origin:center;animation:ttjl-blink 4.8s ease-in-out infinite;position:relative}
    #${ID} .ttjl-eye i::after{content:"";position:absolute;top:1px;left:1px;width:1.5px;height:1.5px;border-radius:50%;background:var(--ttjl-shine,#fff)}
    #${ID} .ttjl-eye:nth-child(2){animation-duration:5.1s;animation-delay:.18s}
    #${ID} .ttjl-eye:nth-child(2) i{animation-delay:.12s}
    #${ID} .ttjl-face.ttjl-still .ttjl-eye,#${ID} .ttjl-face.ttjl-still .ttjl-eye i{animation:none}
    @keyframes ttjl-look{0%,8%{transform:translate(0,0)}16%,26%{transform:translate(1.5px,-.7px)}34%,42%{transform:translate(.5px,1px)}50%,60%{transform:translate(-1.6px,.2px)}68%,78%{transform:translate(-.6px,-1px)}86%,94%{transform:translate(1.2px,.6px)}100%{transform:translate(0,0)}}
    @keyframes ttjl-blink{0%,16%,22%,48%,54%,100%{transform:scaleY(1)}19%,51%{transform:scaleY(.08)}}
    #${ID} .ttjl-pet{position:relative;width:22px;height:22px;margin:0;padding:0;display:flex;align-items:center;justify-content:center;border:0;border-radius:11px;background:#d7e2ee;color:#1d1d1f;font-size:14px;line-height:1;cursor:pointer;flex:none;overflow:hidden}
    #${ID} .ttjl-pet[hidden]{display:none!important}
    #${ID} .ttjl-pet img{width:100%;height:100%;object-fit:cover}
    #cursor-billing-tip{display:none;position:fixed;z-index:100001;box-sizing:border-box;overflow:auto;white-space:pre-wrap;border:1px solid rgba(255,255,255,.66);border-radius:18px;background:rgba(255,255,255,.62);color:#1c1c1e;box-shadow:0 18px 50px rgba(0,0,0,.18),inset 0 1px 0 rgba(255,255,255,.8);backdrop-filter:blur(28px) saturate(180%);-webkit-backdrop-filter:blur(28px) saturate(180%);padding:10px 12px;font:12px/18px -apple-system,BlinkMacSystemFont,"SF Pro Text",sans-serif}
    .ttjl-menu,.ttjl-settings{color-scheme:light dark;font:13px/1.4 -apple-system,BlinkMacSystemFont,"SF Pro Text",sans-serif;-webkit-app-region:no-drag}
    .ttjl-menu{position:fixed;z-index:2147483500;width:210px;padding:6px;border:1px solid rgba(255,255,255,.62);border-radius:22px;background:rgba(255,255,255,.62);color:#1c1c1e;box-shadow:0 18px 50px rgba(0,0,0,.18),inset 0 1px 0 rgba(255,255,255,.8);backdrop-filter:blur(28px) saturate(180%);-webkit-backdrop-filter:blur(28px) saturate(180%)}
    .ttjl-menu button{display:block;width:100%;text-align:left;border:0;background:transparent;color:inherit;min-height:44px;padding:8px 14px;border-radius:16px;cursor:pointer}
    .ttjl-menu button:hover,.ttjl-menu button:focus{background:rgba(120,120,128,.16)}
    .ttjl-settings{position:fixed!important;inset:auto!important;top:50%!important;left:50%!important;right:auto!important;bottom:auto!important;transform:translate(-50%,-50%)!important;margin:0!important;box-sizing:border-box!important;width:min(560px,calc(100vw - 40px),calc(100dvh - 40px))!important;height:min(560px,calc(100vw - 40px),calc(100dvh - 40px))!important;max-width:none!important;max-height:none!important;aspect-ratio:1!important;overflow:hidden;padding:22px!important;border:1px solid rgba(255,255,255,.66)!important;border-radius:32px!important;background:rgba(255,255,255,.58)!important;color:#1c1c1e!important;box-shadow:0 30px 80px rgba(0,0,0,.22),inset 0 1px 0 rgba(255,255,255,.85)!important;backdrop-filter:blur(40px) saturate(180%);-webkit-backdrop-filter:blur(40px) saturate(180%)}
    .ttjl-settings form{display:flex;flex-direction:column;height:100%;min-height:0;margin:0}
    .ttjl-sheet{flex:1;min-height:0;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:12px}
    .ttjl-settings::backdrop{background:rgba(18,18,20,.28);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px)}
    .ttjl-settings h2{margin:2px 8px 14px;font-size:22px;line-height:1.15;font-weight:680;letter-spacing:-.03em}
    .ttjl-group{margin:0;padding:4px;border-radius:22px;background:rgba(255,255,255,.42);box-shadow:inset 0 0 0 1px rgba(255,255,255,.45);min-height:0;overflow:auto}
    .ttjl-row{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:46px;margin:0;padding:6px 12px;border-radius:18px}
    .ttjl-row+.ttjl-row{box-shadow:inset 0 1px 0 rgba(60,60,67,.12)}
    .ttjl-note{margin:0;padding:8px 12px 4px;color:rgba(60,60,67,.72);font-size:12px;line-height:1.45}
    .ttjl-settings input[type=checkbox]{appearance:none;width:51px;height:31px;margin:0;flex:none;border:0;border-radius:999px;background:rgba(120,120,128,.32);position:relative;cursor:pointer}
    .ttjl-settings input[type=checkbox]::before{content:"";position:absolute;top:2px;left:2px;width:27px;height:27px;border-radius:50%;background:#fff;box-shadow:0 2px 6px rgba(0,0,0,.24);transition:transform .2s ease}
    .ttjl-settings input[type=checkbox]:checked{background:#30d158}
    .ttjl-settings input[type=checkbox]:checked::before{transform:translateX(20px)}
    .ttjl-settings input[type=number]{width:76px;height:32px;padding:0 10px;border:0;border-radius:12px;background:rgba(120,120,128,.12);color:inherit;font:inherit;text-align:right}
    .ttjl-settings input[type=file]{display:block;width:calc(100% - 8px);margin:4px;font:inherit}
    .ttjl-settings input[type=file]::file-selector-button{margin-right:10px;border:0;border-radius:999px;padding:8px 14px;background:rgba(120,120,128,.16);color:inherit;font:inherit;cursor:pointer}
    .ttjl-settings input[type=color]{width:34px;height:34px;padding:0;border:0;border-radius:12px;background:transparent;overflow:hidden;cursor:pointer}
    .ttjl-settings input[type=color]::-webkit-color-swatch-wrapper{padding:0}
    .ttjl-settings input[type=color]::-webkit-color-swatch{border:1px solid rgba(60,60,67,.35);border-radius:12px}
    .ttjl-settings button{min-height:40px;padding:8px 16px;border:0;border-radius:999px;background:rgba(120,120,128,.16);color:inherit;font:inherit;cursor:pointer}
    .ttjl-wells{display:flex;gap:8px;flex:none}
    .ttjl-group>button{margin:2px 8px 8px}
    .ttjl-actions{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:4px 4px 0}
    .ttjl-action-end{display:flex;gap:8px;margin-left:auto}
    .ttjl-settings button.ttjl-uninstall{background:transparent;color:#d70015}
    .ttjl-actions button[type=submit]{background:#0a84ff;color:#fff;font-weight:650}
    .ttjl-error{min-height:1.2em;margin:0 8px 8px;color:#d70015;font-size:12px}
    .ttjl-settings :focus-visible,.ttjl-menu :focus-visible{outline:2px solid #0a84ff;outline-offset:2px}
    .ttjl-menu[hidden],.ttjl-settings[hidden],.ttjl-backdrop[hidden]{display:none!important}
    .ttjl-backdrop{position:fixed;inset:0;z-index:2147483590;background:rgba(18,18,20,.28);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px)}
    .ttjl-settings:not([hidden]){display:flex;z-index:2147483600}
    body.vs-dark #${ID},body.hc-black #${ID},html[data-theme="dark"] #${ID}{background:rgba(38,38,42,.5);border-color:rgba(255,255,255,.2);color:#f5f5f7;box-shadow:0 10px 24px rgba(0,0,0,.32),inset 0 1px 0 rgba(255,255,255,.16)}
    body.vs-dark #${ID} .usage-ring-track,body.hc-black #${ID} .usage-ring-track{stroke:rgba(255,255,255,.16)}
    body.vs-dark #${ID} .ttjl-pet,body.hc-black #${ID} .ttjl-pet{background:#3a3d44;color:#f5f5f7}
    body.vs-dark #cursor-billing-tip,body.hc-black #cursor-billing-tip,body.vs-dark .ttjl-menu,body.hc-black .ttjl-menu,body.vs-dark .ttjl-settings,body.hc-black .ttjl-settings{background:rgba(38,38,42,.62)!important;color:#f2f2f7!important;border-color:rgba(255,255,255,.18)!important}
    body.vs-dark .ttjl-group,body.hc-black .ttjl-group{background:rgba(255,255,255,.08);box-shadow:inset 0 0 0 1px rgba(255,255,255,.08)}
    body.vs-dark .ttjl-note,body.hc-black .ttjl-note{color:rgba(235,235,245,.6)}
    body.vs-dark .ttjl-settings input,body.hc-black .ttjl-settings input,body.vs-dark .ttjl-settings button,body.hc-black .ttjl-settings button{color:#f2f2f7}
    body.vs-dark .ttjl-actions button[type=submit],body.hc-black .ttjl-actions button[type=submit]{background:#0a84ff;color:#fff}
    body.vs-dark .ttjl-settings button.ttjl-uninstall,body.hc-black .ttjl-settings button.ttjl-uninstall{background:transparent;color:#ff453a}
    @media(prefers-color-scheme:dark){html:not([data-theme="light"]) #${ID}{background:rgba(38,38,42,.5);border-color:rgba(255,255,255,.2);color:#f5f5f7;box-shadow:0 10px 24px rgba(0,0,0,.32),inset 0 1px 0 rgba(255,255,255,.16)}html:not([data-theme="light"]) #cursor-billing-tip,html:not([data-theme="light"]) .ttjl-menu,html:not([data-theme="light"]) .ttjl-settings{background:rgba(38,38,42,.62)!important;color:#f2f2f7!important;border-color:rgba(255,255,255,.18)!important}html:not([data-theme="light"]) .ttjl-group{background:rgba(255,255,255,.08)}html:not([data-theme="light"]) .ttjl-actions button[type=submit]{background:#0a84ff;color:#fff}html:not([data-theme="light"]) .ttjl-settings button.ttjl-uninstall{background:transparent;color:#ff453a}}
    @media(prefers-reduced-motion:reduce){#${ID} .usage-ring-value,#${ID} .ttjl-eye,#${ID} .ttjl-eye i,.ttjl-settings input[type=checkbox]::before{transition:none;animation:none}}
  `;
  document.head.appendChild(style);
}

function svg(tag, attrs) {
  const element = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [key, value] of Object.entries(attrs)) element.setAttribute(key, value);
  return element;
}

function buildRing() {
  const ring = svg('svg', {class:'usage-ring', viewBox:'0 0 36 36', 'aria-hidden':'true'});
  const gradient = svg('linearGradient', {id:'cursor-billing-ring', x1:'12%', y1:'0%', x2:'88%', y2:'100%'});
  gradient.append(svg('stop', {offset:'0%'}), svg('stop', {offset:'100%'}));
  const defs = svg('defs', {});
  defs.append(gradient);
  ring.append(defs, svg('circle', {class:'usage-ring-track', cx:'18', cy:'18', r:'14'}), svg('circle', {class:'usage-ring-value', cx:'18', cy:'18', r:'14', pathLength:'100'}));
  return ring;
}

function buildFace() {
  const face = document.createElement('div');
  face.className = 'ttjl-face';
  face.setAttribute('aria-hidden', 'true');
  for (let index = 0; index < 2; index += 1) {
    const eye = document.createElement('span');
    eye.className = 'ttjl-eye';
    eye.append(document.createElement('i'));
    face.append(eye);
  }
  return face;
}

function field(tag, attrs) {
  const element = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'className') element.className = value;
    else if (key === 'text') element.textContent = value;
    else element[key] = value;
  }
  return element;
}

function row(text, ...controls) {
  const label = document.createElement('label');
  label.className = 'ttjl-row';
  label.append(text, ...controls);
  return label;
}

function mix(hex, toward, amount) {
  const channel = (value, index) => parseInt(value.slice(index, index + 2), 16);
  const blend = (from, to) => Math.round(from + (to - from) * amount).toString(16).padStart(2, '0');
  return '#' + [1, 3, 5].map(index => blend(channel(hex, index), channel(toward, index))).join('');
}

function tone(remaining) {
  const index = remaining <= prefs.low ? 0 : remaining <= prefs.high ? 1 : 2;
  return prefs.colors[index];
}

function paintRing(ring, used) {
  if (!Number.isFinite(used)) {
    ring.style.stroke = '';
    ring.style.strokeDashoffset = '100';
    ring.style.opacity = '0';
    return;
  }
  const remaining = Math.max(0, Math.min(100, 100 - used));
  const base = tone(remaining);
  const stops = [...ring.ownerSVGElement.querySelectorAll('stop')];
  stops[0].style.stopColor = mix(base, '#ffffff', 0.7);
  stops[1].style.stopColor = base;
  ring.style.stroke = 'url(#cursor-billing-ring)';
  ring.style.strokeDashoffset = String(100 - used);
  ring.style.opacity = used > 0 ? '1' : '0';
}

function paintFace(face) {
  face.hidden = !prefs.eyes;
  const n = parseInt(prefs.face.slice(1), 16);
  const lum = ((n >> 16) & 255) * 0.2126 + ((n >> 8) & 255) * 0.7152 + (n & 255) * 0.0722;
  const ink = lum > 150 ? '#1c1c1e' : '#f6f6f4';
  face.style.background = prefs.face;
  face.style.setProperty('--ttjl-ink', ink);
  face.style.setProperty('--ttjl-shine', ink === '#1c1c1e' ? '#fff' : '#222');
  face.classList.toggle('ttjl-still', prefs.paused || matchMedia('(prefers-reduced-motion: reduce)').matches);
}

function paintPet(pet) {
  pet.hidden = !prefs.visible;
  if (pet.dataset.pet === prefs.pet && pet.childNodes.length) return;
  pet.dataset.pet = prefs.pet;
  pet.replaceChildren();
  if (!prefs.pet) {
    pet.textContent = '＋';
    return;
  }
  const img = new Image();
  img.alt = '自定义宠物';
  img.src = prefs.pet;
  pet.append(img);
}

function save(next) {
  localStorage.setItem(PREFS, JSON.stringify(next));
  prefs = next;
  scan();
}

function placeTip(chip, tip, open) {
  if (!open) { tip.style.display = 'none'; return; }
  if (tip.parentElement !== document.body) document.body.appendChild(tip);
  tip.style.display = 'block';
  const anchor = chip.getBoundingClientRect();
  const box = tip.getBoundingClientRect();
  const placed = clampTip(anchor, box, {width:window.innerWidth, height:window.innerHeight});
  tip.style.left = `${placed.left}px`;
  tip.style.top = `${placed.top}px`;
  tip.style.maxWidth = `${placed.width}px`;
  tip.style.maxHeight = `${placed.height}px`;
}

function openSettings(dialog, menu) {
  menu.hidden = true;
  try {
  dialog.replaceChildren();
  let asset = prefs.pet;
  let reading = false;
  let serial = 0;
  const form = document.createElement('form');
  const colors = document.createElement('section');
  colors.className = 'ttjl-group ttjl-colors';
  const note = field('p', {className:'ttjl-note', text:'从左到右是低额度、中额度、充足。'});
  colors.append(note);
  const eyes = document.createElement('span');
  eyes.className = 'ttjl-eyes';
  eyes.append(field('input', {name:'face', type:'color', ariaLabel:'圆心颜色'}), field('input', {name:'eyes', type:'checkbox', ariaLabel:'显示圆环眼睛'}));
  const eyeRow = document.createElement('div');
  eyeRow.className = 'ttjl-row';
  eyeRow.append(field('span', {text:'圆环眼睛'}), eyes);
  const sheet = document.createElement('div');
  sheet.className = 'ttjl-sheet';
  const petGroup = document.createElement('section');
  petGroup.className = 'ttjl-group';
  petGroup.append(row('显示宠物', field('input', {name:'visible', type:'checkbox'})), row('暂停动画', field('input', {name:'paused', type:'checkbox'})), eyeRow);
  const fileGroup = document.createElement('section');
  fileGroup.className = 'ttjl-group';
  fileGroup.append(field('p', {className:'ttjl-note', text:'PNG、JPG、WebP、GIF，最大 2 MB，4096 × 4096。'}), field('input', {name:'file', type:'file', accept:'image/png,image/jpeg,image/webp,image/gif'}), field('button', {name:'remove', type:'button', text:'移除素材'}));
  const limitGroup = document.createElement('section');
  limitGroup.className = 'ttjl-group';
  limitGroup.append(row('低额度上限 %', field('input', {name:'low', type:'number', min:'0', max:'99', required:true})), row('中额度上限 %', field('input', {name:'high', type:'number', min:'1', max:'100', required:true})));
  sheet.append(petGroup, fileGroup, limitGroup, colors);
  const actions = document.createElement('div');
  actions.className = 'ttjl-actions';
  const actionEnd = document.createElement('span');
  actionEnd.className = 'ttjl-action-end';
  actionEnd.append(field('button', {name:'cancel', type:'button', text:'取消'}), field('button', {type:'submit', text:'保存'}));
  actions.append(field('button', {name:'uninstall', type:'button', className:'ttjl-uninstall', text:'卸载'}), actionEnd);
  form.append(field('h2', {text:'环灵'}), sheet, field('p', {className:'ttjl-error', role:'alert'}), actions);
  const fields = form.elements;
  const err = form.querySelector('[role=alert]');
  for (const name of ['visible', 'paused', 'eyes']) fields[name].checked = prefs[name];
  fields.face.value = prefs.face;
  fields.low.value = prefs.low;
  fields.high.value = prefs.high;
  const colorRow = document.createElement('label');
  colorRow.className = 'ttjl-row';
  const name = document.createElement('span');
  name.textContent = '按量';
  const wells = document.createElement('span');
  wells.className = 'ttjl-wells';
  prefs.colors.forEach((color, index) => {
    const input = document.createElement('input');
    input.type = 'color';
    input.value = color;
    input.name = `color${index}`;
    input.setAttribute('aria-label', `${['低', '中', '充足'][index]}额度颜色`);
    wells.append(input);
  });
  colorRow.append(name, wells);
  form.querySelector('.ttjl-colors').append(colorRow);
  const closeSettings = () => {
    dialog.hidden = true;
    dialog.style.setProperty('display', 'none', 'important');
    const backdrop = dialog.previousElementSibling;
    if (!backdrop) return;
    backdrop.hidden = true;
    backdrop.style.setProperty('display', 'none', 'important');
  };
  fields.cancel.onclick = event => { event.preventDefault(); closeSettings(); };
  fields.uninstall.onclick = async event => {
    event.preventDefault();
    if (location.protocol === 'http:') { err.textContent = '预览页不能卸载本机组件'; return; }
    if (!window.confirm('卸载环灵？顶部圆环和本机账单服务都会停止。')) return;
    fields.uninstall.disabled = true;
    err.textContent = '正在打开终端卸载。完成后请用 Cmd+Q 退出 Cursor。';
    try {
      const response = await fetch(UNINSTALL, {method:'POST'});
      if (!response.ok) throw new Error('uninstall');
      retired = true;
      observer.disconnect();
      clearInterval(refreshTimer);
      document.getElementById(ID)?.remove();
      document.getElementById('cursor-billing-tip')?.remove();
      document.getElementById('cursor-billing-style')?.remove();
      closeSettings();
      dialog.remove();
      dialog.previousElementSibling?.remove();
    } catch {
      fields.uninstall.disabled = false;
      err.textContent = '卸载没有完成。请改用安装包里的「卸载.command」，再用 Cmd+Q 退出 Cursor。';
    }
  };
  dialog.onkeydown = event => { if (event.key === 'Escape') { event.preventDefault(); closeSettings(); } };
  fields.remove.onclick = () => { serial += 1; asset = ''; fields.file.value = ''; reading = false; err.textContent = '保存后移除素材'; };
  fields.file.onchange = async () => {
    const token = ++serial;
    const file = fields.file.files[0];
    if (!file) return;
    reading = true;
    err.textContent = '';
    try {
      if (file.size > 2097152 || !/^image\/(png|jpeg|webp|gif)$/.test(file.type)) throw new Error('素材格式或尺寸不符合要求');
      const data = await new Promise((ok, no) => { const reader = new FileReader(); reader.onload = () => ok(reader.result); reader.onerror = no; reader.readAsDataURL(file); });
      const img = new Image();
      img.src = data;
      await img.decode();
      if (img.naturalWidth > 4096 || img.naturalHeight > 4096) throw new Error('素材格式或尺寸不符合要求');
      if (token === serial) asset = data;
    } catch (error) {
      if (token === serial) err.textContent = error instanceof Error ? error.message : '素材格式或尺寸不符合要求';
    } finally {
      if (token === serial) reading = false;
    }
  };
  form.onsubmit = event => {
    event.preventDefault();
    if (reading) { err.textContent = '素材正在读取，请稍候'; return; }
    const next = {visible:fields.visible.checked, paused:fields.paused.checked, eyes:fields.eyes.checked, face:fields.face.value, pet:asset, low:fields.low.valueAsNumber, high:fields.high.valueAsNumber, colors:[0, 1, 2].map(index => fields[`color${index}`].value)};
    if (!ready(next)) { err.textContent = '阈值需满足 0 ≤ 低额度 < 中额度 ≤ 100'; return; }
    try { save(next); closeSettings(); } catch { err.textContent = '本机存储不足，设置未保存，请缩小素材'; }
  };
  dialog.append(form);
  revealSettings(dialog);
  try { fields.visible.focus(); } catch { /* the panel is already visible */ }
  } catch (error) {
    const note = document.createElement('p');
    note.className = 'ttjl-error';
    note.textContent = error instanceof Error ? error.message : '设置没有打开';
    dialog.replaceChildren(note);
    revealSettings(dialog);
  }
}

function revealSettings(dialog) {
  const backdrop = dialog.previousElementSibling;
  document.body.append(backdrop, dialog);
  backdrop.hidden = false;
  dialog.hidden = false;
  backdrop.style.setProperty('display', 'block', 'important');
  backdrop.style.setProperty('position', 'fixed', 'important');
  backdrop.style.setProperty('inset', '0', 'important');
  backdrop.style.setProperty('z-index', '2147483645', 'important');
  dialog.style.setProperty('display', 'flex', 'important');
  dialog.style.setProperty('position', 'fixed', 'important');
  dialog.style.setProperty('z-index', '2147483646', 'important');
  dialog.style.setProperty('top', '50%', 'important');
  dialog.style.setProperty('left', '50%', 'important');
  dialog.style.setProperty('transform', 'translate(-50%, -50%)', 'important');
}

function paint() {
  let chip = document.getElementById(ID);
  if (!chip) {
    chip = document.createElement('div');
    chip.id = ID;
    chip.tabIndex = 0;
    chip.setAttribute('role', 'meter');
    chip.setAttribute('aria-valuemin', '0');
    chip.setAttribute('aria-valuemax', '100');
    const pet = document.createElement('button');
    pet.className = 'ttjl-pet';
    pet.type = 'button';
    pet.setAttribute('aria-label', '设置宠物');
    const meter = document.createElement('div');
    meter.className = 'usage-primary';
    const face = buildFace();
    meter.append(buildRing(), face);
    const figure = document.createElement('span');
    figure.className = 'usage-figure';
    const tip = document.createElement('div');
    tip.id = 'cursor-billing-tip';
    const menu = document.createElement('div');
    menu.className = 'ttjl-menu';
    menu.hidden = true;
    menu.setAttribute('role', 'menu');
    menu.setAttribute('aria-label', '环灵菜单');
    const backdrop = document.createElement('div');
    backdrop.className = 'ttjl-backdrop';
    backdrop.hidden = true;
    const dialog = document.createElement('div');
    dialog.className = 'ttjl-settings';
    dialog.hidden = true;
    dialog.tabIndex = -1;
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-label', '环灵设置');
    chip.append(pet, meter, figure);
    document.body.append(chip, tip, menu, backdrop, dialog);
    backdrop.addEventListener('pointerdown', () => {
      dialog.hidden = true;
      backdrop.hidden = true;
      dialog.style.setProperty('display', 'none', 'important');
      backdrop.style.setProperty('display', 'none', 'important');
    });
    const show = () => placeTip(chip, tip, true);
    const hide = () => placeTip(chip, tip, false);
    chip.addEventListener('mouseenter', show);
    chip.addEventListener('mouseleave', hide);
    chip.addEventListener('focus', show);
    chip.addEventListener('blur', hide);
    pet.addEventListener('pointerdown', event => { event.preventDefault(); event.stopPropagation(); openSettings(dialog, menu); });
    chip.addEventListener('contextmenu', event => {
      event.preventDefault();
      menu.replaceChildren();
      for (const [label, action] of [[prefs.visible ? '隐藏宠物' : '显示宠物', () => { save({...prefs, visible:!prefs.visible}); menu.hidden = true; }], ['设置…', () => openSettings(dialog, menu)]]) {
        const button = document.createElement('button');
        button.type = 'button';
        button.setAttribute('role', 'menuitem');
        button.textContent = label;
        button.addEventListener('pointerdown', click => { click.preventDefault(); click.stopPropagation(); action(); });
        menu.append(button);
      }
      menu.hidden = false;
      const box = menu.getBoundingClientRect();
      const anchor = chip.getBoundingClientRect();
      menu.style.left = `${Math.max(8, Math.min(anchor.left, window.innerWidth - box.width - 8))}px`;
      menu.style.top = '48px';
    });
    chip.querySelector('.usage-primary').addEventListener('pointerdown', event => {
      if (event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      openSettings(dialog, menu);
    });
    document.addEventListener('pointerdown', event => { if (!menu.hidden && !menu.contains(event.target)) menu.hidden = true; });
  }
  const figure = chip.querySelector('.usage-figure');
  const tip = document.getElementById('cursor-billing-tip');
  figure.textContent = view.label;
  tip.textContent = view.detail;
  chip.setAttribute('aria-label', view.detail.replaceAll('\n', '，'));
  if (Number.isFinite(view.percent)) chip.setAttribute('aria-valuenow', String(Math.round(view.percent)));
  else chip.removeAttribute('aria-valuenow');
  paintRing(chip.querySelector('.usage-ring-value'), view.percent);
  paintFace(chip.querySelector('.ttjl-face'));
  paintPet(chip.querySelector('.ttjl-pet'));
}

function scan() {
  if (retired || !document.body) return;
  ensureStyle();
  paint();
}

function schedule() {
  if (scanTimer) return;
  scanTimer = setTimeout(() => { scanTimer = 0; scan(); }, 300);
}

async function refresh() {
  if (retired) return;
  const urls = [SUMMARY, `./huanling-billing.json?t=${Date.now()}`];
  let failure = '账单服务没有连上';
  for (const url of urls) {
    try {
      const response = await fetch(url, {cache:'no-store'});
      if (!response.ok) { failure = `Cursor 账单返回 ${response.status}`; continue; }
      view = billingView(normalizeCursorBilling(await response.json()));
      if (view.label === '—') view = {...view, label:'无按量'};
      scan();
      return;
    } catch (error) {
      const status = error instanceof Error ? error.message : '';
      failure = status === 'Failed to fetch' || status === '' ? '账单服务没有连上' : `Cursor 账单返回 ${status}`;
    }
  }
  view = {label:'未连接', detail:failure, percent:null};
  scan();
}

const observer = new MutationObserver(records => {
  if (records.some(record => record.target instanceof Element && record.target.closest && (record.target.closest('#' + ID) || record.target.closest('.ttjl-menu') || record.target.closest('.ttjl-settings') || record.target.closest('#cursor-billing-tip')))) return;
  schedule();
});
observer.observe(document.documentElement, {childList:true, subtree:true});
refresh();
refreshTimer = setInterval(refresh, 60000);
