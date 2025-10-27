// ThatOneClash starter JS
const canvas=document.getElementById('canvas');
const ctx=canvas.getContext('2d');
canvas.width=700; canvas.height=500;

let elixir=0;
const maxElixir=10;
const playerTower={x:50,y:200,w:40,h:80,hp:300,maxHp:300};
const enemyTower={x:610,y:200,w:40,h:80,hp:300,maxHp:300};
let units=[];

function log(txt){
    let logDiv=document.querySelector('.log');
    if(!logDiv){
        logDiv=document.createElement('div');
        logDiv.className='log';
        document.body.appendChild(logDiv);
    }
    const p=document.createElement('div'); p.textContent=txt;
    logDiv.prepend(p);
}

function spawnUnit(){
    if(elixir<2){log('Not enough Elixir'); return;}
    elixir-=2; updateElixir();
    units.push({x:100,y:230,hp:50,dmg:2,spd:1});
    log('Unit deployed!');
}

function updateElixir(){
    let bar=document.getElementById('elixirBar');
    if(!bar){
        bar=document.createElement('div');
        bar.id='elixirBar';
        document.body.appendChild(bar);
    }
    bar.textContent='Elixir: '+elixir.toFixed(1);
}

function gameLoop(){
    ctx.clearRect(0,0,canvas.width,canvas.height);

    // Towers
    ctx.fillStyle='gray';
    ctx.fillRect(playerTower.x,playerTower.y,playerTower.w,playerTower.h);
    ctx.fillRect(enemyTower.x,enemyTower.y,enemyTower.w,enemyTower.h);

    // Units
    ctx.fillStyle='orange';
    for(let u of units){
        ctx.fillRect(u.x,u.y,20,20);
        u.x+=u.spd;
        if(u.x+20>enemyTower.x){enemyTower.hp-=u.dmg; u.hp=0; log('Enemy tower hit!');}
    }
    units=units.filter(u=>u.hp>0);

    // Regenerate Elixir
    if(elixir<maxElixir){elixir+=0.02; updateElixir();}

    requestAnimationFrame(gameLoop);
}

// Start
updateElixir();
canvas.addEventListener('click',spawnUnit);
gameLoop();
