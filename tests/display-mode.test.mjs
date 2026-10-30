import test from 'node:test';
import assert from 'node:assert/strict';
import {expandPanel} from '../src/display-mode.mjs';
test('request fullscreen only when host advertises it',async()=>{
 const calls=[];
 const app={getHostContext:()=>({displayMode:'inline',availableDisplayModes:['inline','fullscreen']}),requestDisplayMode:async params=>{calls.push(params);return {mode:'fullscreen'}}};
 assert.equal(await expandPanel(app),'fullscreen');assert.deepEqual(calls,[{mode:'fullscreen'}]);
});
test('already expanded panel is not requested again',async()=>{assert.equal(await expandPanel({getHostContext:()=>({displayMode:'fullscreen'})}),'fullscreen')});
test('unsupported hosts do not receive an invalid display request',async()=>{assert.equal(await expandPanel({getHostContext:()=>({displayMode:'inline',availableDisplayModes:['inline']})}),null)});
test('host rejection remains observable for retry',async()=>{await assert.rejects(expandPanel({getHostContext:()=>({availableDisplayModes:['fullscreen']}),requestDisplayMode:async()=>{throw new Error('denied')}}),/denied/)});
