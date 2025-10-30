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
  {name:'Fireball',cost:4,type:'fireball',hp:0,damage:1,speed:0},
  {name:'Skeleton',cost:1,type:'skeleton',hp:30,damage:1,speed:1.4},
  {name:'Bomber',cost:3,type:'bomber',hp:60,damage:1,speed:1},
  {name:'P.E.K.K.A',cost:7,type:'pekka',hp:400,damage:1,speed:0.7},
  {name:'Minion',cost:3,type:'minion',hp:70,damage:1,speed:1.5},
  {name:'Ice Wizard',cost:3,type:'icewizard',hp:70,damage:1,speed:1},
  {name:'Electro Wizard',cost:4,type:'electrowiz',hp:80,damage:1,speed:1.1},
  {name:'Sparky',cost:6,type:'sparky',hp:200,damage:1,speed:0.6},
  {name:'Lava Hound',cost:7,type:'lavahound',hp:500,damage:1,speed:0.9},
  {name:'Golem',cost:8,type:'golem',hp:600,damage:1,speed:0.6},
  {name:'Mega Knight',cost:7,type:'megaknight',hp:500,damage:1,speed:0.9}
];

function render() {
  const slots = document.getElementById('deck-slots'); slots.innerHTML = '';
  for (let i = 0; i < 8; i++) {
    const s = document.createElement('div'); s.className = 'deck-slot'; s.onclick = () => remove(i);
    slots.appendChild(s);
  }
  renderPool(); loadDeck();
}
function renderPool() {
  const p = document.getE
