const STALE_MS = 20 * 60 * 1000;

export function percentUsed(value) {
  const number = typeof value === 'number' ? value : typeof value === 'string' && value.trim() !== '' ? Number(value) : null;
  if (number === null || !Number.isFinite(number) || number < 0) return null;
  const scaled = number > 0 && number < 1 ? number * 100 : number;
  return Math.max(0, Math.min(100, scaled));
}

function epoch(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string' || value.trim() === '') return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function windowFrom(source) {
  if (typeof source === 'number' || typeof source === 'string') return {used:percentUsed(source), resetsAt:null};
  const used = percentUsed(source?.utilization ?? source?.used ?? source?.percent);
  return used === null && epoch(source?.resets_at ?? source?.resetsAt) === null
    ? null
    : {used, resetsAt:epoch(source?.resets_at ?? source?.resetsAt)};
}

export function normalizeClaudeUsage(payload, now = Date.now()) {
  const fiveHour = windowFrom(payload?.five_hour ?? payload?.fiveHour ?? payload?.fh);
  const week = windowFrom(payload?.seven_day ?? payload?.sevenDay ?? payload?.week ?? payload?.sd);
  const updatedAt = epoch(payload?.updatedAt) ?? now;
  const known = [fiveHour, week].some(item => item?.used !== null && item?.used !== undefined);
  return {
    status:known ? 'ready' : 'unavailable',
    fiveHour:fiveHour?.used === null && fiveHour?.resetsAt === null ? null : fiveHour,
    week:week?.used === null && week?.resetsAt === null ? null : week,
    updatedAt
  };
}

export function usageFromHistory(history, now = Date.now()) {
  const samples = Array.isArray(history?.samples) ? history.samples : [];
  const latest = samples.reduce((best, sample) => {
    if (!best) return sample;
    return (sample?.t ?? -Infinity) >= (best?.t ?? -Infinity) ? sample : best;
  }, null);
  if (!latest || typeof latest.u !== 'object' || latest.u === null) return normalizeClaudeUsage({}, now);
  const usage = normalizeClaudeUsage({
    five_hour:{utilization:latest.u.fh},
    seven_day:{utilization:latest.u.sd},
    updatedAt:latest.t
  }, now);
  if (usage.status === 'ready' && typeof latest.t === 'number' && now - latest.t > STALE_MS) return normalizeClaudeUsage({}, now);
  return usage;
}

export function formatReset(ms, timeZone = 'Asia/Shanghai') {
  if (typeof ms !== 'number' || !Number.isFinite(ms)) return null;
  return new Intl.DateTimeFormat('zh-CN', {timeZone, month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit', hourCycle:'h23'}).format(new Date(ms));
}

function line(item) {
  if (!item || item.used === null || item.used === undefined) return {used:null, remaining:null, text:''};
  const remaining = Math.max(0, Math.min(100, Math.round(100 - item.used)));
  return {used:item.used, remaining, text:`${remaining}%`};
}

export function claudeUsageView(usage) {
  const fiveHour = {...line(usage?.fiveHour), kind:'5h'};
  const week = {...line(usage?.week), kind:'周'};
  const notes = [];
  const fiveReset = formatReset(usage?.fiveHour?.resetsAt);
  const weekReset = formatReset(usage?.week?.resetsAt);
  if (fiveReset) notes.push(`5小时重置 ${fiveReset}`);
  if (weekReset) notes.push(`每周重置 ${weekReset}`);
  const known = usage?.status === 'ready';
  return {
    status:known ? 'ready' : 'unavailable',
    fiveHour,
    week,
    detail:known ? [`${fiveHour.kind} ${fiveHour.text}`, `${week.kind} ${week.text}`, ...notes].filter(Boolean).join('\n') : ''
  };
}
