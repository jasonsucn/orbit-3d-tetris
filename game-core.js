/* ORBIT game rules. Dependency-free, deterministic with an injected RNG. */
(function(root){
'use strict';
const TYPES=['I','O','T','S','Z','J','L'];
const BASE={I:[[0,1],[1,1],[2,1],[3,1]],O:[[1,0],[2,0],[1,1],[2,1]],T:[[1,0],[0,1],[1,1],[2,1]],S:[[1,0],[2,0],[0,1],[1,1]],Z:[[0,0],[1,0],[1,1],[2,1]],J:[[0,0],[0,1],[1,1],[2,1]],L:[[2,0],[0,1],[1,1],[2,1]]};
const SHAPES={};
for(const type of TYPES){SHAPES[type]=[BASE[type].map(p=>p.slice())];for(let r=1;r<4;r++){const size=type==='I'?4:3;SHAPES[type].push(type==='O'?BASE.O.map(p=>p.slice()):SHAPES[type][r-1].map(([x,y])=>[size-1-y,x]))}}
// Official SRS offsets translated into board coordinates (positive y is down).
const JLSTZ={
 '0>1':[[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
 '1>0':[[0,0],[1,0],[1,1],[0,-2],[1,-2]],
 '1>2':[[0,0],[1,0],[1,1],[0,-2],[1,-2]],
 '2>1':[[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
 '2>3':[[0,0],[1,0],[1,-1],[0,2],[1,2]],
 '3>2':[[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
 '3>0':[[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
 '0>3':[[0,0],[1,0],[1,-1],[0,2],[1,2]]
};
const IKICKS={
 '0>1':[[0,0],[-2,0],[1,0],[-2,1],[1,-2]],
 '1>0':[[0,0],[2,0],[-1,0],[2,-1],[-1,2]],
 '1>2':[[0,0],[-1,0],[2,0],[-1,-2],[2,1]],
 '2>1':[[0,0],[1,0],[-2,0],[1,2],[-2,-1]],
 '2>3':[[0,0],[2,0],[-1,0],[2,-1],[-1,2]],
 '3>2':[[0,0],[-2,0],[1,0],[-2,1],[1,-2]],
 '3>0':[[0,0],[1,0],[-2,0],[1,2],[-2,-1]],
 '0>3':[[0,0],[-1,0],[2,0],[-1,-2],[2,1]]
};
class OrbitEngine {
 constructor(callback,options={}){if(callback&&typeof callback==='object'){options=callback;callback=options.onEvent}this.onEvent=typeof callback==='function'?callback:()=>{};this.random=options.random||Math.random;this.mode='marathon';this._reset();this.state='ready'}
 _reset(){this.board=Array.from({length:20},()=>Array(10).fill(null));this.current=null;this.next=[];this.held=null;this.canHold=true;this.score=0;this.lines=0;this.level=1;this.combo=-1;this.backToBack=false;this.elapsed=0;this.pieces=0;this._fall=0;this._lockTime=0;this._lockResets=0;this._lastRotate=false;this._lastKick=0;this._refill()}
 _emit(type,data={}){this.onEvent(type,data)}
 _refill(){while(this.next.length<7){const bag=TYPES.slice();for(let i=bag.length-1;i>0;i--){const j=Math.max(0,Math.min(i,Math.floor(this.random()*(i+1))));[bag[i],bag[j]]=[bag[j],bag[i]]}this.next.push(...bag)}}
 start(mode='marathon'){if(!['marathon','sprint40'].includes(mode))throw new Error('Unsupported game mode: '+mode);this.mode=mode;this._reset();this.state='playing';this._emit('start',{mode});this._spawn();return this}
 restart(){return this.start(this.mode)}
 getCells(piece=this.current){if(!piece)return[];const shape=SHAPES[piece.type];if(!shape)return[];return shape[((piece.rotation||0)%4+4)%4].map(([x,y])=>({x:x+piece.x,y:y+piece.y,type:piece.type}))}
 _fits(piece){return this.getCells(piece).every(c=>c.x>=0&&c.x<10&&c.y<20&&c.y>=-4&&(c.y<0||!this.board[c.y][c.x]))}
 _spawn(type,resetHold=true){if(this.state!=='playing')return;this._refill();const next=type||this.next.shift();this._refill();this.current={type:next,x:3,y:-1,rotation:0};this._fall=0;this._lockTime=0;this._lockResets=0;this._lastRotate=false;this._lastKick=0;if(resetHold)this.canHold=true;if(!this._fits(this.current)){this._finish('over');return}this._emit('spawn',{type:next})}
 ghostY(){if(!this.current)return-1;let y=this.current.y;while(this._fits({...this.current,y:y+1}))y++;return y}
 _grounded(){return this.current&&!this._fits({...this.current,y:this.current.y+1})}
 _resetLock(wasGrounded){if(wasGrounded&&this._lockResets<15){this._lockTime=0;this._lockResets++}}
 move(dx){if(this.state!=='playing'||!this.current||![-1,1].includes(dx))return false;const p={...this.current,x:this.current.x+dx};if(!this._fits(p))return false;const grounded=this._grounded();this.current=p;this._lastRotate=false;this._resetLock(grounded);this._emit('move',{dx});return true}
 rotate(dir=1){if(this.state!=='playing'||!this.current||![-1,1,2].includes(dir))return false;if(dir===2){const a=this.rotate(1);const b=this.rotate(1);return a||b}const from=this.current.rotation,to=(from+(dir===-1?3:1))%4;const tests=this.current.type==='O'?[[0,0]]:(this.current.type==='I'?IKICKS:JLSTZ)[from+'>'+to];const grounded=this._grounded();for(let i=0;i<tests.length;i++){const [dx,dy]=tests[i],p={...this.current,x:this.current.x+dx,y:this.current.y+dy,rotation:to};if(this._fits(p)){this.current=p;this._lastRotate=true;this._lastKick=i;this._resetLock(grounded);this._emit('rotate',{dir,kick:i});return true}}return false}
 softDrop(){if(this.state!=='playing'||!this.current)return false;const p={...this.current,y:this.current.y+1};if(!this._fits(p))return false;this.current=p;this.score++;this._fall=0;this._lockTime=0;this._emit('softdrop');return true}
 hardDrop(){if(this.state!=='playing'||!this.current)return false;const type=this.current.type,landing=this.ghostY(),distance=landing-this.current.y;this.current.y=landing;this.score+=distance*2;this._emit('harddrop',{distance,cells:this.getCells(),type});this._lock();return true}
 hold(){if(this.state!=='playing'||!this.current||!this.canHold)return false;const type=this.current.type,swap=this.held;this.held=type;this.canHold=false;this._spawn(swap||undefined,false);this._emit('hold',{held:type,current:this.current?.type});return true}
 pause(){if(this.state!=='playing')return false;this.state='paused';this._emit('pause');return true}
 resume(){if(this.state!=='paused')return false;this.state='playing';this._emit('resume');return true}
 togglePause(){return this.state==='playing'?this.pause():this.resume()}
 get gravity(){return Math.max(45,1000*Math.pow(Math.max(.25,.8-(this.level-1)*.007),this.level-1))}
 update(dt){if(this.state!=='playing'||!this.current||!Number.isFinite(dt)||dt<=0)return;this.elapsed+=dt;dt=Math.min(dt,250);this._fall+=dt;let guard=0;while(this._fall>=this.gravity&&guard++<8){this._fall-=this.gravity;const p={...this.current,y:this.current.y+1};if(this._fits(p)){this.current=p}else{this._fall=0;break}}if(this._grounded()){this._lockTime+=dt;if(this._lockTime>=500)this._lock()}else this._lockTime=0}
 _occupied(x,y){return x<0||x>=10||y>=20||(y>=0&&!!this.board[y][x])}
 _spin(){if(!this.current||this.current.type!=='T'||!this._lastRotate)return null;const x=this.current.x+1,y=this.current.y+1,corners=[this._occupied(x-1,y-1),this._occupied(x+1,y-1),this._occupied(x+1,y+1),this._occupied(x-1,y+1)];if(corners.filter(Boolean).length<3)return null;const front=[[0,1],[1,2],[2,3],[3,0]][this.current.rotation];return corners[front[0]]&&corners[front[1]]||this._lastKick===4?'full':'mini'}
 _lock(){if(this.state!=='playing'||!this.current)return;const cells=this.getCells(),type=this.current.type,spin=this._spin();let top=false;for(const c of cells){if(c.y<0)top=true;else if(c.y<20&&c.x>=0&&c.x<10)this.board[c.y][c.x]=type}this.pieces++;const rows=[];for(let y=0;y<20;y++)if(this.board[y].every(Boolean))rows.push(y);const count=rows.length;this.combo=count?this.combo+1:-1;this._emit('lock',{cells,type});if(top){this._finish('over');return}
 if(count){this.board=this.board.filter((row,y)=>!rows.includes(y));while(this.board.length<20)this.board.unshift(Array(10).fill(null));let base=spin==='full'?[400,800,1200,1600][Math.min(count,3)]:spin==='mini'?[100,200,400][Math.min(count,2)]:[0,100,300,500,800][count];const difficult=count===4||!!spin,chain=difficult&&this.backToBack;if(chain)base=Math.floor(base*1.5);let points=base*this.level+Math.max(0,this.combo)*50*this.level;const perfectClear=this.board.every(row=>row.every(c=>!c));if(perfectClear)points+=[0,800,1200,1800,2000][count]*this.level;this.score+=points;this.lines+=count;this.backToBack=difficult;const label=spin?'T-SPIN'+(spin==='mini'?' MINI':''):(count===4?'TETRIS':['','SINGLE','DOUBLE','TRIPLE'][count]);this._emit('clear',{rows,count,scoreDelta:points,label,combo:this.combo,backToBack:chain,perfectClear});const level=Math.floor(this.lines/10)+1;if(level!==this.level){this.level=level;this._emit('level',{level})}if(this.mode==='sprint40'&&this.lines>=40){this._finish('complete');return}}
 else if(spin){const points=(spin==='full'?400:100)*this.level;this.score+=points;this._emit('spin',{scoreDelta:points,label:spin==='full'?'T-SPIN':'T-SPIN MINI'})}
 this._spawn()}
 _finish(state){this.state=state;this.current=null;this._emit(state==='complete'?'complete':'gameover',{score:this.score,lines:this.lines,elapsed:this.elapsed,level:this.level})}
}
OrbitEngine.SHAPES=SHAPES;OrbitEngine.COLORS={I:'#7bf6d2',O:'#dfed8b',T:'#b49df3',S:'#63d6b3',Z:'#f791a2',J:'#7ba8f4',L:'#f5b47f'};OrbitEngine.WIDTH=10;OrbitEngine.HEIGHT=20;
if(typeof module!=='undefined'&&module.exports)module.exports=OrbitEngine;
root.OrbitEngine=OrbitEngine;
})(typeof window!=='undefined'?window:globalThis);
