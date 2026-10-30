export const defaults = {petVisible:true,petPaused:false,low:20,high:50,colors:{fiveHour:['#b3443c','#a46b20','#327657'],weekly:['#b3443c','#a46b20','#327657']}};
export function normalizeQuota(result) {
  const bucket = result?.rateLimitsByLimitId?.codex ?? result?.rateLimits;
  const windows = {fiveHour:null,weekly:null};
  for (const w of [bucket?.primary,bucket?.secondary]) {
    if (!w || typeof w.usedPercent !== 'number' || !Number.isFinite(w.usedPercent)) continue;
    const key = w.windowDurationMins === 300 ? 'fiveHour' : w.windowDurationMins === 10080 ? 'weekly' : null;
    if (key) windows[key] = {remaining:Math.min(100,Math.max(0,100-w.usedPercent)),resetsAt:Number.isFinite(w.resetsAt)?w.resetsAt:null};
  }
  return {windows,updatedAt:Date.now()};
}
export function validateSettings(value) {
  if (!value || typeof value.petVisible !== 'boolean' || typeof value.petPaused !== 'boolean' || !Number.isFinite(value.low) || !Number.isFinite(value.high) || value.low < 0 || value.high > 100 || value.low >= value.high) throw new Error('阈值需满足 0 ≤ 低额度 < 中额度 ≤ 100');
  const colors = {};
  for (const key of ['fiveHour','weekly']) {
    const c=value.colors?.[key];
    if (!Array.isArray(c) || c.length!==3 || c.some(x=>typeof x!=='string'||!/^#[0-9a-f]{6}$/i.test(x))) throw new Error('请选择有效颜色');
    colors[key]=[...c];
  }
  return {petVisible:value.petVisible,petPaused:value.petPaused,low:value.low,high:value.high,colors};
}
export function ringColor(remaining,key,settings) {return settings.colors[key][remaining<=settings.low?0:remaining<=settings.high?1:2]}
