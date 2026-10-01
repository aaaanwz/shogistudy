export const names = { P:'歩', L:'香', N:'桂', S:'銀', G:'金', B:'角', R:'飛', K:'玉', '+P':'と', '+L':'成香', '+N':'成桂', '+S':'成銀', '+B':'馬', '+R':'龍' };
export const ranks = '一二三四五六七八九';
export function initialPosition() {
  const board = {};
  const back = ['L','N','S','G','K','G','S','N','L'];
  for (let f=1; f<=9; f++) {
    board[`${f}a`] = {type:back[f-1], side:1};
    board[`${f}c`] = {type:'P', side:1};
    board[`${f}g`] = {type:'P', side:0};
    board[`${f}i`] = {type:back[f-1], side:0};
  }
  board['8b']={type:'R',side:1}; board['2b']={type:'B',side:1};
  board['2h']={type:'R',side:0}; board['8h']={type:'B',side:0};
  return {board, hands:[{},{}], turn:0, last:null};
}
export const coordinates = sq => [+sq[0], sq.charCodeAt(1)-96];
export const squareName = sq => `${'０１２３４５６７８９'[+sq[0]]}${ranks[sq.charCodeAt(1)-97]}`;
const inZone = (sq, side) => side===0 ? coordinates(sq)[1]<=3 : coordinates(sq)[1]>=7;
function attacks(board, from, to) {
  const p=board[from]; if (!p || from===to) return false;
  const [fx,fy]=coordinates(from), [tx,ty]=coordinates(to);
  const dx=tx-fx, dy=(ty-fy)*(p.side===0 ? -1:1), ax=Math.abs(dx), ay=Math.abs(dy);
  let slide=false, valid=false;
  switch(p.type) {
    case 'P': return dx===0 && dy===1;
    case 'N': return ax===1 && dy===2;
    case 'S': return (dy===1 && ax<=1)||(dy===-1 && ax===1);
    case 'G': case '+P': case '+L': case '+N': case '+S': return (dy===1 && ax<=1)||(dy===0 && ax===1)||(dy===-1 && dx===0);
    case 'K': return ax<=1 && ay<=1;
    case 'L': valid=dx===0 && dy>0; slide=true; break;
    case '+B': if ((ax===1&&ay===0)||(ax===0&&ay===1)) return true;
    // falls through
    case 'B': valid=ax===ay; slide=true; break;
    case '+R': if(ax===1&&ay===1) return true;
    // falls through
    case 'R': valid=dx===0||dy===0; slide=true; break;
  }
  if(!valid) return false;
  if(slide) {
    const sx=Math.sign(tx-fx), sy=Math.sign(ty-fy);
    for(let x=fx+sx,y=fy+sy; x!==tx||y!==ty; x+=sx,y+=sy) if(board[`${x}${String.fromCharCode(96+y)}`]) return false;
  }
  return true;
}
export function applyMove(position, usi) {
  if(!/^(?:[1-9][a-i][1-9][a-i]\+?|[PLNSGBR]\*[1-9][a-i])$/.test(usi)) throw Error(`Invalid USI: ${usi}`);
  const next=structuredClone(position), side=position.turn;
  const drop=usi[1]==='*', from=drop?null:usi.slice(0,2), to=usi.slice(2,4);
  const captured=next.board[to];
  if(captured?.side===side || captured?.type==='K') throw Error(`Invalid capture: ${usi}`);
  let piece;
  if(drop) {
    const type=usi[0], rank=coordinates(to)[1], last=side===0?1:9;
    if(captured || !(next.hands[side][type]>0)) throw Error(`Invalid drop: ${usi}`);
    if((['P','L'].includes(type)&&rank===last)||(type==='N'&&(side===0?rank<=2:rank>=8))) throw Error(`Dead drop: ${usi}`);
    if(type==='P'&&Object.entries(next.board).some(([sq,p])=>sq[0]===to[0]&&p.side===side&&p.type==='P')) throw Error(`Double pawn: ${usi}`);
    next.hands[side][type]--; piece={type,side};
  } else {
    piece=next.board[from];
    if(!piece||piece.side!==side||!attacks(next.board,from,to)) throw Error(`Illegal movement: ${usi}`);
    if(usi.endsWith('+')) {
      if(!'PLNSBR'.includes(piece.type)||piece.type.length!==1||!(inZone(from,side)||inZone(to,side))) throw Error(`Illegal promotion: ${usi}`);
      piece.type=`+${piece.type}`;
    }
    const rank=coordinates(to)[1];
    if((['P','L'].includes(piece.type)&&(side===0?rank===1:rank===9))||(piece.type==='N'&&(side===0?rank<=2:rank>=8))) throw Error(`Promotion required: ${usi}`);
    delete next.board[from];
    if(captured) { const type=captured.type.replace('+',''); next.hands[side][type]=(next.hands[side][type]||0)+1; }
  }
  next.board[to]=piece;
  const king=Object.keys(next.board).find(sq=>next.board[sq].side===side&&next.board[sq].type==='K');
  if(king && Object.keys(next.board).some(sq=>next.board[sq].side!==side&&attacks(next.board,sq,king))) throw Error(`King in check: ${usi}`);
  next.turn=1-side; next.last={from,to}; return next;
}
export function moveLabel(position, usi) {
  const drop=usi[1]==='*', to=usi.slice(2,4);
  const type=drop?usi[0]:position.board[usi.slice(0,2)].type;
  return `${position.turn===0?'▲':'△'}${squareName(to)}${names[type]}${usi.endsWith('+')?'成':''}${drop?'打':''}`;
}
export function replay(moves) {
  const states=[initialPosition()], labels=[];
  for(const move of moves) { const usi=typeof move==='string'?move:move.usi; labels.push(moveLabel(states.at(-1),usi)); states.push(applyMove(states.at(-1),usi)); }
  return {states,labels};
}
