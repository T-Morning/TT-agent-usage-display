import {App} from '@modelcontextprotocol/ext-apps';
import {defaults,validateSettings,ringColor} from '../src/model.mjs';
import {expandPanel} from '../src/display-mode.mjs';
const $=id=>document.getElementById(id);
const petImage=document.createElement('img');petImage.id='petImage';petImage.hidden=true;petImage.alt='自定义宠物';$('petImageMount').append(petImage);
const petStill=document.createElement('canvas');petStill.hidden=true;petStill.setAttribute('aria-label','暂停的自定义宠物');$('petImageMount').append(petStill);
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
function freezePet(){
 const freeze=settings.petPaused||reducedMotion.matches||document.hidden||!settings.petVisible;
 if(asset && freeze && petImage.complete && petImage.naturalWidth){petStill.width=128;petStill.height=128;const ctx=petStill.getContext('2d');ctx.clearRect(0,0,128,128);const ratio=Math.min(128/petImage.naturalWidth,128/petImage.naturalHeight);const w=petImage.naturalWidth*ratio,h=petImage.naturalHeight*ratio;ctx.drawImage(petImage,(128-w)/2,(128-h)/2,w,h);petStill.hidden=false;petImage.hidden=true}else{petStill.hidden=true;petImage.hidden=!asset}
}
petImage.onload=freezePet;reducedMotion.addEventListener('change',freezePet);
const storageKey='quota-pet.settings.v1',petKey='quota-pet.asset.v1';
let settings=structuredClone(defaults),asset=null,pendingAsset=null,data=null,busy=false,app=null,menuReturn=null,dialogReturn=null;
try{const saved=localStorage.getItem(storageKey);if(saved)settings=validateSettings(JSON.parse(saved));const a=localStorage.getItem(petKey);if(a&&/^data:image\/(png|jpeg|webp|gif);base64,/.test(a))asset=a}catch{}
const time=stamp=>stamp?new Intl.DateTimeFormat('zh-CN',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(stamp)):'';
function paintPet(){
  $('petStage').hidden=!settings.petVisible;
  $('petStage').classList.toggle('paused',settings.petPaused);
  $('petImage').hidden=!asset;
  if(asset && $('petImage').getAttribute('src')!==asset)$('petImage').src=asset;
  if(!asset)$('petImage').removeAttribute('src');
  $('petEmpty').hidden=!!asset;freezePet();
  $('petButton').setAttribute('aria-label',asset?'打开宠物设置':'添加自定义宠物');
  $('togglePet').querySelector('span').textContent=settings.petVisible?'隐藏宠物':'显示宠物';
}
function render(){
  paintPet();
  for(const key of ['fiveHour','weekly']){
    const el=$(key),w=data?.windows?.[key],p=w?.remaining;
    const valid=typeof p==='number'&&Number.isFinite(p)&&p>=0&&p<=100;
    el.querySelector('.percentage').textContent=valid?`${Math.round(p)}%`:'--';
    const arc=el.querySelector('.arc');arc.style.strokeDasharray=`${valid?p:0} 100`;arc.style.setProperty('--arc-color',ringColor(valid?p:100,key,settings));
    const reset=valid&&w.resetsAt?`${time(w.resetsAt*1000)} 重置`:busy?'正在读取…':'暂无可用窗口';
    el.querySelector('.reset').textContent=reset;
    el.title=`${key==='fiveHour'?'5h':'每周'}剩余 ${valid?Math.round(p)+'%':'不可用'}\n${reset}\n${data?.updatedAt?'更新于 '+time(data.updatedAt):'尚未更新'}`;
    el.setAttribute('aria-label',el.title.replaceAll('\n','，'));
  }
  $('status').textContent=busy?'正在更新额度…':data?.error?(data.updatedAt?`数据已过期，上次更新 ${time(data.updatedAt)}。${data.error}`:data.error):data?.updatedAt?`更新于 ${time(data.updatedAt)}`:'等待额度数据';
  $('refresh').disabled=busy;
}
async function refresh(){
  if(busy)return;busy=true;render();
  try{
    let next;
    if(app){const result=await app.callServerTool({name:'refresh_quota',arguments:{}});next=result.structuredContent;if(result.isError)throw new Error()}
    else{const res=await fetch('/api/quota',{signal:AbortSignal.timeout(20000)});if(!res.ok)throw new Error();next=await res.json()}
    if(!next?.windows)throw new Error();data=next;
  }catch{data={...data,status:data?.updatedAt?'stale':'error',error:'额度更新失败，请检查连接后重试'}}finally{busy=false;render()}
}
function savePreferences(next,nextAsset=asset){
  // Write all changes before applying; attempt rollback if the asset exceeds storage quota.
  const oldSettings=localStorage.getItem(storageKey),oldAsset=localStorage.getItem(petKey);
  try{if(nextAsset)localStorage.setItem(petKey,nextAsset);else localStorage.removeItem(petKey);localStorage.setItem(storageKey,JSON.stringify(next))}
  catch(error){try{if(oldAsset)localStorage.setItem(petKey,oldAsset);else localStorage.removeItem(petKey);if(oldSettings)localStorage.setItem(storageKey,oldSettings);else localStorage.removeItem(storageKey)}catch{}throw new Error('无法保存本机设置，请检查存储权限或缩小宠物图片')}
  settings=next;asset=nextAsset;render();
}
function closeMenu(restore=true){$('menu').hidden=true;$('menuButton').setAttribute('aria-expanded','false');if(restore)(menuReturn?.getClientRects().length?menuReturn:$('panel')).focus({preventScroll:true})}
function openMenu(x,y){
  if($('settings').open)return;
  menuReturn=document.activeElement instanceof HTMLElement?document.activeElement:$('panel');
  const menu=$('menu');menu.hidden=false;menu.style.left='0px';menu.style.top='0px';const rect=menu.getBoundingClientRect();
  menu.style.left=`${Math.max(8,Math.min(x,innerWidth-rect.width-8))}px`;menu.style.top=`${Math.max(8,Math.min(y,innerHeight-rect.height-8))}px`;
  $('menuButton').setAttribute('aria-expanded','true');menu.querySelector('button').focus({preventScroll:true});
}
$('panel').addEventListener('contextmenu',e=>{e.preventDefault();openMenu(e.clientX,e.clientY)});
$('panel').addEventListener('keydown',e=>{if(e.key==='ContextMenu'||(e.shiftKey&&e.key==='F10')){e.preventDefault();const r=e.target.getBoundingClientRect();openMenu(r.x+16,r.y+16)}});
$('menuButton').onclick=()=>{if(!$('menu').hidden){closeMenu();return}const r=$('menuButton').getBoundingClientRect();openMenu(r.right-208,r.bottom+4)};
document.addEventListener('pointerdown',e=>{if(!$('menu').hidden&&!$('menu').contains(e.target)&&!$('menuButton').contains(e.target))closeMenu(false)});
document.addEventListener('keydown',e=>{if($('menu').hidden)return;const items=[...$('menu').querySelectorAll('button')],i=items.indexOf(document.activeElement);if(e.key==='Escape'){e.preventDefault();closeMenu()}if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();items[e.key==='Home'?0:e.key==='End'?items.length-1:(i+(e.key==='ArrowDown'?1:-1)+items.length)%items.length].focus()}if(e.key==='Tab')closeMenu(false)});
window.addEventListener('resize',()=>closeMenu(false));
$('togglePet').onclick=()=>{try{savePreferences({...settings,petVisible:!settings.petVisible});closeMenu()}catch(error){openSettings();$('settingsError').textContent=error.message}};
function openSettings(){
  dialogReturn=$('menu').hidden?document.activeElement:(menuReturn||$('menuButton'));closeMenu(false);pendingAsset=asset;++fileRead;$('settingsForm').querySelector('[type=submit]').disabled=false;
  $('petVisible').checked=settings.petVisible;$('petPaused').checked=settings.petPaused;$('low').value=settings.low;$('high').value=settings.high;$('settingsError').textContent='';$('petFile').value='';
  for(const key of ['fiveHour','weekly'])settings.colors[key].forEach((c,i)=>$(`${key}Color${i}`).value=c);
  $('settings').showModal();$('petVisible').focus();
}
$('settingsItem').onclick=openSettings;$('petButton').onclick=openSettings;
$('closeSettings').onclick=()=>$('settings').close();$('cancelSettings').onclick=()=>$('settings').close();
$('settings').addEventListener('close',()=>{pendingAsset=null;++fileRead;dialogReturn?.focus({preventScroll:true});dialogReturn=null});
$('settings').addEventListener('click',e=>{if(e.target===$('settings')){const r=$('settings').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('settings').close()}});
for(const key of ['fiveHour','weekly']){
  const row=document.createElement('div');row.className='color-row';const name=document.createElement('span');name.textContent=key==='fiveHour'?'5h':'每周';row.append(name);
  ['低','中','充足'].forEach((name,i)=>{const label=document.createElement('label');label.className='color-labels';label.textContent=name;const input=document.createElement('input');input.type='color';input.id=`${key}Color${i}`;input.setAttribute('aria-label',`${key==='fiveHour'?'5h':'每周'}${name}额度颜色`);label.append(input);row.append(label)});$('colorSettings').append(row);
}
$('removePet').onclick=()=>{++fileRead;$('settingsForm').querySelector('[type=submit]').disabled=false;pendingAsset=null;$('petFile').value='';$('settingsError').textContent='保存后移除宠物素材'};
let fileRead=0;
$('petFile').onchange=async()=>{
  const serial=++fileRead,file=$('petFile').files[0];if(!file)return;
  $('settingsError').textContent='';
  if(!['image/png','image/jpeg','image/webp','image/gif'].includes(file.type)||file.size>2*1024*1024){$('settingsError').textContent='请选择不超过 2 MB 的 PNG、JPG、WebP 或 GIF';$('petFile').value='';return}
  const submit=$('settingsForm').querySelector('[type=submit]');submit.disabled=true;
  try{const next=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file)});const img=new Image();img.src=next;await img.decode();if(img.naturalWidth>4096||img.naturalHeight>4096)throw new Error();if(serial===fileRead)pendingAsset=next}
  catch{if(serial===fileRead)$('settingsError').textContent='图片无法读取，或尺寸超过 4096 × 4096，请换一张'}finally{if(serial===fileRead)submit.disabled=false}
};
$('settingsForm').onsubmit=e=>{e.preventDefault();try{const colors={};for(const key of ['fiveHour','weekly'])colors[key]=[0,1,2].map(i=>$(`${key}Color${i}`).value);const next=validateSettings({petVisible:$('petVisible').checked,petPaused:$('petPaused').checked,low:$('low').valueAsNumber,high:$('high').valueAsNumber,colors});savePreferences(next,pendingAsset);$('settings').close()}catch(error){$('settingsError').textContent=error.message}};
$('refresh').onclick=refresh;
function updateDisplayControl(){
 const ctx=app?.getHostContext();
 $('expandPanel').hidden=!ctx?.availableDisplayModes?.includes('fullscreen')||ctx?.displayMode==='fullscreen';
}
async function requestPanel(){
 $('expandPanel').disabled=true;
 try{const mode=await expandPanel(app);$('displayStatus').textContent=mode==='fullscreen'?'':mode===null?'当前宿主未提供面板展开能力':'面板未展开，请重试'}
 catch{$('displayStatus').textContent='面板展开失败，可点击重试'}
 finally{$('expandPanel').disabled=false;updateDisplayControl()}
}
$('expandPanel').onclick=requestPanel;
render();
if(window.parent!==window){
  const connection=new App({name:'quota-pet',version:'0.1.0'},{},{autoResize:true});
  connection.ontoolresult=result=>{if(result.structuredContent?.windows){data=result.structuredContent;render()}};
  connection.onhostcontextchanged=ctx=>{if(ctx.theme)document.documentElement.dataset.theme=ctx.theme;updateDisplayControl()};
  try{await connection.connect();app=connection;const ctx=app.getHostContext();if(ctx?.theme)document.documentElement.dataset.theme=ctx.theme;console.info('quota-pet display context',JSON.stringify({displayMode:ctx?.displayMode,availableDisplayModes:ctx?.availableDisplayModes}));updateDisplayControl();await requestPanel();await refresh()}
  catch{data={status:'error',error:'插件连接未建立，请重新打开面板'};render()}
}else await refresh();
setInterval(()=>{if(!document.hidden&&!$('settings').open&&(app||window.parent===window))refresh()},60000);
document.addEventListener('visibilitychange',()=>{freezePet();if(!document.hidden&&(app||window.parent===window))refresh()});
