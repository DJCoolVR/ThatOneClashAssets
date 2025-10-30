// ====================== ThatOneClash – FIXED + MEGA KNIGHT ======================

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = 800; canvas.height = 600;

const socket = io('https://thatoneclash-server.onrender.com', { transports: ['websocket'] });

let isAI = false, playerSide = 'bottom';
let elixir = 10, maxElixir = 10;
let gameRunning = false, gameWon = false;
let playerDeck = [], nextCard = null;
let units = [], towers = {
  left: { x:150, y:400, hp:2000, side:'player' },
  right:{ x:650, y:400, hp:2000, side:'player' },
  enemyLeft:{ x:150, y:200, hp:2000, side:'enemy' },
  enemyRight:{ x:650, y:200, hp:2000, side:'enemy' }
};

const BRIDGE_Y = 320;

// CARD POOL + MEGA KNIGHT
const cardPool = [
  {name:'Knight',cost:3,type:'knight',hp:100,damage:1,speed:1},
  {name:'Archer',cost:3,type:'archer',hp:60,damage:1,speed:1.2},
  {name:'Giant',cost:5,type:'giant',hp:300,damage:1,speed:0.8},
  {name:'Goblin',cost:2,type:'goblin',hp:50,damage:1,speed:1.5},
  {name:'Wizard',cost:5,type:'wizard',hp:80,damage:1,speed:1},
  {name:'Mini P.E.K.K.A',cost:4,type:'minipekka',hp:120,damage:1,speed:1.3},
  {name:'Valkyrie',cost:4,type:'valkyrie',hp:150,damage:1,speed:1},
  {name:'Musketeer',cost:4,type:'musketeer',hp:90,damage:1,speed:1},
  {name:'Baby Dragon',cost:4,type:'babydragon',hp:100,damage:1,speed:1.1},
  {name:'Prince',cost:5,type:'prince',hp:180,damage:1,speed:1.2},
  {name:'Hog Rider',cost:4,type:'hogrider',hp:140,damage:1,speed:1.8},
  {name:'Fireball',cost:4,type:'fireball',hp:0,damage:1,speed:0},
  {name:'Skeleton',cost:1,type:'skeleton',hp:30,damage:1,speed:1.4},
  {name:'Bomber',cost:3,type:'bomber',hp:60,damage:1,speed:1},
  {name:'P.E.K.K.A',cost:7,type:'pekka',hp:400,damage:1,speed:0.7},
  {name:'Minion',cost:3,type:'minion',hp:70,damage:1,speed:1.5},
  {name:'Ice Wizard',cost:3,type:'icewizard',hp:70,damage:1,speed:1},
  {name:'Electro Wizard',cost:4,type:'electrowiz',hp:80,damage:1,speed:1.1},
  {name:'Sparky',cost:6,type:'sparky',hp:200,damage:1,speed:0.6},
  {name:'Lava Hound',cost:7,type:'lavahound',hp:500,damage:1,speed:0.9},
  {name:'Golem',cost:8,type:'golem',hp:600,damage:1,speed:0.6},
  {name:'Mega Knight',cost:7,type:'megaknight',hp:500,damage:1,speed:0.9} // ADDED
];

function loadDeck() {
  const saved = localStorage.getItem('currentDeck');
  return saved ? JSON.parse(saved) : cardPool.slice(0,4);
}

// BUTTONS
document.getElementById('deck-builder-btn').onclick = () => window.location.href = 'deck.html';
document.getElementById('play').onclick = () => {
  playerDeck = loadDeck();
  nextCard = getRandomCard();
  document.getElementById('home').classList.add('hidden');
  document.getElementById('lobby').classList.remove('hidden');
};
document.getElementById('ai-mode').onclick = () => {
  isAI = true; playerSide = 'bottom';
  playerDeck = loadDeck();
  nextCard = getRandomCard();
  startGame();
  setInterval(aiSpawn, 5000);
};

document.getElementById('join-room').onclick = () => {
  const code = document.getElementById('room-input').value.trim() || '1234';
  socket.emit('join', code);
};

socket.on('joined', () => {
  playerSide = 'top';
  playerDeck = loadDeck();
  nextCard = getRandomCard();
  startGame();
});
socket.on('spawn', u => units.push(u));
socket.on('end', msg => showWin(msg));

function startGame() {
  document.getElementById('lobby').classList.add('hidden');
  document.getElementById('ui').classList.remove('hidden');
  gameRunning = true; gameWon = false;
  units = []; resetTowers();
  createCards(); updateElixir(); gameLoop();
}

function resetTowers() {
  Object.values(towers).forEach(t => t.hp = 2000);
}

function getRandomCard() {
  return {...playerDeck[Math.floor(Math.random() * playerDeck.length)]};
}

function createCards() {
  const div = document.getElementById('cards'); div.innerHTML = '';
  playerDeck.forEach((c, i) => {
    const el = document.createElement('div'); el.className = 'card';
    el.innerHTML = `<div>${c.name}</div><div class="cost">${c.cost}</div>`;
    el.onclick = () => {
      if (elixir >= c.cost) {
        elixir -= c.cost; updateElixir();
        spawnUnit(c);
        playerDeck[i] = nextCard;
        nextCard = getRandomCard();
        createCards();
      }
    };
    div.appendChild(el);
  });
}

function updateElixir() {
  document.getElementById('elixir-fill').style.width = (elixir / maxElixir) * 100 + '%';
  document.getElementById('elixir-text').textContent = `${elixir}/${maxElixir}`;
}

function spawnUnit(card) {
  const u = {
    type: card.type, x: 400, y: playerSide === 'bottom' ? 550 : 50,
    side: playerSide === 'bottom' ? 'player' : 'enemy',
    hp: card.hp, speed: card.speed, damage: card.damage, target: null, path: 'start'
  };
  units.push(u); socket.emit('spawn', u);
}

function aiSpawn() {
  if (!isAI || !gameRunning) return;
  const c = cardPool[Math.floor(Math.random() * cardPool.length)];
  const u = { type: c.type, x: 400, y: 50, side: 'enemy', hp: c.hp, speed: c.speed, damage: c.damage, target: null, path: 'start' };
  units.push(u); socket.emit('spawn', u);
}

// PATH SYSTEM
function moveOnPath(u) {
  if (u.path === 'start') {
    if (u.side === 'player') { u.y -= u.speed; if (u.y <= BRIDGE_Y + 20) u.path = 'bridge'; }
    else { u.y += u.speed; if (u.y >= BRIDGE_Y - 20) u.path = 'bridge'; }
  }
  else if (u.path === 'bridge') {
    const targetX = u.side === 'player' ? 400 : 400;
    if (Math.abs(u.x - targetX) > 5) u.x += (targetX - u.x) > 0 ? u.speed : -u.speed;
    else u.path = 'tower';
  }
  else if (u.path === 'tower') {
    const enemyT = Object.values(towers).filter(t => t.side !== u.side && t.hp > 0);
    if (enemyT.length > 0) {
      const closest = enemyT.reduce((a,b) => Math.hypot(a.x-u.x,a.y-u.y) < Math.hypot(b.x-u.x,b.y-u.y) ? a : b);
      const dx = closest.x - u.x, dy = closest.y - u.y, dist = Math.hypot(dx, dy);
      if (dist > 40) { u.x += (dx/dist)*u.speed; u.y += (dy/dist)*u.speed; }
      else { closest.hp -= u.damage; }
    }
  }
}

function showWin(msg) {
  if (gameWon) return;
  gameWon = true; gameRunning = false;
  document.getElementById('ui').classList.add('hidden');
  document.getElementById('win').classList.remove('hidden');
  document.querySelector('#win h2').textContent = msg;
  startFireworks();
}

document.getElementById('back-home').onclick = () => {
  document.getElementById('win').classList.add('hidden');
  document.getElementById('home').classList.remove('hidden');
  gameWon = false; gameRunning = false;
  units = []; resetTowers();
};

// FIREWORKS
const fwCanvas = document.getElementById('fireworks');
const fwCtx = fwCanvas.getContext('2d');
fwCanvas.width = 800; fwCanvas.height = 300;
let particles = [];
function startFireworks() {
  particles = [];
  setInterval(createFirework, 400);
  requestAnimationFrame(fwLoop);
}
function createFirework() {
  const x = fwCanvas.width * Math.random();
  const y = fwCanvas.height * Math.random() * 0.6;
  const hue = Math.random() * 360;
  for(let i=0;i<60;i++){
    const a = Math.PI*2*i/60;
    const v = 2 + Math.random()*3;
    particles.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-2,life:60,color:`hsl(${hue},100%,50%)`});
  }
}
function fwLoop() {
  if (!gameWon) return;
  fwCtx.fillStyle='rgba(0,0,0,0.2)'; fwCtx.fillRect(0,0,fwCanvas.width,fwCanvas.height);
  particles.forEach((p,i)=>{
    p.x+=p.vx; p.y+=p.vy; p.vy+=0.08; p.life--;
    if(p.life<=0){particles.splice(i,1);return;}
    fwCtx.fillStyle=p.color; fwCtx.fillRect(p.x-2,p.y-2,4,4);
  });
  requestAnimationFrame(fwLoop);
}

// GAME LOOP
function gameLoop() {
  if (!gameRunning) return;
  ctx.clearRect(0,0,canvas.width,canvas.height);

  // Map
  ctx.fillStyle = '#8B4513'; ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle = '#3498db'; ctx.fillRect(0,BRIDGE_Y-20,canvas.width,40);
  ctx.fillStyle = '#D2691E'; ctx.fillRect(200,BRIDGE_Y-30,100,60); ctx.fillRect(500,BRIDGE_Y-30,100,60);

  // Towers
  Object.values(towers).forEach(t => {
    ctx.fillStyle = t.hp > 0 ? '#f1c40f' : '#666';
    ctx.fillRect(t.x-30,t.y-40,60,80);
    ctx.fillStyle = '#000'; ctx.font = '14px Arial';
    ctx.fillText(t.hp, t.x-15, t.y-45);
  });

  // Units
  units.forEach((u,i) => {
    moveOnPath(u);
    ctx.fillStyle = u.side === 'player' ? '#3498db' : '#e74c3c';
    ctx.fillRect(u.x-15,u.y-15,30,30);
    if (u.hp <= 0) units.splice(i,1);
  });

  // Win
  const pT = [towers.left,towers.right].every(t=>t.hp<=0);
  const eT = [towers.enemyLeft,towers.enemyRight].every(t=>t.hp<=0);
  if (pT) showWin('YOU LOSE!');
  if (eT) showWin('YOU WIN!');

  requestAnimationFrame(gameLoop);
}

setInterval(() => {
  if (gameRunning && elixir < maxElixir) { elixir++; updateElixir(); }
}, 1500);
