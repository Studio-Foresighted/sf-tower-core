import { Game } from './game.js';
import { SETTINGS } from './utils/settings.js';

const canvas = document.getElementById('game-canvas');
const game = new Game(canvas);

// UI Elements
const mainMenu = document.getElementById('main-menu');
const gameUI = document.getElementById('game-ui');
const gameOverScreen = document.getElementById('game-over-screen');
const startBtn = document.getElementById('start-btn');
const nextWaveBtn = document.getElementById('next-wave-btn');

const moneyDisplay = document.getElementById('money-display');
const livesDisplay = document.getElementById('lives-display');
const waveDisplay = document.getElementById('wave-display');

const towerBtns = document.querySelectorAll('.tower-btn');
const selectionPanel = document.getElementById('selection-panel');
const upgradeBtn = document.getElementById('upgrade-btn');
const sellBtn = document.getElementById('sell-btn');
const upgradeCostDisplay = document.getElementById('upgrade-cost');
const sellCostDisplay = document.getElementById('sell-cost');

// Game Loop
let lastTime = 0;
function animate(time) {
    requestAnimationFrame(animate);
    
    const dt = (time - lastTime) / 1000;
    lastTime = time;
    
    // Cap dt to prevent huge jumps if tab inactive
    const safeDt = Math.min(dt, 0.1);
    
    game.update(time / 1000, safeDt);
}

// Hero Selection State
let selectedHero = 'warrior';
let selectedDifficulty = 'easy';
const heroOptions = document.querySelectorAll('.hero-option');
const diffBtns = document.querySelectorAll('.diff-btn');
const botBtn = document.getElementById('bot-btn');
const abilityBtn = document.getElementById('ability-btn');
const speedBtns = document.querySelectorAll('.speed-btn');
const restartBtn = document.getElementById('restart-btn');

// Event Listeners
speedBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        speedBtns.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        game.timeScale = parseFloat(btn.dataset.speed);
    });
});

restartBtn.addEventListener('click', () => {
    game.restartGame();
    gameUI.style.display = 'none';
    mainMenu.style.display = 'flex';
});

heroOptions.forEach(option => {
    option.addEventListener('click', () => {
        heroOptions.forEach(opt => {
            opt.classList.remove('selected');
            opt.style.borderColor = opt.dataset.hero === 'warrior' ? '#ff0000' : '#0000ff';
            opt.style.backgroundColor = 'transparent';
        });
        option.classList.add('selected');
        option.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
        selectedHero = option.dataset.hero;
    });
});

startBtn.addEventListener('click', () => {
    mainMenu.style.display = 'none';
    gameUI.style.display = 'block';
    game.startGame(selectedHero, selectedDifficulty, false);
    updateStats();
});

botBtn.addEventListener('click', () => {
    mainMenu.style.display = 'none';
    gameUI.style.display = 'block';
    game.startGame(selectedHero, selectedDifficulty, true);
    updateStats();
});

abilityBtn.addEventListener('click', () => {
    game.activateHeroAbility();
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && gameUI.style.display !== 'none') {
        game.startWave();
    }
    if (e.code === 'Escape') {
        game.cancelPlacement();
        towerBtns.forEach(b => b.classList.remove('selected'));
    }
});

nextWaveBtn.addEventListener('click', () => {
    game.startWave();
});

towerBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const type = btn.dataset.type;
        
        // Deselect others
        towerBtns.forEach(b => b.classList.remove('selected'));
        
        if (game.placingType === type) {
            // Cancel placement and hide ghost object
            game.cancelPlacement();
        } else {
            // Select
            game.placingType = type;
            btn.classList.add('selected');
        }
    });
});

upgradeBtn.addEventListener('click', () => {
    game.upgradeSelected();
});

upgradeBtn.addEventListener('mouseenter', () => {
    if (game.selectedTower) {
        game.selectedTower.showUpgradePreview(true);
    }
});

upgradeBtn.addEventListener('mouseleave', () => {
    if (game.selectedTower) {
        game.selectedTower.showUpgradePreview(false);
    }
});

sellBtn.addEventListener('click', () => {
    game.sellSelected();
});

// Game Callbacks
game.onStatsUpdate = updateStats;
game.onSelectionChange = updateSelection;
game.onGameOver = handleGameOver;
game.onMessage = showMessage;

function updateStats() {
    moneyDisplay.textContent = game.money;
    livesDisplay.textContent = game.lives;
    waveDisplay.textContent = `${game.waveIndex} / ${SETTINGS.WAVES.length}`;
    
    // Update tower buttons availability
    towerBtns.forEach(btn => {
        const type = btn.dataset.type;
        const cost = SETTINGS.TOWERS[type].cost;
        if (game.money < cost) {
            btn.style.opacity = '0.5';
            btn.style.cursor = 'not-allowed';
        } else {
            btn.style.opacity = '1';
            btn.style.cursor = 'pointer';
        }
    });
}

function updateSelection(tower) {
    if (tower) {
        selectionPanel.style.display = 'block';
        const upgradeCost = Math.floor(tower.cost * 0.5 * tower.level);
        const sellCost = Math.floor(tower.cost * 0.5);
        
        upgradeCostDisplay.textContent = upgradeCost;
        sellCostDisplay.textContent = sellCost;
        
        if (game.money < upgradeCost) {
            upgradeBtn.disabled = true;
            upgradeBtn.style.opacity = 0.5;
        } else {
            upgradeBtn.disabled = false;
            upgradeBtn.style.opacity = 1;
        }
    } else {
        selectionPanel.style.display = 'none';
    }
}

function handleGameOver(win) {
    gameUI.style.display = 'none';
    gameOverScreen.style.display = 'flex';
    document.getElementById('game-over-title').textContent = win ? "VICTORY!" : "GAME OVER";
    document.getElementById('game-over-title').style.color = win ? "#00ff00" : "#ff0000";
}

function showMessage(text) {
    const msg = document.getElementById('message-overlay');
    msg.textContent = text;
    msg.style.opacity = 1;
    setTimeout(() => {
        msg.style.opacity = 0;
    }, 2000);
}

// Start loop
requestAnimationFrame(animate);
