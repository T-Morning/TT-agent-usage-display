import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import {normalizeQuota} from './model.mjs';

// A separate short-lived, read-only protocol client. Never reads auth files.
export function readQuota({command=process.env.CODEX_BINARY||'codex',timeout=15000}={}) {
  return new Promise((resolve,reject)=>{
    const child=spawn(command,['app-server','--stdio'],{stdio:['pipe','pipe','ignore']});
    let settled=false;
    const timer=setTimeout(()=>finish(new Error('额度读取超时，请重试')),timeout);
    const finish=(error,result)=>{if(settled)return;settled=true;clearTimeout(timer);child.stdin.end();child.kill();error?reject(error):resolve(result)};
    child.on('error',()=>finish(new Error('无法启动 Codex，请检查本地 Codex CLI')));
    child.on('exit',()=>finish(new Error('Codex 连接已关闭，请检查登录状态')));
    child.stdin.on('error',()=>finish(new Error('Codex 连接中断')));
    const send=m=>{if(!settled)child.stdin.write(JSON.stringify(m)+'\n')};
    createInterface({input:child.stdout}).on('line',line=>{
      let message;try{message=JSON.parse(line)}catch{return}
      if(message.id===1){if(message.error)return finish(new Error('Codex 初始化失败'));send({method:'initialized'});send({id:2,method:'account/rateLimits/read'})}
      if(message.id===2){if(message.error)return finish(new Error('无法读取额度，请确认 Codex 已登录 ChatGPT'));finish(null,normalizeQuota(message.result))}
    });
    send({id:1,method:'initialize',params:{clientInfo:{name:'quota-pet',version:'0.1.0'},capabilities:{experimentalApi:true}}});
  });
}
export function createQuotaReader(read=readQuota) {
  let last=null,pending=null,lastAttempt=0;
  return async()=>{
    if(pending)return pending;
    if(last && Date.now()-lastAttempt<30000)return last;
    lastAttempt=Date.now();
    pending=read().then(data=>(last={...data,status:'ready',error:null})).catch(()=>({windows:last?.windows??{fiveHour:null,weekly:null},updatedAt:last?.updatedAt??null,status:last?'stale':'error',error:'额度更新失败，请确认 Codex 已登录后重试'})).finally(()=>{pending=null});
    return pending;
  };
}
