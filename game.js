(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const startMenu = document.getElementById('start-menu');
  const ui = document.getElementById('ui');
  const win = document.getElementById('win');

  // Resize canvas
  const resize = () => { canvas.width = innerWidth; canvas.height = innerHeight; };
  window.onresize = resize; resize();

  // ---------- CONFIG ----------
  const ELIXIR = { max:10, rate:2.8 };           // 2.8 s per elixir
  const TOWER = { hp:2000, dmg:80, range:180, cd:1 };
  const KING = { hp:2400, dmg:100, range:200, cd:1 };
  const AI_SPAWN = { min:4, max:7 };

  // ---------- CARDS ----------
  const CARDS = [
    {name:'Knight',cost:3,hp:600,maxHp:600,dmg:80,speed:1.0,r:28,color:'#c0392b',range:50},
    {name:'Archers',cost:3,hp:200,maxHp:200,dmg:50,speed:1.2,r:22,color:'#3498db',range:200},
    {name:'Giant',cost:5,hp:2000,maxHp:2000,dmg:120,speed:0.6,r:40,color:'#27ae60',range:50}
  ];

  // ---------- STATE ----------
  let elixir = 0, elixirTimer = 0, aiTimer = 0;
  let hand = [], units = [];
  const towers = [
    // Left princess
    {x:180,y:120,hp:TOWER.hp,team:1,cd:0,type:'princess'},
    {x:180,y:480,hp:TOWER.hp,team:1,cd:0,type:'princess'},
    // Left king
    {x:120,y:300,hp:KING.hp,team:1,cd:0,type:'king'},
    // Right princess
    {x:720,y:120,hp:TOWER.hp,team:-1,cd:0,type:'princess'},
    {x:720,y:480,hp:TOWER.hp,team:-1,cd:0,type:'princess'},
    // Right king
    {x:780,y:300,hp:KING.hp,team:-1,cd:0,type:'king'}
  ];
  let last = 0;

  // ---------- START ----------
  document.getElementById('play').onclick = () => {
    startMenu.classList.add('hidden');
    ui.classList.remove('hidden');
    initCards();
    requestAnimationFrame(loop);
  };

  // ---------- UI ----------
  function initCards() {
    const div = document.getElementById('cards');
    div.innerHTML = '';
    hand = [];
    for(let i=0;i<4;i++){
      const idx = Math.floor(Math.random()*CARDS.length);
      hand.push(idx);
      const c = CARDS[idx];
      const btn = document.createElement('button');
      btn.className='card';
      btn.innerHTML=`<div>${c.name}</div><div class="cost">${c.cost}</div>`;
      btn.onclick=()=>spawnPlayer(c,i);
      btn.disabled=true;
      div.appendChild(btn);
    }
    updateElixir();
  }

  function updateElixir(){
    const fill = document.getElementById('elixir-fill');
    const txt = document.getElementById('elixir-text');
    const pct = Math.min(elixir,10)/10*100;
    fill.style.width = pct+'%';
    txt.textContent = `${Math.floor(elixir)} / 10`;
    hand.forEach((i,idx)=>document.querySelectorAll('.card')[idx].disabled=elixir<CARDS[i].cost);
  }

  // ---------- SPAWN ----------
  function spawnPlayer(card,handIdx){
    if(elixir<card.cost) return;
    elixir-=card.cost;
    const lane = Math.random()<0.5?0:1;
    const y = lane===0?180:420;
    units.push({...card,x:100,y:y+Math.random()*80,team:1,hp:card.maxHp,cd:0});
    replaceCard(handIdx);
    updateElixir();
  }

  function replaceCard(idx){
    const newIdx = Math.floor(Math.random()*CARDS.length);
    hand[idx]=newIdx;
    const btn = document.querySelectorAll('.card')[idx];
    const c = CARDS[newIdx];
    btn.innerHTML=`<div>${c.name}</div><div class="cost">${c.cost}</div>`;
  }

  function spawnAI(){
    aiTimer+=0.016;
    if(aiTimer>AI_SPAWN.min+Math.random()*(AI_SPAWN.max-AI_SPAWN.min)){
      const c = CARDS[Math.floor(Math.random()*CARDS.length)];
      const lane = Math.random()<0.5?0:1;
      const y = lane===0?180:420;
      units.push({...c,x:800,y:y+Math.random()*80,team:-1,hp:c.maxHp,cd:0});
      aiTimer=0;
    }
  }

  // ---------- LOOP ----------
  function loop(time){
    const dt = Math.min((time-last)/1000,0.1);
    last=time;

    // Elixir
    elixirTimer+=dt;
    if(elixirTimer>=ELIXIR.rate){
      elixir=Math.min(elixir+1,ELIXIR.max);
      elixirTimer=0;
      updateElixir();
    }

    spawnAI();

    // Units
    units = units.filter(u=>u.hp>0);
    units.forEach(u=>{
      if(u.cd>0) u.cd-=dt;

      let target=null, minD=u.range||50;
      units.forEach(e=>{if(e.team===u.team)return;
        const d=Math.hypot(u.x-e.x,u.y-e.y);
        if(d<minD){minD=d;target=e;}
      });
      const enemyTowers = u.team===1?towers.slice(3):towers.slice(0,3);
      enemyTowers.forEach(t=>{if(t.hp<=0)return;
        const d=Math.hypot(u.x-t.x,u.y-t.y);
        if(d<minD){minD=d;target=t;}
      });

      if(target && u.cd<=0){
        target.hp-=u.dmg*dt;
        u.cd=0.8;
      }else if(!target){
        u.x+=u.speed*u.team*60*dt;
      }
    });

    // Towers
    towers.forEach(t=>{
      if(t.hp<=0 || t.cd>0){t.cd-=dt;return;}
      let target=null, minD = t.type==='king'?KING.range:TOWER.range;
      units.forEach(u=>{if(u.team===t.team)return;
        const d=Math.hypot(t.x-u.x,t.y-u.y);
        if(d<minD){minD=d;target=u;}
      });
      if(target){
        target.hp-=(t.type==='king'?KING.dmg:TOWER.dmg);
        t.cd = t.type==='king'?KING.cd:TOWER.cd;
      }
    });

    // Draw
    ctx.clearRect(0,0,canvas.width,canvas.height);

    // Background
    ctx.fillStyle='#8b5a2b'; ctx.fillRect(0,0,canvas.width,canvas.height);
    // River
    ctx.fillStyle='#2980b9'; ctx.fillRect(canvas.width/2-40,0,80,canvas.height);
    // Bridges
    ctx.fillStyle='#d35400';
    ctx.fillRect(canvas.width/2-80,140,160,80);
    ctx.fillRect(canvas.width/2-80,380,160,80);

    // Towers
    towers.forEach(t=>{
      if(t.hp<=0) return;
      ctx.fillStyle = t.team===1?'#3498db':'#e74c3c';
      ctx.fillRect(t.x-35,t.y-50,70,100);
      const ratio = t.hp/(t.type==='king'?KING.hp:TOWER.hp);
      ctx.fillStyle='#c0392b'; ctx.fillRect(t.x-40,t.y-65,80,10);
      ctx.fillStyle='#27ae60'; ctx.fillRect(t.x-40,t.y-65,80*ratio,10);
    });

    // Units
    units.forEach(u=>{
      ctx.fillStyle=u.color;
      ctx.beginPath(); ctx.arc(u.x,u.y,u.r,0,Math.PI*2); ctx.fill();
      const ratio = u.hp/u.maxHp;
      ctx.fillStyle='#c0392b'; ctx.fillRect(u.x-u.r,u.y-u.r-14,u.r*2,6);
      ctx.fillStyle='#27ae60'; ctx.fillRect(u.x-u.r,u.y-u.r-14,u.r*2*ratio,6);
    });

    // Win
    const leftAlive = towers.slice(0,3).some(t=>t.hp>0);
    const rightAlive = towers.slice(3).some(t=>t.hp>0);
    if(!leftAlive) end('Right Wins!');
    else if(!rightAlive) end('Left Wins!');

    requestAnimationFrame(loop);
  }

  function end(msg){
    win.textContent=msg;
    win.classList.remove('hidden');
    setTimeout(()=>location.reload(),4000);
  }
})();
