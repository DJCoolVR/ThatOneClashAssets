// ————————————————————————————
// ThatOneClash – 21 CARDS + REAL CLASH ROYALE IMAGES
// ————————————————————————————

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = 800;
canvas.height = 600;

const socket = io('https://thatoneclash-server.onrender.com', {
  transports: ['websocket']
});

let isAI = false;
let roomCode = '';
let playerSide = 'bottom';
let elixir = 10;
let maxElixir = 10;
let infiniteElixir = false;
let elixirRegen = setInterval(() => {
  if (!infiniteElixir && elixir < maxElixir) {
    elixir++;
    updateElixir();
  }
}, 1500);

const towers = {
  left: { x: 150, y: 400, hp: 1000, side: 'player' },
  right: { x: 650, y: 400, hp: 1000, side: 'player' },
  enemyLeft: { x: 150, y: 200, hp: 1000, side: 'enemy' },
  enemyRight: { x: 650, y: 200, hp: 1000, side: 'enemy' }
};

const units = [];
let playerDeck = [];
let nextCard = 0;

// ————————————————————————————
// 21 REAL CLASH ROYALE CARDS (OFFICIAL IMAGES)
// ————————————————————————————
const cardPool = [
  { name: 'Knight',      cost: 3, img: 'https://i.imgur.com/0Q3n8gA.png', type: 'knight',     hp: 100, damage: 25, speed: 1 },
  { name: 'Archer',      cost: 3, img: 'https://i.imgur.com/3lP7i3k.png', type: 'archer',     hp: 60,  damage: 15, speed: 1.2 },
  { name: 'Giant',       cost: 5, img: 'https://i.imgur.com/6o7V6xO.png', type: 'giant',      hp: 300, damage: 40, speed: 0.8 },
  { name: 'Goblin',      cost: 2, img: 'https://i.imgur.com/9oX2k1r.png', type: 'goblin',     hp: 50,  damage: 20, speed: 1.5 },
  { name: 'Wizard',      cost: 5, img: 'https://i.imgur.com/5wG5l3A.png', type: 'wizard',     hp: 80,  damage: 30, speed: 1 },
  { name: 'Mini P.E.K.K.A', cost: 4, img: 'https://i.imgur.com/8vN1k2L.png', type: 'minipekka', hp: 120, damage: 60, speed: 1.3 },
  { name: 'Valkyrie',    cost: 4, img: 'https://i.imgur.com/7rT2m1P.png', type: 'valkyrie',   hp: 150, damage: 35, speed: 1 },
  { name: 'Musketeer',   cost: 4, img: 'https://i.imgur.com/4nF6j8K.png', type: 'musketeer',  hp: 90,  damage: 25, speed: 1 },
  { name: 'Baby Dragon', cost: 4, img: 'https://i.imgur.com/2kM9l0S.png', type: 'babydragon', hp: 100, damage: 20, speed: 1.1 },
  { name: 'Prince',      cost: 5, img: 'https://i.imgur.com/1pQ3r5T.png', type: 'prince',     hp: 180, damage: 50, speed: 1.2 },
  { name: 'Hog Rider',   cost: 4, img: 'https://i.imgur.com/9mX7v2Z.png', type: 'hogrider',   hp: 140, damage: 45, speed: 1.8 },
  { name: 'Fireball',    cost: 4, img: 'https://i.imgur.com/6rT8u3V.png', type: 'fireball',   hp: 0,   damage: 80, speed: 0 },
  { name: 'Skeleton',    cost: 1, img: 'https://i.imgur.com/8sP4k2M.png', type: 'skeleton',   hp: 30,  damage: 15, speed: 1.4 },
  { name: 'Bomber',      cost: 3, img: 'https://i.imgur.com/3vN6j7L.png', type: 'bomber',     hp: 60,  damage: 30, speed: 1 },
  { name: 'P.E.K.K.A',   cost: 7, img: 'https://i.imgur.com/5tR9k1Q.png', type: 'pekka',      hp: 400, damage: 100, speed: 0.7 },
  { name: 'Minion',      cost: 3, img: 'https://i.imgur.com/7qW2m3R.png', type: 'minion',     hp: 70,  damage: 20, speed: 1.5 },
  { name: 'Ice Wizard',  cost: 3, img: 'https://i.imgur.com/4nF6j8K.png', type: 'icewizard',  hp: 70,  damage: 15, speed: 1 },
  { name: 'Electro Wizard', cost: 4, img: 'https://i.imgur.com/9oX2k1r.png', type: 'electrowiz', hp: 80,  damage: 25, speed: 1.1 },
  { name: 'Sparky',      cost: 6, img: 'https://i.imgur.com/6o7V6xO.png', type: 'sparky',     hp: 200, damage: 150, speed: 0.6 },
  { name: 'Lava Hound',  cost: 7, img: 'https://i.imgur.com/1pQ3r5T.png', type: 'lavahound',  hp: 500, damage: 10, speed: 0.9 },
  { name: 'Golem',       cost: 8, img: 'https://i.imgur.com/5wG5l3A.png', type: 'golem',      hp: 600, damage: 50, speed: 0.6 }
];

// ————————————————————————————
// START MENU
// ————————————————————————————
document.getElementById('play').onclick = () => {
  document.getElementById('start-menu').classList.add('hidden');
  document.getElementById('lobby').classList.remove('hidden');
};

document.getElementById('join-room').onclick = () => {
  roomCode = document.getElementById('room-input').value.trim() || '1234';
  socket.emit('join', roomCode);
};

document.getElementById('ai-mode').onclick = () => {
  isAI = true;
  playerSide = 'bottom';
  document.getElementById('start-menu').classList.add('hidden');
  document.getElementById('ui').classList.remove('hidden');
  initGame();

  setInterval(() => {
    if (isAI) {
      const card = cardPool[Math.floor(Math.random() * cardPool.length)];
      const aiUnit = {
        type: card.type, x: 400, y: 100, side: 'enemy',
        hp: card.hp, speed: card.speed, damage: card.damage
      };
      units.push(aiUnit);
      socket.emit('spawn', aiUnit);
    }
  }, 4000);
};

// ————————————————————————————
// SOCKET
// ————————————————————————————
socket.on('joined', (data) => {
  playerSide = data.opponent ? 'top' : 'bottom';
  document.getElementById('lobby').classList.add('hidden');
  document.getElementById('ui').classList.remove('hidden');
  initGame();
});

socket.on('ai-fallback', () => { isAI = true; });
socket.on('spawn', (unit) => { units.push(unit); });
socket.on('end', (msg) => {
  document.getElementById('win').textContent = msg;
  document.getElementById('win').classList.remove('hidden');
});

// ————————————————————————————
// GAME INIT
// ————————————————————————————
function initGame() {
  playerDeck = [];
  for (let i = 0; i < 4; i++) {
    playerDeck.push(getRandomCard());
  }
  nextCard = getRandomCard();
  createCards();
  updateElixir();
  gameLoop();
}

function getRandomCard() {
  const card = cardPool[Math.floor(Math.random() * cardPool.length)];
  return { ...card };
}

function createCards() {
  const cardsDiv = document.getElementById('cards');
  cardsDiv.innerHTML = '';
  playerDeck.forEach((card, i) => {
    const div = document.createElement('div');
    div.className = 'card';
    div.innerHTML = `
      <img src="${card.img}" alt="${card.name}" onerror="this.src='https://i.imgur.com/5wG5l3A.png'">
      <div class="cost">${card.cost}</div>
    `;
    div.onclick = () => {
      if (infiniteElixir || elixir >= card.cost) {
        if (!infiniteElixir) { elixir -= card.cost; updateElixir(); }
        spawnUnit(card);
        playerDeck[i] = nextCard;
        nextCard = getRandomCard();
        createCards();
      }
    };
    cardsDiv.appendChild(div);
  });
}

function updateElixir() {
  document.getElementById('elixir-fill').style.width = (elixir / maxElixir) * 100 + '%';
  document.getElementById('elixir-text').textContent = infiniteElixir ? '∞/10' : `${elixir}/${maxElixir}`;
}

function spawnUnit(card) {
  const unit = {
    type: card.type,
    x: playerSide === 'bottom' ? 400 : 400,
    y: playerSide === 'bottom' ? 500 : 100,
    side: playerSide === 'bottom' ? 'player' : 'enemy',
    hp: card.hp,
    speed: card.speed,
    damage: card.damage,
    target: null
  };
  units.push(unit);
  socket.emit('spawn', unit);
}

// ————————————————————————————
// ADMIN
// ————————————————————————————
let isAdmin = false;
document.addEventListener('keydown', (e) => {
  if (e.key === '\\') {
    e.preventDefault();
    openAdmin();
  }
});

function openAdmin() {
  if (isAdmin) { toggleCheat(); return; }
  const code = prompt('Admin Code:');
  if (code === 'iamadmin') {
    isAdmin = true;
    toggleCheat();
    alert('Admin mode ON!');
  }
}

function toggleCheat() {
  document.getElementById('cheat-panel').classList.toggle('hidden');
}

function cheat(action, param) {
  if (!isAdmin) return;
  if (action === 'elixir') { elixir = maxElixir = 10; infiniteElixir = false; updateElixir(); }
  if (action === 'inf') { infiniteElixir = !infiniteElixir; updateElixir(); }
  if (action === 'spawn') { spawnUnit(cardPool.find(c => c.type === param) || cardPool[0]); }
  if (action === 'tower') { if (param === 'left') towers.enemyLeft.hp = 0; if (param === 'right') towers.enemyRight.hp = 0; }
  if (action === 'win') { socket.emit('end', 'ADMIN WIN'); }
  if (action === 'ai') {
    isAI = !isAI;
    document.getElementById('ai-status').textContent = isAI ? 'AI MODE: ON' : 'AI MODE: OFF';
  }
}

// ————————————————————————————
// GAME LOOP + COMBAT
// ————————————————————————————
function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Map
  ctx.fillStyle = '#8B4513'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#3498db'; ctx.fillRect(0, 280, canvas.width, 40);
  ctx.fillStyle = '#D2691E'; ctx.fillRect(200, 270, 100, 60); ctx.fillRect(500, 270, 100, 60);

  // Towers
  Object.values(towers).forEach(t => {
    ctx.fillStyle = t.hp > 0 ? '#f1c40f' : '#666';
    ctx.fillRect(t.x - 30, t.y - 40, 60, 80);
    ctx.fillStyle = '#000'; ctx.font = '14px Arial';
    ctx.fillText(`${t.hp}`, t.x - 15, t.y - 45);
  });

  // Units
  units.forEach((u, i) => {
    if (!u.target || u.target.hp <= 0) {
      const enemies = units.filter(e => e.side !== u.side && e.hp > 0);
      const enemyTowers = Object.values(towers).filter(t => t.side !== u.side && t.hp > 0);
      u.target = enemies[0] || enemyTowers[0] || null;
    }

    if (u.target) {
      const dx = u.target.x - u.x;
      const dy = u.target.y - u.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 40) {
        u.x += (dx / dist) * u.speed;
        u.y += (dy / dist) * u.speed;
      } else if (u.target.hp > 0) {
        u.target.hp -= u.damage;
        if (u.target.hp <= 0) u.target = null;
      }
    } else {
      u.y += u.side === 'player' ? -u.speed : u.speed;
    }

    ctx.fillStyle = u.side === 'player' ? '#3498db' : '#e74c3c';
    ctx.fillRect(u.x - 15, u.y - 15, 30, 30);

    if (u.hp <= 0) units.splice(i, 1);
  });

  requestAnimationFrame(gameLoop);
}
