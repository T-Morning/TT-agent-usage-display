import {readQuota} from '../src/quota.mjs';
try {const r=await readQuota();console.log(JSON.stringify(r,null,2))} catch(e){console.error(e.message);process.exitCode=1}
