(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  canvas.width = 900; canvas.height = 600;

  // === BALANCE SETTINGS ===
  const ELIXIR = { max: 10, regenTime: 2.8 }; // 1 elixir every 2.8 sec
  const TOWER = { hp: 500, dmg: 50, range: 120, cd: 2 };
  const AI_SPAWN = { min: 4, max: 7 }; // seconds between AI spawns

  // === CARD DEFINITIONS ===
  const CARDS = [
    { name: 'Knight', cost: 3, hp: 120, maxHp: 120, dmg: 20, speed: 1.2, r: 22, color: '#e74c3c' },
    { name: 'Archer', cost: 3, hp: 60,  maxHp: 60,  dmg: 12, speed: 1.5, r: 18, color: '#3498db', range: 180 },
    { name: 'Giant',  cost: 5, hp: 300, maxHp: 300, dmg: 30, speed: 0.8, r: 30, color: '#27ae60' }
  ];

  // === GAME STATE ===
  let elixir = 0, elixirTimer = 0;
  let aiSpawnTimer = 0;
  let hand = [], units = [];
  const leftTower  = { x: 150, y: 300, hp: TOWER.hp, team: 1, cd: 0 };
  const rightTower = { x: 750, y: 300, hp: TOWER.hp, team: -1, cd: 0 };
  let lastTime = 0;

  // === UI: Build Cards ===
  function initCards() {
    const div = document.getElementById('cards');
    div.innerHTML = '';
    hand = [];
    for (let i = 0; i < 4; i++) {
      const idx = Math.floor(Math.random() * CARDS.length);
      hand.push(idx);
      const card = CARDS[idx];
      const btn = document.createElement('button');
      btn.className = 'card';
      btn.innerHTML = `<div>${card.name}</div><div class="cost">${card.cost}</div>`;
      btn.onclick = () => spawnPlayerUnit(card, i);
      btn.disabled = true;
      div.appendChild(btn);
    }
    updateElixirUI();
  }

  function updateElixirUI() {
    document.getElementById('elixir').textContent = Math.floor(elixir);
    hand.forEach((idx, i) => {
      document.querySelectorAll('.card')[i].disabled = elixir < CARDS[idx].cost;
    });
  }

  // === SPAWN PLAYER UNIT ===
  function spawnPlayerUnit(card, handIdx) {
    if (elixir < card.cost) return;
    elixir -= card.cost;
    const y = 200 + Math.random() * 200;
    units.push({
      ...card,
      x: 100, y,
      team: 1,
      hp: card.maxHp,
      cd: 0
    });
    replaceCard(handIdx);
    updateElixirUI();
  }

  function replaceCard(idx) {
    const newIdx = Math.floor(Math.random() * CARDS.length);
    hand[idx] = newIdx;
    const btn = document.querySelectorAll('.card')[idx];
    const c = CARDS[newIdx];
    btn.innerHTML = `<div>${c.name}</div><div class="cost">${c.cost}</div>`;
  }

  // === AI SPAWN (BALANCED) ===
  function trySpawnAI(dt) {
    aiSpawnTimer += dt;
    if (aiSpawnTimer >= AI_SPAWN.min + Math.random() * (AI_SPAWN.max - AI_SPAWN.min)) {
      const card = CARDS[Math.floor(Math.random() * CARDS.length)];
      const y = 200 + Math.random() * 200;
      units.push({
        ...card,
        x: 800, y,
        team: -1,
        hp: card.maxHp,
        cd: 0
      });
      aiSpawnTimer = 0;
    }
  }

  // === MAIN GAME LOOP ===
  function loop(time) {
    const dt = Math.min((time - lastTime) / 1000, 0.1);
    lastTime = time;

    // --- Elixir Regen ---
    elixirTimer += dt;
    if (elixirTimer >= ELIXIR.regenTime) {
      elixir = Math.min(elixir + 1, ELIXIR.max);
      elixirTimer = 0;
      updateElixirUI();
    }

    // --- AI Spawn ---
    trySpawnAI(dt);

    // --- Update Units ---
    units = units.filter(u => u.hp > 0);
    units.forEach(u => {
      if (u.cd > 0) u.cd -= dt;

      let target = null;
      let minDist = u.range || 50;

      // Find closest enemy unit
      units.forEach(e => {
        if (e.team === u.team) return;
        const d = Math.hypot(u.x - e.x, u.y - e.y);
        if (d < minDist) { minDist = d; target = e; }
      });

      // If no unit, target enemy tower
      const enemyTower = u.team === 1 ? rightTower : leftTower;
      const towerDist = Math.hypot(u.x - enemyTower.x, u.y - enemyTower.y);
      if (towerDist < minDist) {
        minDist = towerDist;
        target = enemyTower;
      }

      // Attack if in range
      if (target && u.cd <= 0) {
        target.hp -= u.dmg * dt;
        u.cd = 1; // 1 sec attack cooldown
      }
      // Move if no target or out of range
      else if (!target || minDist > (u.range || 50)) {
        u.x += u.speed * u.team * 60 * dt; // 60 px/sec base speed
      }
    });

    // --- Towers Attack ---
    [leftTower, rightTower].forEach(t => {
      if (t.cd > 0) { t.cd -= dt; return; }
      let target = null, minD = TOWER.range;
      units.forEach(u => {
        if (u.team === t.team) return;
        const d = Math.hypot(t.x - u.x, t.y - u.y);
        if (d < minD) { minD = d; target = u; }
      });
      if (target) {
        target.hp -= TOWER.dmg;
        t.cd = TOWER.cd;
      }
    });

    // --- DRAW ---
    ctx.fillStyle = '#8b5a2b'; ctx.fillRect(0, 0, 900, 600); // Arena
    ctx.fillStyle = '#2980b9'; ctx.fillRect(430, 0, 40, 600); // River

    // Draw Towers
    [leftTower, rightTower].forEach(t => {
      ctx.fillStyle = '#7f8c8d';
      ctx.fillRect(t.x - 30, t.y - 40, 60, 80);
      const ratio = t.hp / TOWER.hp;
      ctx.fillStyle = '#c0392b'; ctx.fillRect(t.x - 35, t.y - 55, 70, 8);
      ctx.fillStyle = '#27ae60'; ctx.fillRect(t.x - 35, t.y - 55, 70 * ratio, 8);
    });

    // Draw Units
    units.forEach(u => {
      ctx.fillStyle = u.color;
      ctx.beginPath(); ctx.arc(u.x, u.y, u.r, 0, Math.PI * 2); ctx.fill();

      const ratio = u.hp / u.maxHp;
      ctx.fillStyle = '#c0392b'; ctx.fillRect(u.x - u.r, u.y - u.r - 12, u.r * 2, 5);
      ctx.fillStyle = '#27ae60'; ctx.fillRect(u.x - u.r, u.y - u.r - 12, u.r * 2 * ratio, 5);
    });

    // --- WIN CHECK ---
    if (leftTower.hp <= 0) endGame('Right Wins!');
    else if (rightTower.hp <= 0) endGame('Left Wins!');

    requestAnimationFrame(loop);
  }

  function endGame(msg) {
    const el = document.getElementById('win');
    el.textContent = msg;
    el.classList.remove('hidden');
    setTimeout(() => location.reload(), 3000);
  }

  // === START ===
  initCards();
  requestAnimationFrame(loop);
})();
