// ====================== ThatOneClash – FULL PATH + COMBAT ======================

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = 800; canvas.height = 600;

const socket = io('https://thatoneclash-server.onrender.com', { transports: ['websocket'] });

let isAI = false, playerSide = 'bottom';
let elixir = 10, maxElixir = 10, infiniteElixir = false;
let gameRunning = false, gameWon = false;
let playerDeck = [], nextCard = null;
let units = [], towers = {
  left: { x:150, y:400, hp:2000, side:'player' },
  right:{ x:650, y:400, hp:2000, side:'player' },
  enemyLeft:{ x:150, y:200, hp:2000, side:'enemy' },
  enemyRight:{ x:650, y:200, hp:2000, side:'enemy' }
};

const BRIDGE_Y = 320;
let dustParticles = [];

// PATH POINTS
const PATH = {
  player: [
    {x:400, y:550},  // spawn
    {x:400, y:BRIDGE_Y + 50}, // bridge entry
    {x:400, y:BRIDGE_Y - 50}, // bridge exit
    {x:400, y:100}   // enemy base
  ],
  enemy: [
    {x:400, y:50},
    {x:400, y:BRIDGE_Y - 50},
    {x:400, y:BRIDGE_Y + 50},
    {x:400, y:500}
  ]
};

// CARD POOL
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
  {name:'Skeleton',cost:1,type:'skeleton',hp:30,damage:1,speed:1.4},
  {name:'Bomber',cost:3,type:'bomber',hp:60,damage:1,speed:1},
  {name:'P.E.K.K.A',cost:7,type:'pekka',hp:400,damage:1,speed:0.7},
  {name:'Minion',cost:3,type:'minion',hp:70,damage:1,speed:1.5},
  {name:'Mega Knight',cost:7,type:'megaknight',hp:500,damage:1,speed:0.9}
];

function loadDeck() {
  const saved = localStorage.getItem('currentDeck');
  return saved ? JSON.parse(saved) : cardPool.slice(0,4);
}

// ADMIN
let isAdmin = false;
let isDragging = false, dragOffset = {x:0, y:0};
const panel = document.getElementById('cheat-panel');
const header = document.getElementById('panel-header');

document.addEventListener('keydown', e => {
  if (e.key === '\\') { e.preventDefault(); openAdmin(); }
});

function openAdmin() {
  if (isAdmin) { toggleCheat(); return; }
  const p = prompt('Admin Code:');
  if (p === 'iamadmin') { isAdmin = true; toggleCheat(); alert('Admin ON'); }
}

function toggleCheat() { panel.classList.toggle('hidden'); }

header.addEventListener('mousedown', e => {
  if (!isAdmin) return;
  isDragging = true;
  const rect = panel.getBoundingClientRect();
  dragOffset.x = e.clientX - rect.left;
  dragOffset.y = e.clientY - rect.top;
});

document.addEventListener('mousemove', e => {
  if (isDragging) {
    panel.style.left = (e.clientX - dragOffset.x) + 'px';
    panel.style.top = (e.clientY - dragOffset.y) + 'px';
  }
});

document.addEventListener('mouseup', () => { isDragging = false; });

function cheat(action) {
  if (!isAdmin) return;
  if (action === 'elixir') { elixir = maxElixir; updateElixir(); }
  if (action === 'inf') { infiniteElixir = !infiniteElixir; updateElixir(); }
  if (action === 'win') { showWin('ADMIN WIN'); }
  if (action === 'ai') { isAI = !isAI; }
}

function spawnMegaKnights() {
  if (!isAdmin) return;
  for (let i = 0; i < 10; i++) {
    const u = {
      type: 'megaknight', x: 200 + i * 40, y: playerSide === 'bottom' ? 550 : 50,
      side: playerSide === 'bottom' ? 'player' : 'enemy',
      hp: 500, speed: 0.9, damage: 1, pathIndex: 0, jump: 0
    };
    units.push(u); socket.emit('spawn', u);
  }
}

// DUST
function createDust(x, y) {
  for (let i = 0; i < 15; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 3;
    dustParticles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2,
      life: 20 + Math.random() * 20,
      size: 2 + Math.random() * 3
    });
  }
}

// GAME LOGIC
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
  units = []; dustParticles = []; resetTowers();
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
      if (infiniteElixir || elixir >= c.cost) {
        if (!infiniteElixir) { elixir -= c.cost; updateElixir(); }
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
  document.getElementById('elixir-text').textContent = infiniteElixir ? 'Infinite/10' : `${elixir}/${maxElixir}`;
}

function spawnUnit(card) {
  const u = {
    type: card.type, x: 400, y: playerSide === 'bottom' ? 550 : 50,
    side: playerSide === 'bottom' ? 'player' : 'enemy',
    hp: card.hp, speed: card.speed, damage: card.damage,
    pathIndex: 0, jump: 0
  };
  units.push(u); socket.emit('spawn', u);
}

function aiSpawn() {
  if (!isAI || !gameRunning) return;
  const c = cardPool[Math.floor(Math.random() * cardPool.length)];
  const u = { type: c.type, x: 400, y: 50, side: 'enemy', hp: c.hp, speed: c.speed, damage: c.damage, pathIndex: 0, jump: 0 };
  units.push(u); socket.emit('spawn', u);
}

// PATH FOLLOWING + COMBAT
function moveUnit(u) {
  // Find target (enemy unit first)
  let target = null;
  let minDist = Infinity;
  units.forEach(other => {
    if (other.side !== u.side && other.hp > 0) {
      const dist = Math.hypot(other.x - u.x, other.y - u.y);
      if (dist < minDist && dist < 80) {
        minDist = dist;
        target = other;
      }
    }
  });

  if (target) {
    // Attack enemy unit
    const dx = target.x - u.x;
    const dy = target.y - u.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 30) {
      u.x += (dx / dist) * u.speed;
      u.y += (dy / dist) * u.speed;
    } else {
      target.hp -= u.damage;
    }
  } else {
    // Follow path
    const path = u.side === 'player' ? PATH.player : PATH.enemy;
    if (u.pathIndex >= path.length) return;

    const point = path[u.pathIndex];
    const dx = point.x - u.x;
    const dy = point.y - u.y;
    const dist = Math.hypot(dx, dy);

    if (dist < 10) {
      u.pathIndex++;
      if (u.pathIndex >= path.length) {
        // Attack tower
        const enemyTowers = Object.values(towers).filter(t => t.side !== u.side && t.hp > 0);
        if (enemyTowers.length > 0) {
          const closest = enemyTowers.reduce((a,b) => 
            Math.hypot(a.x-u.x,a.y-u.y) < Math.hypot(b.x-u.x,b.y-u.y) ? a : b
          );
          const tdx = closest.x - u.x;
          const tdy = closest.y - u.y;
          const tdist = Math.hypot(tdx, tdy);
          if (tdist > 40) {
            u.x += (tdx/tdist) * u.speed;
            u.y += (tdy/tdist) * u.speed;
          } else {
            closest.hp -= u.damage;
          }
        }
      }
    } else {
      u.x += (dx / dist) * u.speed;
      u.y += (dy / dist) * u.speed;
    }

    // MEGA KNIGHT JUMP
    if (u.type === 'megaknight' && u.pathIndex === 1 && !u.jump) {
      if ((u.side === 'player' && u.y <= BRIDGE_Y + 80) || (u.side === 'enemy' && u.y >= BRIDGE_Y - 80)) {
        u.jump = 1;
      }
    }
  }

  // JUMP ANIMATION
  if (u.jump > 0 && u.jump <= 30) {
    u.jump++;
    if (u.jump === 16) {
      createDust(u.x, u.y + 20);
      if (u.side === 'player') u.y = BRIDGE_Y - 50;
      else u.y = BRIDGE_Y + 50;
      u.pathIndex = 2;
    }
    return;
  } else if (u.jump > 30) {
    u.jump = 0;
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
  units = []; dustParticles = []; resetTowers();
};

// FIREWORKS
const fwCanvas = document.getElementById('fireworks');
const fwCtx = fwCanvas.getContext('2d');
fwCanvas.width = 800; fwCanvas.height = 300;
let particles = [];
function startFireworks() {
  particles = [];
  setInterval(() => { for(let i=0;i<3;i++) createFirework(); }, 400);
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

  // Dust
  dustParticles.forEach((p, i) => {
    p.x += p.vx; p.y += p.vy; p.vy += 0.1; p.life--;
    if (p.life <= 0) { dustParticles.splice(i,1); return; }
    ctx.fillStyle = `rgba(139,69,19,${p.life/40})`;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill();
  });

  // Units
  units.forEach((u, i) => {
    moveUnit(u);

    if (u.type === 'megaknight') {
      const jumpPhase = u.jump;
      let scale = 1;
      let shadowY = u.y + 25;
      let shadowSize = 30;

      if (jumpPhase > 0 && jumpPhase <= 30) {
        const t = jumpPhase / 15;
        scale = 1 + 0.5 * Math.sin(t * Math.PI);
        shadowSize = 30 * (1 - t * 0.6);
        shadowY = u.y + 25 + t * 60;
      }

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath();
      ctx.ellipse(u.x, shadowY, shadowSize, shadowSize * 0.3, 0, 0, Math.PI*2);
      ctx.fill();

      // Mega Knight
      ctx.save();
      ctx.translate(u.x, u.y);
      ctx.scale(scale, scale);
      ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    } else {
      ctx.fillStyle = u.side === 'player' ? '#3498db' : '#e74c3c';
      ctx.fillRect(u.x-15,u.y-15,30,30);
    }

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
  if (gameRunning && !infiniteElixir && elixir < maxElixir) {
    elixir++; updateElixir();
  }
}, 1500);
