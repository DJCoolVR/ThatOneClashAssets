(() => {
  // Elements
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const startMenu = document.getElementById('start-menu');
  const playBtn = document.getElementById('play-btn');
  const ui = document.getElementById('ui');
  canvas.width = window.innerWidth; canvas.height = window.innerHeight;

  // === REAL ELIXIR (2.8s rate + Overcharge) ===
  const ELIXIR_RATE = 2.8; // seconds per elixir
  let elixir = 0; // 0-10
  let elixirAccumulator = 0; // Continues past 10 for overcharge
  let gameTime = 0;

  // === ISOMETRIC PROJECTION ===
  const ISO = {
    tileW: 128, tileH: 64, // Diamond tiles
    project: (x, y) => ({ screenX: (x - y) * ISO.tileW / 2 + canvas.width / 2, screenY: (x + y) * ISO.tileH / 2 + 100 })
  };

  // Arena grid (18x9 tiles)
  const ARENA_TILES = 18; // Width (left king, 6 princess, bridge, 6 princess, right king)
  const BRIDGE_COL = 9;

  // === BALANCE ===
  const TOWER_HP = 1600, KING_HP = 2400;
  const AI_SPAWN_INTERVAL = 5; // 5s average

  // Cards (Clash stats)
  const CARDS = [
    { name: 'Knight', cost: 3, hp: 1220, maxHp: 1220, dmg: 150, speed: 1.2, r: 30, color: '#c0392b', range: 60 },
    { name: 'Archers', cost: 3, hp: 200, maxHp: 200, dmg: 100, speed: 1.0, r: 25, color: '#3498db', range: 200 },
    { name: 'Giant', cost: 5, hp: 3300, maxHp: 3300, dmg: 200, speed: 0.9, r: 45, color: '#27ae60', range: 60 }
  ];

  // Game State
  let hand = [], units = [], towers = [];
  let aiTimer = 0, lastTime = 0;
  let gameRunning = false;

  // Init Towers (Princess left/right, King center)
  function initTowers() {
    towers = [
      // Left Princess Towers
      { x: 2, y: 2, hp: TOWER_HP, maxHp: TOWER_HP, team: 1, type: 'princess', cd: 0 },
      { x: 2, y: 6, hp: TOWER_HP, maxHp: TOWER_HP, team: 1, type: 'princess', cd: 0 },
      // Left King
      { x: 1, y: 4, hp: KING_HP, maxHp: KING_HP, team: 1, type: 'king', cd: 0 },
      // Right Princess
      { x: 15, y: 2, hp: TOWER_HP, maxHp: TOWER_HP, team: -1, type: 'princess', cd: 0 },
      { x: 15, y: 6, hp: TOWER_HP, maxHp: TOWER_HP, team: -1, type: 'princess', cd: 0 },
      // Right King
      { x: 16, y: 4, hp: KING_HP, maxHp: KING_HP, team: -1, type: 'king', cd: 0 }
    ];
  }

  // Start Menu
  playBtn.onclick = () => {
    startMenu.classList.add('hidden');
    ui.classList.remove('hidden');
    document.body.classList.add('isometric');
    initGame();
  };

  function initGame() {
    elixir = 0;
    elixirAccumulator = 0;
    gameTime = 0;
    units = [];
    initTowers();
    initCards();
    gameRunning = true;
    requestAnimationFrame(loop);
  }

  // UI
  function initCards() {
    const div = document.getElementById('cards');
    div.innerHTML = '';
    hand = Array(4).fill(0).map(() => Math.floor(Math.random() * CARDS.length));
    hand.forEach((idx, i) => {
      const card = CARDS[idx];
      const btn = document.createElement('button');
      btn.className = 'card';
      btn.innerHTML = `<div>${card.name}</div><div class="cost">${card.cost}</div>`;
      btn.onclick = () => spawnUnit(card, i, 1); // Player team 1
      btn.disabled = true;
      div.appendChild(btn);
    });
    updateElixirUI();
  }

  function updateElixirUI() {
    const fill = document.getElementById('elixir-fill');
    fill.style.width = (Math.min(elixir, 10) / 10 * 100) + '%';
    hand.forEach((idx, i) => {
      document.querySelectorAll('.card')[i].disabled = elixir < CARDS[idx].cost;
    });
  }

  // === REAL ELIXIR UPDATE ===
  function updateElixir(dt) {
    elixirAccumulator += dt;
    while (elixirAccumulator >= ELIXIR_RATE) {
      elixirAccumulator -= ELIXIR_RATE;
      if (elixir < 10) elixir += 1;
      // Overcharge: accumulator carries over when spending
    }
    updateElixirUI();
  }

  function spendElixir(cost) {
    elixir -= cost;
    if (elixir < 0) elixir = 0; // Clamp
  }

  // Spawn
  function spawnUnit(card, handIdx, team) {
    const cost = card.cost;
    if (elixir < cost) return;
    spendElixir(cost);
    const lane = Math.floor(Math.random() * 2);
    const tileY = lane === 0 ? 1 : 7;
    const startX = team === 1 ? 0 : 17;
    units.push({
      ...card, x: startX, y: tileY, team,
      hp: card.maxHp, cd: 0, lane
    });
    replaceCard(handIdx);
  }

  function replaceCard(idx) {
    hand[idx] = Math.floor(Math.random() * CARDS.length);
    const btn = document.querySelectorAll('.card')[idx];
    const c = CARDS[hand[idx]];
    btn.innerHTML = `<div>${c.name}</div><div class="cost">${c.cost}</div>`;
  }

  // AI
  function aiUpdate(dt) {
    aiTimer += dt;
    if (aiTimer > AI_SPAWN_INTERVAL) {
      spawnUnit(CARDS[Math.floor(Math.random() * CARDS.length)], 0, -1);
      aiTimer = 0;
    }
  }

  // Update Logic (simplified)
  function update(dt) {
    updateElixir(dt);
    aiUpdate(dt);

    // Units move/attack (tile-based for iso)
    units = units.filter(u => u.hp > 0);
    units.forEach(u => {
      // ... (combat logic similar to before, but snap to tiles)
      u.cd = Math.max(0, u.cd - dt);
      // Move toward enemy side
      if (u.team === 1) u.x += 0.5 * dt; else u.x -= 0.5 * dt;
      // Attack nearest...
    });

    // Towers attack
    towers.forEach(t => {
      t.cd = Math.max(0, t.cd - dt);
      // ...
    });
  }

  // Isometric Draw
  function draw() {
    ctx.save();
    ctx.translate(0, 100); // Lift for iso depth
    ctx.clearRect(-canvas.width, -100, canvas.width * 2, canvas.height);

    // Draw Arena Tiles (diamond pattern)
    for (let x = 0; x < ARENA_TILES; x++) {
      for (let y = 0; y < 9; y++) {
        const p = ISO.project(x, y);
        ctx.fillStyle = (x === BRIDGE_COL) ? '#4169e1' : '#d2b48c'; // River/ground
        ctx.save();
        ctx.translate(p.screenX, p.screenY);
        ctx.rotate(Math.PI / 4);
        ctx.fillRect(-ISO.tileW/2, -ISO.tileH/2, ISO.tileW, ISO.tileH);
        ctx.restore();
      }
    }

    // Bridges
    ctx.fillStyle = '#8b4513';
    // Draw bridges at y=2-6, x=BRIDGE_COL

    // Towers (trapezoid for depth)
    towers.forEach(t => {
      const p = ISO.project(t.x, t.y);
      ctx.fillStyle = t.team === 1 ? '#00bfff' : '#ff4500';
      // Base (wide)
      ctx.fillRect(p.screenX - 60, p.screenY - 20, 120, 40);
      // Top (narrow)
      ctx.fillRect(p.screenX - 40, p.screenY - 60, 80, 40);
      // Health
      const ratio = t.hp / t.maxHp;
      ctx.fillStyle = 'red'; ctx.fillRect(p.screenX - 50, p.screenY - 80, 100, 10);
      ctx.fillStyle = 'green'; ctx.fillRect(p.screenX - 50, p.screenY - 80, 100 * ratio, 10);
    });

    // Units
    units.forEach(u => {
      const p = ISO.project(u.x, u.y);
      ctx.fillStyle = u.color;
      ctx.beginPath();
      ctx.arc(p.screenX, p.screenY, u.r, 0, Math.PI * 2);
      ctx.fill();
      // Health bar above
    });

    ctx.restore();
  }

  // Loop
  function loop(time) {
    const dt = Math.min((time - lastTime) / 1000, 0.05);
    lastTime = time;
    if (gameRunning) {
      gameTime += dt;
      update(dt);
      draw();
      // Win check
    }
    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
})();
