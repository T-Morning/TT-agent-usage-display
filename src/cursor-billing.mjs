export {billingView, formatDollars, formatReset, normalizeCursorBilling} from '../integrations/cursor-billing/huanling-billing-logic.js';
import {normalizeCursorBilling} from '../integrations/cursor-billing/huanling-billing-logic.js';
import {workosSessionCookie} from './cursor-secret.mjs';

const USAGE_SUMMARY = 'https://cursor.com/api/usage-summary';

export function cursorSummaryHeaders(token) {
  const cookie = workosSessionCookie(token);
  return cookie ? {Cookie:cookie} : {Authorization:`Bearer ${token}`};
}

export async function readCursorBilling({token, fetchImpl = fetch, now = Date.now(), endpoint = USAGE_SUMMARY} = {}) {
  const empty = {status:'unavailable', kind:null, personal:null, team:null, updatedAt:now};
  if (typeof token !== 'string' || token.trim() === '') return {...empty, status:'unauthorized'};
  let response;
  try {
    response = await fetchImpl(endpoint, {
      method:'GET',
      headers:cursorSummaryHeaders(token)
    });
  } catch {
    return empty;
  }
  if (response.status === 401 || response.status === 403) return {...empty, status:'unauthorized'};
  if (!response.ok) return empty;
  return normalizeCursorBilling(await response.json(), now);
}
