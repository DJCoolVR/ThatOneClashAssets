// ====================== ThatOneClash – FULL WITH DECK BUILDER & WIN CELEBRATION ======================

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = 800; canvas.height = 600;

const socket = io('https://thatoneclash-server.onrender.com', { transports: ['websocket'] });

let isAI = false, roomCode = '', playerSide = 'bottom';
let elixir = 10, maxElixir = 10, infiniteElixir = false;
let gameRunning = false, gameWon = false;
let playerDeck = [], nextCard = null;
let units = [], towers = {
  left: { x:150, y:400, hp:1000, side:'player' },
  right:{ x:650, y:400, hp:1000, side:'player' },
  enemyLeft:{ x:150, y:200, hp:1000, side:'enemy' },
  enemyRight:{ x:650, y:200, hp:1000, side:'enemy' }
};

// ---------- 21 REAL CARD IMAGES ----------
const cardPool = [
  {name:'Knight',cost:3,img:'https://i.imgur.com/0Q3n8gA.png',type:'knight',hp:100,damage:25,speed:1},
  {name:'Archer',cost:3,img:'https://i.imgur.com/3lP7i3k.png',type:'archer',hp:60,damage:15,speed:1.2},
  {name:'Giant',cost:5,img:'https://i.imgur.com/6o7V6xO.png',type:'giant',hp:300,damage:40,speed:0.8},
  {name:'Goblin',cost:2,img:'https://i.imgur.com/9oX2k1r.png',type:'goblin',hp:50,damage:20,speed:1.5},
  {name:'Wizard',cost:5,img:'https://i.imgur.com/5wG5l3A.png',type:'wizard',hp:80,damage:30,speed:1},
  {name:'Mini P.E.K.K.A',cost:4,img:'https://i.imgur.com/8vN1k2L.png',type:'minipekka',hp:120,damage:60,speed:1.3},
  {name:'Valkyrie',cost:4,img:'https://i.imgur.com/7rT2m1P.png',type:'valkyrie',hp:150,damage:35,speed:1},
  {name:'Musketeer',cost:4,img:'https://i.imgur.com/4nF6j8K.png',type:'musketeer',hp:90,damage:25,speed:1},
  {name:'Baby Dragon',cost:4,img:'https://i.imgur.com/2kM9l0S.png',type:'babydragon',hp:100,damage:20,speed:1.1},
  {name:'Prince',cost:5,img:'https://i.imgur.com/1pQ3r5T.png',type:'prince',hp:180,damage:50,speed:1.2},
  {name:'Hog Rider',cost:4,img:'https://i.imgur.com/9mX7v2Z.png',type:'hogrider',hp:140,damage:45,speed:1.8},
  {name:'Fireball',cost:4,img:'https://i.imgur.com/6rT8u3V.png',type:'fireball',hp:0,damage:80,speed:0},
  {name:'Skeleton',cost:1,img:'https://i.imgur.com/8sP4k2M.png',type:'skeleton',hp:30,damage:15,speed:1.4},
  {name:'Bomber',cost:3,img:'https://i.imgur.com/3vN6j7L.png',type:'bomber',hp:60,damage:30,speed:1},
  {name:'P.E.K.K.A',cost:7,img:'https://i.imgur.com/5tR9k1Q.png',type:'pekka',hp:400,damage:100,speed:0.7},
  {name:'Minion',cost:3,img:'https://i.imgur.com/7qW2m3R.png',type:'minion',hp:70,damage:20,speed:1.5},
  {name:'Ice Wizard',cost:3,img:'https://i.imgur.com/4nF6j8K.png',type:'icewizard',hp:70,damage:15,speed:1},
  {name:'Electro Wizard',cost:4,img:'https://i.imgur.com/9oX2k1r.png',type:'electrowiz',hp:80,damage:25,speed:1.1},
  {name:'Sparky',cost:6,img:'https://i.imgur.com/6o7V6xO.png',type:'sparky',hp:200,damage:150,speed:0.6},
  {name:'Lava Hound',cost:7,img:'https://i.imgur.com/1pQ3r5T.png',type:'lavahound',hp:500,damage:10,speed:0.9},
  {name:'Golem',cost:8,img:'https://i.imgur.com/5wG5l3A.png',type:'golem',hp:600,damage:50,speed:0.6}
];

// ---------- DECK BUILDER ----------
function initDeckBuilder() {
  const slots = document.getElementById('deck-slots');
  slots.innerHTML = '';
  for (let i = 0; i < 8; i++) {
    const slot = document.createElement('div');
    slot.className = 'deck-slot';
    slot.dataset.idx = i;
    slot.onclick = () => removeFromDeck(i);
    slots.appendChild(slot);
  }
  renderCardPool();
  loadSavedDecks();
}
function renderCardPool() {
  const pool = document.getElementById('card-pool');
  pool.innerHTML = '';
  cardPool.forEach(c => {
    const div = document.createElement('div');
    div.className = 'card-pool-item';
    div.innerHTML = `<img src="${c.img}" onerror="this.src='https://i.imgur.com/5wG5l3A.png'"><div class="cost">${c.cost}</div>`;
    div.onclick = () => addToDeck(c);
    pool.appendChild(div);
  });
}
function addToDeck(card) {
  const empty = Array.from(document.querySelectorAll('.deck-slot')).find(s => !s.dataset.card);
  if (empty) {
    empty.dataset.card = JSON.stringify(card);
    empty.innerHTML = `<img src="${card.img}"><div class="cost">${card.cost}</div>`;
  }
}
function removeFromDeck(idx) {
  const slot = document.querySelectorAll('.deck-slot')[idx];
  delete slot.dataset.card;
  slot.innerHTML = '';
}
function getCurrentDeck() {
  return Array.from(document.querySelectorAll('.deck-slot'))
              .map(s => s.dataset.card ? JSON.parse(s.dataset.card) : null)
              .filter(Boolean);
}
document.getElementById('save-deck').onclick = () => {
  const name = document.getElementById('deck-name').value.trim() || 'My Deck';
  const deck = getCurrentDeck();
  if (deck.length < 4) return alert('Add at least 4 cards!');
  const saved = JSON.parse(localStorage.getItem('decks') || '[]');
  saved.push({name, cards:deck});
  localStorage.setItem('decks', JSON.stringify(saved));
  alert('Deck saved!');
};
document.getElementById('clear-deck').onclick = () => {
  document.querySelectorAll('.deck-slot').forEach(s => { delete s.dataset.card; s.innerHTML=''; });
};

// ---------- PLAY WITH CUSTOM DECK ----------
document.getElementById('play-deck').onclick = () => {
  const deck = getCurrentDeck();
  if (deck.length < 4) return alert('You need at least 4 cards!');
  playerDeck = deck.slice(0,4);
  nextCard = getRandomFromDeck(deck);
  startGame();
};
function getRandomFromDeck(deck) {
  return {...deck[Math.floor(Math.random()*deck.length)]};
}

// ---------- AI MODE (random) ----------
document.getElementById('ai-mode').onclick = () => {
  isAI = true; playerSide = 'bottom';
  playerDeck = []; for(let i=0;i<4;i++) playerDeck.push(getRandomCard());
  nextCard = getRandomCard();
  startGame();
  setInterval(aiSpawn, 4000);
};

// ---------- MULTIPLAYER ----------
document.getElementById('join-room').onclick = () => {
  roomCode = document.getElementById('room-input').value.trim() || '1234';
  socket.emit('join', roomCode);
};
socket.on('joined', data => {
  playerSide = data.opponent ? 'top' : 'bottom';
  playerDeck = []; for(let i=0;i<4;i++) playerDeck.push(getRandomCard());
  nextCard = getRandomCard();
  startGame();
});
socket.on('ai-fallback',()=>{isAI=true;});
socket.on('spawn',u=>{units.push(u);});
socket.on('end',msg=>{ showWin(msg); });

// ---------- GAME START ----------
function startGame() {
  document.getElementById('home').classList.add('hidden');
  document.getElementById('lobby').classList.add('hidden');
  document.getElementById('ui').classList.remove('hidden');
  gameRunning = true; gameWon = false;
  createCards(); updateElixir(); gameLoop();
}
function createCards() {
  const div = document.getElementById('cards'); div.innerHTML='';
  playerDeck.forEach((c,i)=>{
    const el = document.createElement('div'); el.className='card';
    el.innerHTML=`<img src="${c.img}" onerror="this.src='https://i.imgur.com/5wG5l3A.png'"><div class="cost">${c.cost}</div>`;
    el.onclick=()=>{ if(infiniteElixir||elixir>=c.cost){ if(!infiniteElixir){elixir-=c.cost;updateElixir();}
      spawnUnit(c); playerDeck[i]=nextCard; nextCard=getRandomFromDeck(getCurrentDeck()||cardPool); createCards(); }};
    div.appendChild(el);
  });
}
function updateElixir(){
  document.getElementById('elixir-fill').style.width=(elixir/maxElixir)*100+'%';
  document.getElementById('elixir-text').textContent=infiniteElixir?'∞/10':`${elixir}/${maxElixir}`;
}
function spawnUnit(card){
  const u={type:card.type,x:playerSide==='bottom'?400:400,y:playerSide==='bottom'?500:100,
           side:playerSide==='bottom'?'player':'enemy',hp:card.hp,speed:card.speed,damage:card.damage,target:null};
  units.push(u); socket.emit('spawn',u);
}
function getRandomCard(){ return {...cardPool[Math.floor(Math.random()*cardPool.length)]}; }

// ---------- ADMIN ----------
let isAdmin=false;
document.addEventListener('keydown',e=>{ if(e.key==='\\'){e.preventDefault();openAdmin();}});
function openAdmin(){ if(isAdmin){toggleCheat();return;} const p=prompt('Admin Code:'); if(p==='iamadmin'){isAdmin=true;toggleCheat();alert('Admin ON');}}
function toggleCheat(){document.getElementById('cheat-panel').classList.toggle('hidden');}
function cheat(a,p){
  if(!isAdmin) return;
  if(a==='elixir'){elixir=maxElixir=10;infiniteElixir=false;updateElixir();}
  if(a==='inf'){infiniteElixir=!infiniteElixir;updateElixir();}
  if(a==='spawn'){spawnUnit(cardPool.find(c=>c.type===p)||cardPool[0]);}
  if(a==='tower'){if(p==='left')towers.enemyLeft.hp=0; if(p==='right')towers.enemyRight.hp=0;}
  if(a==='win'){showWin('ADMIN WIN');}
  if(a==='ai'){isAI=!isAI;document.getElementById('ai-status').textContent=isAI?'AI ON':'AI OFF';}
}

// ---------- WIN CELEBRATION ----------
function showWin(msg){
  if(gameWon) return; gameWon=true; gameRunning=false;
  document.getElementById('ui').classList.add('hidden');
  document.getElementById('win').classList.remove('hidden');
  document.querySelector('#win h2').textContent = msg;
  startFireworks();
}
document.getElementById('back-home').onclick = () => {
  document.getElementById('win').classList.add('hidden');
  document.getElementById('home').classList.remove('hidden');
  units=[]; gameWon=false; gameRunning=false;
  initDeckBuilder();
};

// ---------- FIREWORKS ----------
const fwCanvas = document.getElementById('fireworks');
const fwCtx = fwCanvas.getContext('2d');
fwCanvas.width = window.innerWidth; fwCanvas.height = window.innerHeight*0.6;
let particles = [];
function startFireworks(){
  particles=[];
  setInterval(createFirework,250);
  requestAnimationFrame(fwLoop);
}
function createFirework(){
  const x = fwCanvas.width*Math.random();
  const y = fwCanvas.height*Math.random()*0.6;
  const hue = Math.random()*360;
  for(let i=0;i<80;i++){
    const angle = Math.PI*2*i/80;
    const vel = 2+Math.random()*4;
    particles.push({x,y,vx:Math.cos(angle)*vel,vy:Math.sin(angle)*vel-3,life:80,color:`hsl(${hue},100%,50%)`});
  }
}
function fwLoop(){
  fwCtx.fillStyle='rgba(0,0,0,0.2)'; fwCtx.fillRect(0,0,fwCanvas.width,fwCanvas.height);
  particles.forEach((p,i)=>{
    p.x+=p.vx; p.y+=p.vy; p.vy+=0.08; p.life--;
    if(p.life<=0){particles.splice(i,1);return;}
    fwCtx.fillStyle=p.color; fwCtx.fillRect(p.x-2,p.y-2,4,4);
  });
  if(gameWon) requestAnimationFrame(fwLoop);
}

// ---------- AI SPAWN ----------
function aiSpawn(){
  if(!isAI||!gameRunning) return;
  const c = cardPool[Math.floor(Math.random()*cardPool.length)];
  const u={type:c.type,x:400,y:100,side:'enemy',hp:c.hp,speed:c.speed,damage:c.damage,target:null};
  units.push(u); socket.emit('spawn',u);
}

// ---------- GAME LOOP ----------
function gameLoop(){
  if(!gameRunning) return;
  ctx.clearRect(0,0,canvas.width,canvas.height);

  // map
  ctx.fillStyle='#8B4513'; ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle='#3498db'; ctx.fillRect(0,280,canvas.width,40);
  ctx.fillStyle='#D2691E'; ctx.fillRect(200,270,100,60); ctx.fillRect(500,270,100,60);

  // towers
  Object.values(towers).forEach(t=>{
    ctx.fillStyle=t.hp>0?'#f1c40f':'#666';
    ctx.fillRect(t.x-30,t.y-40,60,80);
    ctx.fillStyle='#000'; ctx.font='14px Arial';
    ctx.fillText(t.hp,t.x-15,t.y-45);
  });

  // units
  units.forEach((u,i)=>{
    if(!u.target||u.target.hp<=0){
      const enemies=units.filter(e=>e.side!==u.side&&e.hp>0);
      const enemyT=Object.values(towers).filter(t=>t.side!==u.side&&t.hp>0);
      u.target=enemies[0]||enemyT[0]||null;
    }
    if(u.target){
      const dx=u.target.x-u.x, dy=u.target.y-u.y, dist=Math.hypot(dx,dy);
      if(dist>40){ u.x+=(dx/dist)*u.speed; u.y+=(dy/dist)*u.speed; }
      else if(u.target.hp>0){ u.target.hp-=u.damage; if(u.target.hp<=0) u.target=null; }
    }else{ u.y+=u.side==='player'?-u.speed:u.speed; }

    ctx.fillStyle=u.side==='player'?'#3498db':'#e74c3c';
    ctx.fillRect(u.x-15,u.y-15,30,30);
    if(u.hp<=0) units.splice(i,1);
  });

  // check win
  const pT = [towers.left,towers.right].every(t=>t.hp<=0);
  const eT = [towers.enemyLeft,towers.enemyRight].every(t=>t.hp<=0);
  if(pT) showWin('YOU LOSE!');
  if(eT) showWin('YOU WIN!');

  requestAnimationFrame(gameLoop);
}

// ---------- INIT ----------
initDeckBuilder();
