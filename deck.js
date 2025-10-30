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
  {name:'Skeleton',cost:1,type:'skeleton',hp:30,damage:1,speed:1.4},
  {name:'Bomber',cost:3,type:'bomber',hp:60,damage:1,speed:1},
  {name:'P.E.K.K.A',cost:7,type:'pekka',hp:400,damage:1,speed:0.7},
  {name:'Minion',cost:3,type:'minion',hp:70,damage:1,speed:1.5},
  {name:'Mega Knight',cost:7,type:'megaknight',hp:500,damage:1,speed:0.9}
];

let currentDeck = [];

function render() {
  const slots = document.getElementById('deck-slots'); slots.innerHTML = '';
  for (let i = 0; i < 8; i++) {
    const s = document.createElement('div'); s.className = 'deck-slot';
    if (currentDeck[i]) {
      s.innerHTML = `<div>${currentDeck[i].name}</div><div class="cost">${currentDeck[i].cost}</div>`;
    }
    s.onclick = () => selectSlot(i);
    slots.appendChild(s);
  }
  renderPool();
  loadDeck();
}

function renderPool() {
  const pool = document.getElementById('card-pool'); pool.innerHTML = '';
  cardPool.forEach(card => {
    const el = document.createElement('div'); el.className = 'card-pool-item';
    el.innerHTML = `<div>${card.name}</div><div class="cost">${card.cost}</div>`;
    el.onclick = () => addToDeck(card);
    pool.appendChild(el);
  });
}

function addToDeck(card) {
  if (currentDeck.length < 8) {
    currentDeck.push(card);
    render();
  }
}

function selectSlot(i) {
  if (currentDeck[i]) {
    currentDeck.splice(i, 1);
    render();
  }
}

function loadDeck() {
  const saved = localStorage.getItem('currentDeck');
  if (saved) currentDeck = JSON.parse(saved);
  render();
}

document.getElementById('save-deck').onclick = () => {
  if (currentDeck.length === 8) {
    localStorage.setItem('currentDeck', JSON.stringify(currentDeck));
    alert('Deck saved!');
  } else {
    alert('Need 8 cards!');
  }
};

document.getElementById('clear-deck').onclick = () => {
  currentDeck = [];
  render();
};

document.getElementById('back-to-game').onclick = () => {
  window.location.href = 'index.html';
};

render();
