import test from 'node:test';
import assert from 'node:assert/strict';
import {initialPosition,applyMove,replay,moveLabel} from '../site/js/shogi.js';
import {lessons,courses,trees,sources} from '../site/js/lessons.js';
import {reviews} from '../site/js/review.js';
for(const lesson of lessons) test(`${lesson.id}: replay, immutable history, material conservation`,()=>{
 const {states,labels}=replay(lesson.moves);
 assert.equal(states.length,lesson.moves.length+1);
 assert.deepEqual(states[0],initialPosition());
 for(const [i,state] of states.entries()){
  let count=Object.keys(state.board).length;
  count+=state.hands.reduce((n,hand)=>n+Object.values(hand).reduce((a,b)=>a+b,0),0);
  assert.equal(count,40,`material count at ply ${i}`);
  assert.equal(state.turn,i%2);
  if(i) assert.match(labels[i-1],i%2===1?/^▲/:/^△/);
 }
});
test('capture unpromotes into hand; bishop drop consumes the hand; backtracking is immutable',()=>{
 const {states}=replay(lessons.find(l=>l.id==='shin').moves);
 assert.equal(states[10].board['8h'].type,'+B');
 assert.equal(states[11].hands[0].B,1);
 assert.equal(states[13].hands[0].B,0);
 assert.equal(states[13].board['5f'].type,'B');
 assert.equal(states[14].hands[1].R,1);
 assert.equal(states[15].hands[0].B,1);
 assert.equal(states[17].hands[0].B,0);
});
test('reject illegal geometry, blocked moves, wrong turns and empty-hand drops',()=>{
 const p=initialPosition();
 for(const m of ['7g7e','2h7g','8h2b+','3c3d','P*5e','7g7f+'])assert.throws(()=>applyMove(p,m));
 assert.deepEqual(p,initialPosition());
});
test('reject own king exposure, nifu, dead drops and mandatory unpromoted moves',()=>{
 assert.throws(()=>applyMove({board:{'5i':{type:'K',side:0},'5h':{type:'G',side:0},'5a':{type:'R',side:1}},hands:[{},{}],turn:0},'5h4h'),/check/);
 const p=initialPosition();p.hands[0].P=1;p.hands[0].N=1;
 assert.throws(()=>applyMove(p,'P*5e'),/Double pawn/);
 const empty={board:{},hands:[{P:1,N:1},{}],turn:0};
 assert.throws(()=>applyMove(empty,'P*5a'),/Dead drop/);
 assert.throws(()=>applyMove(empty,'N*5b'),/Dead drop/);
 const pawn={board:{'5b':{type:'P',side:0}},hands:[{},{}],turn:0};
 assert.throws(()=>applyMove(pawn,'5b5a'),/Promotion required/);
 assert.equal(applyMove(pawn,'5b5a+').board['5a'].type,'+P');
});
test('all lessons are reachable, have sources, nonempty explanations and valid review positions',()=>{
 assert.equal(new Set(lessons.map(l=>l.id)).size,lessons.length);
 const reached=new Set();
 function walk(node,course,side){if(node.lesson){const l=lessons.find(l=>l.id===node.lesson);assert.ok(l);assert.equal(l.course,course);assert.equal(l.side,side);reached.add(l.id);}else{assert.ok(node.children.length);node.children.forEach(n=>walk(n,course,side));}}
 courses.forEach(c=>c.sides.forEach(s=>walk(trees[c.id][s],c.id,s)));
 for(const l of lessons){assert.ok(reached.has(l.id));assert.ok(l.branchAt<=l.moves.length);assert.ok(l.moves.every(m=>m.note));assert.ok(l.sourceIds.every(s=>sources[s]?.url.startsWith('https://')));const r=reviews[l.id];assert.ok(r&&r.ply<=l.moves.length);assert.ok(r.choices[r.answer]);assert.ok(r.plans.length);}
 assert.equal(moveLabel(initialPosition(),'7g7f'),'▲７六歩');
});
