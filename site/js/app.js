import {names,ranks,squareName,replay} from './shogi.js';
import {courses,lessons,trees,sources} from './lessons.js';
import {reviews} from './review.js';
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let lesson=lessons[0], ply=0, flipped=false, playing=null, game, toastTimer;
let learned=[];
try { const value=JSON.parse(localStorage.getItem('shogi-learned')||'[]'); if(Array.isArray(value)) learned=value.filter(id=>lessons.some(l=>l.id===id)); } catch { /* Storage is optional. */ }
$('course').innerHTML=courses.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('');
function stop() {clearInterval(playing);playing=null;$('play').textContent='▶';$('play').setAttribute('aria-label','自動再生');}
function toast(text){$('toast').textContent=text;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,3500);}
function writeHash(){history.replaceState(null,'',`#${new URLSearchParams({lesson:lesson.id,ply:String(ply)})}`);}
function treeHTML(node,root=false){
 const active=node.lesson===lesson.id;
 if(node.lesson){ const l=lessons.find(l=>l.id===node.lesson); return `<li><button class="lesson-node" data-lesson="${l.id}" aria-current="${active}"><small>${esc(node.title)}</small><strong>${esc(l.title)}</strong><span class="arrow" aria-hidden="true">${learned.includes(l.id)?'✓':'↗'}</span></button></li>`; }
 const onPath=JSON.stringify(node).includes(`"${lesson.id}"`);
 return `<li><div class="tree-node ${root?'tree-root':''} ${onPath?'on-path':''}"><strong>${esc(node.title)}</strong>${node.caption?`<small>${esc(node.caption)}</small>`:''}</div><ul>${node.children.map(n=>treeHTML(n)).join('')}</ul></li>`;
}
function renderFlow(){
 $('flow').innerHTML=`<ul class="tree">${treeHTML(trees[lesson.course][lesson.side],true)}</ul>`;
 document.querySelectorAll('[data-side]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.side===lesson.side)));
}
function renderLearned(){
 $('bookmark').setAttribute('aria-pressed',String(learned.includes(lesson.id)));
 $('bookmark').title=learned.includes(lesson.id)?'学習済みを解除する':'この定跡を学習済みにする';
 const count=lessons.filter(l=>l.course===lesson.course).length;
 $('lesson-count').textContent=`${count} のレッスン`;
 $('progress').textContent=`学習済み ${learned.length} / ${lessons.length}`;
}
function selectLesson(id,step=0,scroll=false){
 stop();lesson=lessons.find(l=>l.id===id)||lessons[0];game=replay(lesson.moves);ply=Math.max(0,Math.min(Number.isFinite(step)?Math.trunc(step):0,lesson.moves.length));flipped=lesson.side===1;
 $('course').value=lesson.course;
 $('lesson-title').textContent=lesson.title;$('subtitle').textContent=lesson.subtitle;
 document.title=`${lesson.title}｜将棋の道しるべ`;
 $('lesson-badges').innerHTML=`<span class="badge">${lesson.side===0?'先手':'後手'}</span><span class="badge">${esc(lesson.tag)}</span><span class="badge outline">${esc(lesson.level)}</span>`;
 $('goal').textContent=lesson.goal;$('caution').textContent=lesson.caution;
 $('sources').innerHTML=lesson.sourceIds.map(id=>`<li><a href="${esc(sources[id].url)}" target="_blank" rel="noopener noreferrer">${esc(sources[id].title)} ↗</a></li>`).join('');
 $('move-list').innerHTML=`<button data-ply="0">開始局面</button>`+game.labels.map((label,i)=>`<button data-ply="${i+1}"><span>${i+1}</span>${esc(label)}</button>`).join('');
 const review=reviews[lesson.id];
 $('quiz-question').textContent=review.question;$('quiz-feedback').hidden=true;
 $('quiz-choices').innerHTML=review.choices.map((c,i)=>`<button data-answer="${i}">${esc(c)}</button>`).join('');
 $('plans').innerHTML=review.plans.map(p=>`<li>${esc(p)}</li>`).join('');
 $('timeline').max=lesson.moves.length;renderFlow();renderLearned();renderPosition();
 if(scroll&&matchMedia('(max-width:700px)').matches) $('study').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'});
}
function handHTML(state,side){
 const pieces=['R','B','G','S','N','L','P'].filter(p=>state.hands[side][p]>0).map(p=>`${names[p]}${state.hands[side][p]>1?`×${state.hands[side][p]}`:''}`).join('　');
 return `<span>${side===0?'▲ 先手':'△ 後手'}の持ち駒</span>${pieces?`<span class="hand-pieces">${pieces}</span>`:'<span class="empty">なし</span>'}`;
}
function renderPosition(){
 const state=game.states[ply], files=flipped?[1,2,3,4,5,6,7,8,9]:[9,8,7,6,5,4,3,2,1], rows=flipped?[8,7,6,5,4,3,2,1,0]:[0,1,2,3,4,5,6,7,8], bottom=flipped?1:0;
 $('file-labels').innerHTML=files.map(f=>`<span>${f}</span>`).join('');$('rank-labels').innerHTML=rows.map(r=>`<span>${ranks[r]}</span>`).join('');
 let html='', accessible=[];
 for(const r of rows) for(const f of files){
  const sq=`${f}${String.fromCharCode(97+r)}`,p=state.board[sq];
  const label=p?`${squareName(sq)} ${p.side===0?'先手':'後手'}の${names[p.type]}`:`${squareName(sq)} 空き`;
  if(p) accessible.push(label);
  html+=`<div class="square ${state.last?.to===sq?'last-to':''} ${state.last?.from===sq?'last-from':''}" title="${label}" data-square="${sq}">${p?`<span class="piece ${p.side!==bottom?'opponent':''} ${p.type.startsWith('+')?'promoted':''} ${names[p.type].length>1?'long':''}">${names[p.type]}</span>`:''}</div>`;
 }
 $('board').innerHTML=html;$('board').setAttribute('aria-label',`${ply}手目の将棋盤。${accessible.join('、')}`);
 $('hand-top').innerHTML=handHTML(state,1-bottom);$('hand-bottom').innerHTML=handHTML(state,bottom);
 $('perspective').textContent=`${bottom===0?'先手':'後手'}から見た盤面`;
 $('turn').textContent=`次は ${state.turn===0?'▲ 先手':'△ 後手'}の手番`;$('move-count').textContent=`${ply} / ${lesson.moves.length} 手`;
 $('timeline').value=ply;$('first').disabled=$('prev').disabled=ply===0;$('next').disabled=$('last').disabled=ply===lesson.moves.length;
 $('note-kicker').textContent=ply===0?'この定跡の入口':ply===lesson.moves.length?'この手順の到達点':`${ply}手目 / 一手の理由`;
 $('note-title').textContent=ply===0?'まず、方針をつかもう':game.labels[ply-1];$('note-body').textContent=ply===0?lesson.intro:lesson.moves[ply-1].note;
 document.querySelectorAll('[data-ply]').forEach(b=>{if(+b.dataset.ply===ply)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');});
 const selected=$('move-list').querySelector('[aria-current=step]');
 if(selected){const list=$('move-list');const delta=selected.getBoundingClientRect().top-list.getBoundingClientRect().top;if(delta<0||delta>list.clientHeight-selected.offsetHeight)list.scrollTop+=delta-list.clientHeight/2+selected.offsetHeight/2;}
 const alternatives=lessons.filter(l=>l.id!==lesson.id&&l.course===lesson.course&&l.side===lesson.side&&ply>=Math.min(l.branchAt,lesson.branchAt)&&l.moves.length>ply&&lesson.moves.length>ply&&l.moves.slice(0,ply).every((m,i)=>m.usi===lesson.moves[i].usi)&&l.moves[ply].usi!==lesson.moves[ply].usi);
 $('variations').innerHTML=alternatives.length?`<div class="variation-box"><p>この局面には、別の選択もあります</p>${alternatives.map(l=>`<button data-alternative="${l.id}">${esc(l.title)} →</button>`).join('')}</div>`:'';
 writeHash();
}
function go(step){stop();ply=Math.max(0,Math.min(step,lesson.moves.length));renderPosition();}
$('flow').addEventListener('click',e=>{const b=e.target.closest('[data-lesson]');if(b)selectLesson(b.dataset.lesson,0,true);});
$('move-list').addEventListener('click',e=>{const b=e.target.closest('[data-ply]');if(b)go(+b.dataset.ply);});
$('variations').addEventListener('click',e=>{const b=e.target.closest('[data-alternative]');if(b)selectLesson(b.dataset.alternative,ply+1);});
$('course').addEventListener('change',()=>selectLesson(lessons.find(l=>l.course===$('course').value).id));
for(const b of document.querySelectorAll('[data-side]'))b.addEventListener('click',()=>selectLesson(lessons.find(l=>l.course===lesson.course&&l.side===+b.dataset.side).id));
$('quiz-jump').onclick=()=>{go(reviews[lesson.id].ply);$('board').scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'});};
$('quiz-choices').onclick=e=>{const b=e.target.closest('[data-answer]');if(!b)return;const review=reviews[lesson.id];const correct=+b.dataset.answer===review.answer;document.querySelectorAll('[data-answer]').forEach(el=>el.classList.toggle('correct',+el.dataset.answer===review.answer));$('quiz-feedback').hidden=false;$('quiz-feedback').textContent=(correct?'正解です。':'ここでは '+review.choices[review.answer]+' を考えます。')+review.explanation;};
$('first').onclick=()=>go(0);$('prev').onclick=()=>go(ply-1);$('next').onclick=()=>go(ply+1);$('last').onclick=()=>go(lesson.moves.length);
$('timeline').oninput=()=>go(+$('timeline').value);$('branch-jump').onclick=()=>go(lesson.branchAt);
$('flip').onclick=()=>{flipped=!flipped;renderPosition();};
$('play').onclick=()=>{if(playing){stop();return;}if(ply===lesson.moves.length)ply=0;renderPosition();$('play').textContent='Ⅱ';$('play').setAttribute('aria-label','一時停止');playing=setInterval(()=>{ply++;renderPosition();if(ply===lesson.moves.length)stop();},1600);};
$('bookmark').onclick=()=>{const wasLearned=learned.includes(lesson.id);learned=wasLearned?learned.filter(id=>id!==lesson.id):[...learned,lesson.id];try{localStorage.setItem('shogi-learned',JSON.stringify(learned));toast(wasLearned?'学習済みを解除しました':'学習済みとして記録しました');}catch{toast('この環境では保存できないため、今回の表示のみ更新しました');}renderLearned();renderFlow();};
$('share').onclick=async()=>{try{await navigator.clipboard.writeText(location.href);toast('この局面へのリンクをコピーしました');}catch{toast('アドレスバーのURLをコピーすると、この局面を共有できます');}};
$('help-open').onclick=()=>{stop();$('help').showModal();};$('help-close').onclick=()=>$('help').close();
$('help').addEventListener('click',e=>{if(e.target===$('help')){const r=$('help').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('help').close();}});
window.addEventListener('keydown',e=>{if($('help').open||e.altKey||e.ctrlKey||e.metaKey||['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName)||e.target.isContentEditable)return;if(e.key==='ArrowRight'){e.preventDefault();go(ply+1);}if(e.key==='ArrowLeft'){e.preventDefault();go(ply-1);}});
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
function readHash(){const p=new URLSearchParams(location.hash.slice(1));selectLesson(p.get('lesson'),Number(p.get('ply')||0));}
window.addEventListener('hashchange',readHash);readHash();
