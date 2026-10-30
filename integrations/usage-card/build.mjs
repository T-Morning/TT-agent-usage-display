import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('./',import.meta.url),original=await readFile(new URL('agent.original.cjs',root),'utf8');
if(createHash('sha256').update(original).digest('hex')!=='2727a6e47c71503bbc8d2171520bcd41aff851fa3b1efc7e8319974145977683')throw Error('Reference agent changed; review before rebuilding');
const companion=await readFile(new URL('companion.js',root),'utf8');
let next=original;
function replaceOnce(from,to){if(next.split(from).length!==2)throw Error('Unexpected reference structure: '+from);next=next.replace(from,()=>to)}
replaceOnce('const VERSION = 53;',`const VERSION = 5304;\n${companion}`);
replaceOnce("ring.style.stroke = percent === null ? '' : usageRingColor(percent);","companion.paint(ring,percent,element===secondaryMeter);");
replaceOnce('      badge.remove(); tooltip.remove(); style.remove();','      companion.destroy();\n      badge.remove(); tooltip.remove(); style.remove();');
replaceOnce('  render();\n  place();\n}', '  const companion=attachCompanion(badge,render);\n  render();\n  place();\n  companion.promote();\n}');
replaceOnce(`  const tick = async () => {
    await scan();
    readUsage().catch(() => {});
  };`,`  const tick = async () => {
    await scan();
    await ttjlWatchUninstall(injector).catch(()=>{});
    readUsage().catch(() => {});
  };`);
replaceOnce('async function main() {', `let ttjlUninstallStarted=false;
async function ttjlWatchUninstall(injector){
  if(ttjlUninstallStarted)return;
  let requested=false;
  for(const session of injector.sessions.values()){
    try{
      const result=await session.evaluate('window.__ttjlRequestUninstall===true');
      if(result?.result?.value===true)requested=true;
    }catch{}
  }
  if(!requested)return;
  ttjlUninstallStarted=true;
  const {spawn}=require('node:child_process');
  const path=require('node:path');
  const os=require('node:os');
  const child=spawn(process.execPath,[path.join(__dirname,'manage.cjs'),'uninstall'],{detached:true,stdio:'ignore',cwd:os.homedir()});
  child.unref();
  process.exit(0);
}
async function main() {`);
await mkdir(new URL('../../dist/usage-card/',root),{recursive:true});
await writeFile(new URL('../../dist/usage-card/agent.cjs',root),next);
const start=next.indexOf('function installUsageBadge()'),end=next.indexOf('\nfunction isMainWindow',start);
const renderer=next.slice(start,end);
const html=`<!doctype html><html lang="zh-CN" data-theme="light"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>环灵侧栏预览</title><style>body{margin:0;min-height:100dvh;font:14px -apple-system,sans-serif;color:#1c1c1e;background:radial-gradient(900px 520px at 0% 0%,#d5e6f8,transparent 55%),linear-gradient(160deg,#ece7df,#c5d0dc 70%,#b7c6c2)}nav{width:68px;height:100dvh;background:rgba(255,255,255,.38);backdrop-filter:blur(18px);display:flex;flex-direction:column;align-items:center}html[data-theme="dark"] body{background:#17171a;color:#f5f5f7}html[data-theme="dark"] nav{background:rgba(28,28,30,.8)}nav>div:first-child{flex:1}nav>footer{width:36px;height:36px;margin:12px 0;border-radius:50%;background:#d8d8de}main{position:absolute;left:96px;top:28px;max-width:520px}button{font:inherit}main p{line-height:1.7}</style><nav data-app-navigation-rail><div></div><footer aria-label="模拟头像"></footer></nav><main><h1>侧栏预览</h1><p>模拟侧栏和测试额度，用来调圆环、渐变和设置弹窗。这不是 Codex 主窗口。</p><p><button id="open-settings" type="button">打开设置</button></p></main><script>${renderer}\nif(new URLSearchParams(location.search).has('hidepet'))window.__ttjlPreviewHidePet=true;installUsageBadge();window.__codexUsageBadge.update({mode:'dual',percent:65,title:'测试额度',rings:[{percent:65,label:'5h',tone:'normal',title:'测试5h剩余65%'},{percent:28,label:'每周',tone:'warning',title:'测试每周剩余28%'}],updatedAt:Date.now()});document.querySelector('#open-settings').onclick=()=>document.querySelector('.ttjl-pet').click();if(new URLSearchParams(location.search).has('night')){document.documentElement.dataset.theme='dark';document.body.style.background='#17171a'}if(new URLSearchParams(location.search).has('settings'))document.querySelector('.ttjl-pet').click();</script></html>`;
await writeFile(new URL('../../dist/usage-card/index.html',root),html);
console.log('Built offline integration and isolated sidebar fixture; installed agent unchanged.');
