import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeQuota, validateSettings, defaults, ringColor} from '../src/model.mjs';
test('missing quota is unavailable, never zero',()=>{assert.equal(normalizeQuota({}).windows.fiveHour,null)});
test('find windows by duration and clamp, prefer named bucket',()=>{const r=normalizeQuota({rateLimits:{primary:{usedPercent:99,windowDurationMins:300}},rateLimitsByLimitId:{codex:{primary:{usedPercent:-5,windowDurationMins:10080},secondary:{usedPercent:100,windowDurationMins:300}}}});assert.equal(r.windows.fiveHour.remaining,0);assert.equal(r.windows.weekly.remaining,100)});
test('non-finite and null usage are unavailable',()=>{for(const usedPercent of [null,'20',NaN]) assert.equal(normalizeQuota({rateLimits:{primary:{usedPercent,windowDurationMins:300}}}).windows.fiveHour,null)});
test('validate all preferences and threshold order',()=>{assert.throws(()=>validateSettings({...defaults,low:70,high:40}));assert.throws(()=>validateSettings({...defaults,colors:{...defaults.colors,fiveHour:['red','x','y']}}));assert.deepEqual(validateSettings(defaults),defaults)});
test('color thresholds are independent of window and inclusive',()=>{assert.equal(ringColor(20,'fiveHour',defaults),defaults.colors.fiveHour[0]);assert.equal(ringColor(51,'weekly',defaults),defaults.colors.weekly[2])});
