'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const Learning=require('../assets/js/learning.js');

test('Frequency starter letters generate valid words using only unlocked letters',()=>{for(const focus of 'etaoi')for(let i=0;i<100;i++){const word=Learning.makePseudoWord('etaoi',focus);assert.match(word,/^[etaoi]{3,5}$/);assert.ok(word.includes(focus));}});
test('mixed unlocked letters generate words using only the available letters',()=>{const allowed='eniar';for(const focus of allowed)for(let i=0;i<50;i++){const word=Learning.makePseudoWord(allowed,focus);assert.match(word,/^[eniar]{3,5}$/);assert.ok(word.includes(focus));}});
test('consonant-only sets use a safe fallback without missing characters',()=>{const word=Learning.makePseudoWord('str','t');assert.match(word,/^[str]{3,5}$/);assert.ok(word.includes('t'));});
test('invalid focus or empty allowed letters returns an empty result safely',()=>{assert.equal(Learning.makePseudoWord('','a'),'');assert.equal(Learning.makePseudoWord('etaoi','z'),'');});
test('normalization sanitizes persisted per-letter statistics',()=>{assert.deepEqual(Learning.normalizeStat({hits:'12',errors:-4,recent:[true,false,'invalid',true]}),{hits:12,errors:0,recent:[true,false,true]});});
test('recent performance history is bounded to the latest twenty samples',()=>{const stat={hits:0,errors:0,recent:[]};for(let i=0;i<25;i++)Learning.recordSample(stat,i>=5);assert.equal(stat.hits,20);assert.equal(stat.errors,5);assert.equal(stat.recent.length,20);assert.ok(stat.recent.every(Boolean));});
test('focus selection responds to recent decline while retaining lifetime results',()=>{const stats={a:{hits:18,errors:2,recent:Array(8).fill(false)},b:{hits:12,errors:8,recent:Array(8).fill(true)}};assert.equal(Learning.selectFocusLetter('ab',stats),'a');assert.equal(Learning.performance(stats.a).recentAccuracy,0);assert.equal(Learning.performance(stats.b).recentAccuracy,1);});
test('new or uncalibrated letters receive exploration priority',()=>{const stats={a:{hits:10,errors:2,recent:Array(8).fill(true)},b:{hits:0,errors:0}};assert.equal(Learning.selectFocusLetter('ab',stats),'b');});
test('weak-key ranking uses recent and lifetime performance',()=>{const stats={a:{hits:12,errors:4,recent:Array(8).fill(false)},b:{hits:12,errors:4,recent:Array(8).fill(true)},c:{hits:1,errors:0,recent:[true]}};assert.deepEqual(Learning.weakKeys('abc',stats,8,2),['a','b']);});
test('exercise weights are positive, bounded and favour weaker letters',()=>{const stats={a:{hits:10,errors:10,recent:Array(8).fill(false)},b:{hits:20,errors:0,recent:Array(8).fill(true)}};const weights=Learning.wordWeights(['ab','bb'],stats);assert.equal(weights.length,2);assert.ok(weights.every(x=>x>=1&&x<=12));assert.ok(weights[0]>weights[1]);});
