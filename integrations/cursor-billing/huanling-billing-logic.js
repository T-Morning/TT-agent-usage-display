function numberish(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) return Number(value);
  return null;
}

function dollars(cents) {
  const value = numberish(cents);
  return value === null ? null : value / 100;
}

export function formatDollars(amount) {
  if (typeof amount !== 'number' || !Number.isFinite(amount)) return '—';
  return amount.toLocaleString('en-US', {style:'currency', currency:'USD', minimumFractionDigits:2, maximumFractionDigits:2});
}

export function formatReset(ms, timeZone = 'Asia/Shanghai') {
  if (typeof ms !== 'number' || !Number.isFinite(ms)) return null;
  return new Intl.DateTimeFormat('zh-CN', {timeZone, month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit', hourCycle:'h23'}).format(new Date(ms));
}

function present(...values) {
  return values.some(value => value !== null);
}

function epoch(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string' || value.trim() === '') return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeCursorBilling(payload, now = Date.now()) {
  const individual = payload?.individualUsage ?? null;
  const plan = individual?.plan ?? null;
  const demand = individual?.onDemand ?? null;
  const pool = payload?.teamUsage?.onDemand ?? null;
  const planSpend = dollars(plan?.used);
  const planLimit = dollars(plan?.limit);
  const planRemaining = dollars(plan?.remaining);
  const onDemand = dollars(demand?.used);
  const onDemandLimit = dollars(demand?.limit);
  const onDemandRemaining = dollars(demand?.remaining);
  const teamSpend = dollars(pool?.used);
  const teamLimit = dollars(pool?.limit);
  const teamRemaining = dollars(pool?.remaining);
  const personal = present(planSpend, planLimit, planRemaining, onDemand, onDemandLimit, onDemandRemaining)
    ? {spend:planSpend, limit:planLimit, remaining:planRemaining, onDemand, onDemandLimit, onDemandRemaining, percent:numberish(plan?.totalPercentUsed)}
    : null;
  const team = present(teamSpend, teamLimit, teamRemaining) ? {spend:teamSpend, limit:teamLimit, remaining:teamRemaining} : null;
  const kind = personal && team ? 'both' : personal ? 'personal' : team ? 'team' : null;
  return {
    status:kind ? 'ready' : 'unavailable',
    kind,
    membership:typeof payload?.membershipType === 'string' ? payload.membershipType : null,
    limitType:typeof payload?.limitType === 'string' ? payload.limitType : null,
    resetsAt:epoch(payload?.billingCycleEnd),
    personal,
    team,
    updatedAt:now
  };
}

function personalLines(personal) {
  const lines = [];
  if (personal.spend !== null) lines.push(`套餐已用 ${formatDollars(personal.spend)}`);
  if (personal.limit !== null) lines.push(`套餐额度 ${formatDollars(personal.limit)}`);
  if (personal.remaining !== null) lines.push(`套餐剩余 ${formatDollars(personal.remaining)}`);
  if (personal.percent !== null) lines.push(`套餐比例 ${personal.percent}%`);
  if (personal.onDemand !== null) lines.push(`按量已用 ${formatDollars(personal.onDemand)}`);
  if (personal.onDemandLimit !== null) lines.push(`按量额度 ${formatDollars(personal.onDemandLimit)}`);
  if (personal.onDemandRemaining !== null) lines.push(`按量剩余 ${formatDollars(personal.onDemandRemaining)}`);
  return lines;
}

export function clampTip(anchor, box, viewport, margin = 8) {
  const width = Math.min(box.width, Math.max(0, viewport.width - margin * 2));
  const height = Math.min(box.height, Math.max(0, viewport.height - margin * 2));
  let left = anchor.left + anchor.width / 2 - width / 2;
  left = Math.max(margin, Math.min(left, viewport.width - width - margin));
  let top = anchor.bottom + 6;
  if (top + height > viewport.height - margin) top = anchor.top - height - 6;
  top = Math.max(margin, Math.min(top, viewport.height - height - margin));
  return {left, top, width, height};
}

export function demandRatio(personal) {
  if (!personal || personal.onDemand === null || personal.onDemandLimit === null || personal.onDemandLimit <= 0) return null;
  return Math.max(0, Math.min(100, personal.onDemand / personal.onDemandLimit * 100));
}

export function billingView(bill) {
  if (!bill || bill.status !== 'ready' || !bill.personal) return {label:'—', detail:'Cursor 账单暂时读不到', percent:null};
  const head = [];
  if (bill.membership === 'enterprise') head.push('企业');
  const reset = formatReset(bill.resetsAt);
  if (reset) head.push(`周期结束 ${reset}`);
  const ratio = bill.personal.onDemand !== null && bill.personal.onDemandLimit !== null
    ? `${formatDollars(bill.personal.onDemand)} / ${formatDollars(bill.personal.onDemandLimit)}`
    : '—';
  return {
    label:ratio,
    detail:[head, personalLines(bill.personal)].flat().join('\n'),
    percent:demandRatio(bill.personal)
  };
}
