```javascript
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 800;
canvas.height = 600;

let elixir = 0;
const maxElixir = 10;
let elixirInterval;
let playerTowers = [ { x: 200, y: 500, hp: 1000 }, { x: 600, y: 500, hp: 1000 } ];
let enemyTowers = [ { x: 200, y: 100, hp: 1000 }, { x: 600, y: 100, hp: 1000 } ];

let troops = [];
let cards = [
  { name: 'Knight', cost: 3, hp: 200, dmg: 30, speed: 1.5 },
  { name: 'Archer', cost: 2, hp: 100, dmg: 20, speed: 2 },
  { name: 'Giant', cost: 5, hp: 400, dmg: 50, speed: 1 },
  { name: 'Mini P.E.K.K.A', cost: 4, hp: 250, dmg: 60, speed: 1.8 },
  { name: 'Bomber', cost: 3, hp: 120, dmg: 40, speed: 2 },
  { name: 'Musketeer', cost: 4, hp: 150, dmg: 45, speed: 2 },
  { name: 'Prince', cost: 5, hp: 300, dmg: 70, speed: 2.2 },
  { name: 'Baby Dragon', cost: 4, hp: 200, dmg: 35, speed: 2 },
  { name: 'Wizard', cost: 5, hp: 160, dmg: 50, speed: 2 },
  { name: 'Hog Rider', cost: 4, hp: 180, dmg: 55, speed: 2.5 }
];

let currentCard = null;

function drawTowers() {
  ctx.fillStyle = '#ffcc00';
  playerTowers.forEach(t => ctx.fillRect(t.x - 25, t.y - 25, 50, 50));
  ctx.fillStyle = '#ff0000';
  enemyTowers.forEach(t => ctx.fillRect(t.x - 25, t.y - 25, 50, 50));
}

function drawTroops() {
  troops.forEach(t => {
    ctx.fillStyle = t.team === 'player' ? 'cyan' : 'red';
    ctx.beginPath();
    ctx.arc(t.x, t.y, 10, 0, Math.PI * 2);
    ctx.fill();
  });
}

function updateTroops() {
  troops.forEach(t => {
    let targetY = t.team === 'player' ? t.y - t.speed : t.y + t.speed;
    t.y = targetY;

    // Basic attack range
    if (t.team === 'player') {
      enemyTowers.forEach(twr => {
        if (Math.abs(t.x - twr.x) < 30 && Math.abs(t.y - twr.y) < 30) {
          twr.hp -= t.dmg;
        }
      });
    } else {
      playerTowers.forEach(twr => {
        if (Math.abs(t.x - twr.x) < 30 && Math.abs(t.y - twr.y) < 30) {
          twr.hp -= t.dmg;
        }
      });
    }
  });
}

function drawElixir() {
  const percent = (elixir / maxElixir) * 100;
  document.getElementById('elixirFill').style.width = `${percent}%`;
}

function gainElixir() {
  elixirInterval = setInterval(() => {
    if (elixir < maxElixir) {
      elixir += 0.1;
      drawElixir();
    }
  }, 200);
}

document.querySelectorAll('.card').forEach((c, i) => {
  c.textContent = cards[i].name;
  c.onclick = () => {
    currentCard = cards[i];
  };
});

canvas.addEventListener('click', e => {
  if (!currentCard) return;
  if (elixir >= currentCard.cost && e.offsetY > canvas.height / 2) {
    elixir -= currentCard.cost;
    drawElixir();
    troops.push({ ...currentCard, x: e.offsetX, y: e.offsetY, team: 'player' });
    currentCard = null;
  }
});

function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawTowers();
  updateTroops();
  drawTroops();
  requestAnimationFrame(gameLoop);
}

gainElixir();
gameLoop();
```
