(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  canvas.width = 900; canvas.height = 600;

  // === CLASH ROYALE SETTINGS ===
  const ELIXIR = { max: 10, regen: 2.8 }; // 1 elixir every 2.8s
  const TOWER = { hp: 2000, dmg: 80, range: 180, cd: 1.5 };
  const KING_TOWER = { hp: 2400, dmg: 100, range: 200, cd: 1.5 };
  const AI_SPAWN = { min: 4, max: 7 };

  // === CARD DEFINITIONS (Clash-like) ===
  const CARDS = [
    { name: 'Knight', cost: 3, hp: 600, maxHp: 600, dmg: 80, speed: 1.0, r: 28, color: '#e74c3c', range: 50 },
    { name: 'Archer', cost: 3, hp: 200, maxHp: 200, dmg: 50, speed: 1.2, r: 22, color: '#3498db', range: 200 },
    { name: 'Giant',  cost: 5, hp: 2000, maxHp: 2000, dmg: 120, speed: 0.6, r: 40, color: '#27ae60', range: 50 }
  ];

  // === GAME STATE ===
  let elixir = 4, elixirTimer = 0, aiSpawnTimer = 0;
  let hand = [], units = [];
  const lanes = [
    { y: 200, bridgeX: 450 },
    { y: 400, bridgeX: 450 }
  ];
  const leftTowers = [
    { x: 180, y: 180, hp: TOWER.hp, team: 1, cd: 0, type: 'side' },
    { x: 180, y: 420, hp: TOWER.hp, team: 1, cd: 0, type: 'side' },
    { x: 120, y: 300, hp: KING_TOWER.hp, team: 1, cd: 0, type: 'king' }
  ];
  const rightTowers = [
    { x: 720, y: 180, hp: TOWER.hp, team: -1, cd: 0, type: 'side' },
    { x: 720, y: 420, hp: TOWER.hp, team: -1, cd: 0, type: 'side' },
    { x: 780, y: 300, hp: KING_TOWER.hp, team: -1, cd: 0, type: 'king' }
  ];
  let lastTime = 0;

  // === AUDIO ===
  const spawnSfx = document.getElementById('spawn-sfx');
  const attackSfx = document.getElementById('attack-sfx');

  // === UI ===
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
    const fill = document.getElementById('elixir-fill');
    const text = document.getElementById('elixir-text');
    const percent = (elixir / ELIXIR.max) * 100;
    fill.style.width = percent + '%';
    text.textContent = `${Math.floor(elixir)} / ${ELIXIR.max}`;
    hand.forEach((idx, i) => {
      document.querySelectorAll('.card')[i].disabled = elixir < CARDS[idx].cost;
    });
  }

  // === SPAWN ===
  function spawnPlayerUnit(card, handIdx) {
    if (elixir < card.cost) return;
    elixir -= card.cost;
    const lane = Math.floor(Math.random() * 2);
    const y = lanes[lane].y + (Math.random() - 0.5) * 80;
    units.push({ ...card, x: 100, y, team: 1, hp: card.maxHp, cd: 0, lane });
    spawnSfx.currentTime = 0; spawnSfx.play();
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

  function spawnAI() {
    aiSpawnTimer += (Math.random() * 0.016);
    if (aiSpawnTimer >= 1 / ((AI_SPAWN.min + AI_SPAWN.max) / 2)) {
      const card = CARDS[Math.floor(Math.random() * CARDS.length)];
      const lane = Math.floor(Math.random() * 2);
      const y = lanes[lane].y + (Math.random() - 0.5) * 80;
      units.push({ ...card, x: 800, y, team: -1, hp: card.maxHp, cd: 0, lane });
      aiSpawnTimer = 0;
    }
  }

  // === MAIN LOOP ===
  function loop(time) {
    const dt = Math.min((time - lastTime) / 1000, 0.1);
    lastTime = time;

    // Elixir
    elixirTimer += dt;
    if (elixirTimer >= ELIXIR.regen) {
      elixir = Math.min(elixir + 1, ELIXIR.max);
      elixirTimer = 0;
      updateElixirUI();
    }

    spawnAI();

    // Update Units
    units = units.filter(u => u.hp > 0);
    units.forEach(u => {
      if (u.cd > 0) u.cd -= dt;

      let target = null, minDist = u.range;

      // Target enemy units
      units.forEach(e => {
        if (e.team === u.team) return;
        const d = Math.hypot(u.x - e.x, u.y - e.y);
        if (d < minDist) { minDist = d; target = e; }
      });

      // Target towers
      const towers = u.team === 1 ? rightTowers : leftTowers;
      towers.forEach(t => {
        if (t.hp <= 0) return;
        const d = Math.hypot(u.x - t.x, u.y - t.y);
        if (d < minDist) { minDist = d; target = t; }
      });

      if (target && u.cd <= 0) {
        target.hp -= u.dmg * dt;
        u.cd = 0.8;
        if (target.hp > 0) { attackSfx.currentTime = 0; attackSfx.play(); }
      } else if (!target) {
        u.x += u.speed * u.team * 60 * dt;
      }
    });

    // Towers attack
    [...leftTowers, ...rightTowers].forEach(t => {
      if (t.hp <= 0 || t.cd > 0) { t.cd -= dt; return; }
      let target = null, minD = t.type === 'king' ? KING_TOWER.range : TOWER.range;
      units.forEach(u => {
        if (u.team === t.team) return;
        const d = Math.hypot(t.x - u.x, t.y - u.y);
        if (d < minD) { minD = d; target = u; }
      });
      if (target) {
        target.hp -= (t.type === 'king' ? KING_TOWER.dmg : TOWER.dmg);
        t.cd = t.type === 'king' ? KING_TOWER.cd : TOWER.cd;
      }
    });

    // Draw
    ctx.fillStyle = '#8b5a2b'; ctx.fillRect(0, 0, 900, 600);
    ctx.fillStyle = '#2980b9'; ctx.fillRect(430, 0, 40, 600); // River

    // Bridges
    ctx.fillStyle = '#d35400';
    lanes.forEach(l => ctx.fillRect(400, l.y - 40, 100, 80));

    // Towers
    [...leftTowers, ...rightTowers].forEach(t => {
      if (t.hp <= 0) return;
      ctx.fillStyle = t.team === 1 ? '#3498db' : '#e74c3c';
      ctx.fillRect(t.x - 35, t.y - 50, 70, 100);
      const ratio = t.hp / (t.type === 'king' ? KING_TOWER.hp : TOWER.hp);
      ctx.fillStyle = '#c0392b'; ctx.fillRect(t.x - 40, t.y - 65, 80, 10);
      ctx.fillStyle = '#27ae60'; ctx.fillRect(t.x - 40, t.y - 65, 80 * ratio, 10);
    });

    // Units
    units.forEach(u => {
      ctx.fillStyle = u.color;
      ctx.beginPath(); ctx.arc(u.x, u.y, u.r, 0, Math.PI * 2); ctx.fill();
      const ratio = u.hp / u.maxHp;
      ctx.fillStyle = '#c0392b'; ctx.fillRect(u.x - u.r, u.y - u.r - 14, u.r * 2, 6);
      ctx.fillStyle = '#27ae60'; ctx.fillRect(u.x - u.r, u.y - u.r - 14, u.r * 2 * ratio, 6);
    });

    // Win
    const leftAlive = leftTowers.some(t => t.hp > 0);
    const rightAlive = rightTowers.some(t => t.hp > 0);
    if (!leftAlive) endGame('Right Wins!');
    else if (!rightAlive) endGame('Left Wins!');

    requestAnimationFrame(loop);
  }

  function endGame(msg) {
    const el = document.getElementById('win');
    el.textContent = msg;
    el.classList.remove('hidden');
    setTimeout(() => location.reload(), 4000);
  }

  initCards();
  requestAnimationFrame(loop);
})();
