// ————————————————————————————
// ThatOneClash – FULL GAME LOGIC
// Card Images + Elixir Cost + Admin (\)
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

// CARD DATA WITH REAL IMAGES
const cards = [
  { name: 'Knight', cost: 3, img: 'https://i.imgur.com/5wG5l3A.png', spawn: () => spawnUnit('knight') },
  { name: 'Archer', cost: 3, img: 'https://i.imgur.com/5wG5l3A.png', spawn: () => spawnUnit('archer') },
  { name: 'Giant',  cost: 5, img: 'https://i.imgur.com/5wG5l3A.png', spawn: () => spawnUnit('giant') }
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

// ————————————————————————————
// AI MODE BUTTON
// ————————————————————————————
document.getElementById('ai-mode').onclick = () => {
  isAI = true;
  playerSide = 'bottom';
  document.getElementById('start-menu').classList.add('hidden');
  document.getElementById('ui').classList.remove('hidden');
  initGame();

  setInterval(() => {
    if (isAI) {
      const aiUnit = { type: 'knight', x: 400, y: 100, side: 'enemy', hp: 100, speed: 1 };
      units.push(aiUnit);
      socket.emit('spawn', aiUnit);
    }
  }, 5000);
};

// ————————————————————————————
// SOCKET.IO
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
  createCards();
  updateElixir();
  gameLoop();
}

function createCards() {
  const cardsDiv = document.getElementById('cards');
  cardsDiv.innerHTML = '';
  cards.forEach((card) => {
    const div = document.createElement('div');
    div.className = 'card';
    div.innerHTML = `
      <img src="${card.img}" alt="${card.name}">
      <div class="cost">${card.cost}</div>
    `;
    div.onclick = () => {
      if (infiniteElixir || elixir >= card.cost) {
        if (!infiniteElixir) { elixir -= card.cost; updateElixir(); }
        card.spawn();
      }
    };
    cardsDiv.appendChild(div);
  });
}

function updateElixir() {
  document.getElementById('elixir-fill').style.width = (elixir / maxElixir) * 100 + '%';
  document.getElementById('elixir-text').textContent = infiniteElixir ? '∞/10' : `${elixir}/${maxElixir}`;
}

function spawnUnit(type) {
  const unit = {
    type,
    x: playerSide === 'bottom' ? 400 : 400,
    y: playerSide === 'bottom' ? 500 : 100,
    side: playerSide === 'bottom' ? 'player' : 'enemy',
    hp: 100,
    speed: 1
  };
  units.push(unit);
  socket.emit('spawn', unit);
}

// ————————————————————————————
// ADMIN PANEL (\ key)
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
  if (action === 'spawn') { spawnUnit(param); }
  if (action === 'tower') { if (param === 'left') towers.enemyLeft.hp = 0; if (param === 'right') towers.enemyRight.hp = 0; }
  if (action === 'win') { socket.emit('end', 'ADMIN WIN'); }
  if (action === 'ai') {
    isAI = !isAI;
    document.getElementById('ai-status').textContent = isAI ? 'AI MODE: ON' : 'AI MODE: OFF';
  }
}

// ————————————————————————————
// GAME LOOP + OLD MAP
// ————————————————————————————
function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Brown ground
  ctx.fillStyle = '#8B4513';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // River
  ctx.fillStyle = '#3498db';
  ctx.fillRect(0, 280, canvas.width, 40);

  // Bridges
  ctx.fillStyle = '#D2691E';
  ctx.fillRect(200, 270, 100, 60);
  ctx.fillRect(500, 270, 100, 60);

  // Towers
  Object.values(towers).forEach(t => {
    ctx.fillStyle = t.hp > 0 ? '#f1c40f' : '#666';
    ctx.fillRect(t.x - 30, t.y - 40, 60, 80);
    ctx.fillStyle = '#000';
    ctx.font = '14px Arial';
    ctx.fillText(`${t.hp}`, t.x - 15, t.y - 45);
  });

  // Units
  units.forEach(u => {
    ctx.fillStyle = u.side === 'player' ? '#3498db' : '#e74c3c';
    ctx.fillRect(u.x - 15, u.y - 15, 30, 30);
    u.y += u.side === 'player' ? -u.speed : u.speed;
  });

  requestAnimationFrame(gameLoop);
}
