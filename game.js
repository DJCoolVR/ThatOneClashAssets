(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  canvas.width = 900; canvas.height = 600;

  const ELIXIR = { max: 10, rate: 2.8 };
  const TOWER = { hp: 500, dmg: 50, range: 120, cd: 2 };

  const CARDS = [
    { name: 'Knight', cost: 3, hp: 120, dmg: 20, speed: 1.2, r: 22, color: '#e74c3c' },
    { name: 'Archer', cost: 3, hp: 60,  dmg: 12, speed: 1.5, r: 18, color: '#3498db', range: 180 },
    { name: 'Giant',  cost: 5, hp: 300, dmg: 30, speed: 0.8, r: 30, color: '#27ae60' }
  ];

  let elixir = 0, elixirTimer = 0;
  let hand = [], units = [];
  const left = { x: 150, y: 300, hp: TOWER.hp, team: 1 };
  const right = { x: 750, y: 300, hp: TOWER.hp, team: -1 };
  let last = 0;

  // UI
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
      btn.onclick = () => spawnUnit(card, i);
      btn.disabled = true;
      div.appendChild(btn);
    }
    updateElixir();
  }

  function updateElixir() {
    document.getElementById('elixir').textContent = Math.floor(elixir);
    hand.forEach((i, idx) => {
      document.querySelectorAll('.card')[idx].disabled = elixir < CARDS[i].cost;
    });
  }

  function spawnUnit(card, handIdx) {
    if (elixir < card.cost) return;
    elixir -= card.cost;
    units.push({ ...card, x: 100, y: 200 + Math.random() * 200, team: 1, hp: card.hp, cd: 0 });
    replaceCard(handIdx);
    updateElixir();
  }

  function replaceCard(idx) {
    const newIdx = Math.floor(Math.random() * CARDS.length);
    hand[idx] = newIdx;
    const btn = document.querySelectorAll('.card')[idx];
    const c = CARDS[newIdx];
    btn.innerHTML = `<div>${c.name}</div><div class="cost">${c.cost}</div>`;
  }

  function spawnAI() {
    if (Math.random() > 0.02) return;
    const c = CARDS[Math.floor(Math.random() * CARDS.length)];
    units.push({ ...c, x: 800, y: 200 + Math.random() * 200, team: -1, hp: c.hp, cd: 0 });
  }

  function loop(time) {
    const dt = Math.min((time - last) / 1000, 0.1);
    last = time;

    // Elixir
    elixirTimer += dt;
    if (elixirTimer >= 1 / ELIXIR.rate) {
      elixir = Math.min(elixir + 1, ELIXIR.max);
      elixirTimer = 0;
      updateElixir();
    }

    spawnAI();

    // Update units
    units = units.filter(u => u.hp > 0);
    units.forEach(u => {
      if (u.cd > 0) u.cd -= dt;
      let target = null, minD = (u.range || 50);

      units.forEach(e => {
        if (e.team === u.team) return;
        const d = Math.hypot(u.x - e.x, u.y - e.y);
        if (d < minD) { minD = d; target = e; }
      });

      const enemyTower = u.team === 1 ? right : left;
      const td = Math.hypot(u.x - enemyTower.x, u.y - enemyTower.y);
      if (td < minD) { minD = td; target = enemyTower; }

      if (target && u.cd <= 0) {
        target.hp -= u.dmg * dt;
        u.cd = 1;
      } else if (!target) {
        u.x += u.speed * u.team * 60 * dt;
      }
    });

    // Towers attack
    [left, right].forEach(t => {
      if (t.cd > 0) { t.cd -= dt; return; }
      let target = null, minD = TOWER.range;
      units.forEach(u => {
        if (u.team === t.team) return;
        const d = Math.hypot(t.x - u.x, t.y - u.y);
        if (d < minD) { minD = d; target = u; }
      });
      if (target) { target.hp -= TOWER.dmg; t.cd = TOWER.cd; }
    });

    // Draw
    ctx.fillStyle = '#8b5a2b'; ctx.fillRect(0, 0, 900, 600);
    ctx.fillStyle = '#2980b9'; ctx.fillRect(430, 0, 40, 600); // River

    [left, right].forEach(t => {
      ctx.fillStyle = '#7f8c8d';
      ctx.fillRect(t.x - 30, t.y - 40, 60, 80);
      const ratio = t.hp / TOWER.hp;
      ctx.fillStyle = '#c0392b'; ctx.fillRect(t.x - 35, t.y - 55, 70, 8);
      ctx.fillStyle = '#27ae60'; ctx.fillRect(t.x - 35, t.y - 55, 70 * ratio, 8);
    });

    units.forEach(u => {
      ctx.fillStyle = u.color;
      ctx.beginPath(); ctx.arc(u.x, u.y, u.r, 0, Math.PI*2); ctx.fill();
      const ratio = u.hp / (u.maxHp || u.hp);
      ctx.fillStyle = '#c0392b'; ctx.fillRect(u.x - u.r, u.y - u.r - 12, u.r*2, 5);
      ctx.fillStyle = '#27ae60'; ctx.fillRect(u.x - u.r, u.y - u.r - 12, u.r*2 * ratio, 5);
    });

    if (left.hp <= 0) end('Right Wins!');
    else if (right.hp <= 0) end('Left Wins!');

    requestAnimationFrame(loop);
  }

  function end(msg) {
    const el = document.getElementById('win');
    el.textContent = msg;
    el.classList.remove('hidden');
    setTimeout(() => location.reload(), 3000);
  }

  initCards();
  requestAnimationFrame(loop);
})();
