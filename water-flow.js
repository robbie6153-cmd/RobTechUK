const COLS = 7;
const ROWS = 9;
const BUILD_TIME = 30;
const QUEUE_LIMIT = 4;
const TILE_SPAWN_MS = 2000;
const WATER_SPEED_MS = 1000;
const gameOverOverlay = document.getElementById("gameOverOverlay");
const gameOverText = document.getElementById("gameOverText");
const playAgainBtn = document.getElementById("playAgainBtn");

let grid = [];
let queue = [];
let upcomingTile = null;
let selectedTile = null;
let draggedTileIndex = null;

let score = 0;
let timeLeft = BUILD_TIME;
let flowTime = 0;

let buildTimer = null;
let spawnTimer = null;
let waterTimer = null;
let flowClock = null;

let gameRunning = false;
let waterStarted = false;
let waterPos = { row: 0, col: 0 };
let waterDir = "down";
let crossPasses = {};

const waterGrid = document.getElementById("waterGrid");
const tileQueue = document.getElementById("tileQueue");
const nextTile = document.getElementById("nextTile");
const timerEl = document.getElementById("timer");
const scoreEl = document.getElementById("score");
const messageEl = document.getElementById("gameMessage");
const startBtn = document.getElementById("startBtn");
const resetBtn = document.getElementById("resetBtn");
const rulesOverlay = document.getElementById("rulesOverlay");
const rulesPlayBtn = document.getElementById("rulesPlayBtn");

const TILE_TYPES = [
  { type: "horizontal", symbol: "━", exits: ["left", "right"] },
  { type: "vertical", symbol: "┃", exits: ["up", "down"] },
  { type: "corner-rd", symbol: "┏", exits: ["right", "down"] },
  { type: "corner-ld", symbol: "┓", exits: ["left", "down"] },
  { type: "corner-ur", symbol: "┗", exits: ["up", "right"] },
  { type: "corner-ul", symbol: "┛", exits: ["up", "left"] },
  { type: "cross", symbol: "╋", exits: ["up", "down", "left", "right"] }
];

function randomTile() {
  return TILE_TYPES[Math.floor(Math.random() * TILE_TYPES.length)];
}

function initGrid() {
  grid = [];
  waterGrid.innerHTML = "";

  for (let r = 0; r < ROWS; r++) {
    grid[r] = [];

    for (let c = 0; c < COLS; c++) {
      grid[r][c] = null;

      const cell = document.createElement("div");
      cell.className = "wf-cell";
      cell.dataset.row = r;
      cell.dataset.col = c;

      if (r === 0 && c === 0) cell.classList.add("wf-start");
      if (r === ROWS - 1 && c === COLS - 1) cell.classList.add("wf-finish");

      cell.addEventListener("click", () => placeTile(r, c));
      cell.addEventListener("dragover", e => e.preventDefault());
      cell.addEventListener("drop", e => {
        e.preventDefault();
        placeDraggedTile(r, c);
      });

      waterGrid.appendChild(cell);
    }
  }
}

function startGame() {
  resetGame(false);
  if (gameOverOverlay) gameOverOverlay.style.display = "none";

  if (rulesOverlay) rulesOverlay.style.display = "none";

  gameRunning = true;
  startBtn.disabled = true;
  messageEl.textContent = "Arrange the pipes before the water starts!";

  timerEl.classList.remove("timer-flow");
  timerEl.classList.add("timer-build");

  upcomingTile = randomTile();

  spawnTile();
  updateDisplay();
  renderQueue();

  buildTimer = setInterval(() => {
    timeLeft--;
    updateDisplay();

    if (timeLeft <= 0) {
      startWater();
    }
  }, 1000);

  spawnTimer = setInterval(spawnTile, TILE_SPAWN_MS);
}

function spawnTile() {
  if (!gameRunning) return;

  if (queue.length >= QUEUE_LIMIT) {
    gameOver("Game over! The waiting area filled up.");
    return;
  }

  queue.push(upcomingTile || randomTile());
  upcomingTile = randomTile();

  renderQueue();
}

function renderQueue() {
  const cells = tileQueue.querySelectorAll(".wf-queue-cell");

  cells.forEach((cell, index) => {
    cell.textContent = "";
    cell.classList.remove("selected");
    cell.removeAttribute("draggable");

    if (queue[index]) {
      cell.textContent = queue[index].symbol;
      cell.draggable = true;
      cell.dataset.index = index;

      cell.onclick = () => {
        selectedTile = index;
        renderQueue();
      };

      cell.ondragstart = () => {
        draggedTileIndex = index;
      };

      cell.ondragend = () => {
        draggedTileIndex = null;
      };

      if (selectedTile === index) {
        cell.classList.add("selected");
      }
    } else {
      cell.onclick = null;
      cell.ondragstart = null;
      cell.ondragend = null;
    }
  });

  nextTile.textContent = upcomingTile ? upcomingTile.symbol : "?";
}

function placeTile(row, col) {
  if (!gameRunning) return;
  if (selectedTile === null || !queue[selectedTile]) return;

  const tile = queue[selectedTile];
  addTileToGrid(row, col, tile);

  queue.splice(selectedTile, 1);
  selectedTile = null;

  renderQueue();
}

function placeDraggedTile(row, col) {
  if (!gameRunning) return;
  if (draggedTileIndex === null || !queue[draggedTileIndex]) return;

  const tile = queue[draggedTileIndex];
  addTileToGrid(row, col, tile);

  queue.splice(draggedTileIndex, 1);
  draggedTileIndex = null;
  selectedTile = null;

  renderQueue();
}

function addTileToGrid(row, col, tile) {
  if (grid[row][col]) {
    score -= 1;
    messageEl.textContent = "Tile replaced. -1 point.";
  } else {
    score += 1;
  }

  grid[row][col] = tile;

  const cell = getCell(row, col);
  cell.innerHTML = `<span class="pipe-symbol">${tile.symbol}</span>`;
  cell.classList.add("has-tile");

  updateDisplay();
}

function startWater() {
  waterStarted = true;
  clearInterval(buildTimer);

  flowTime = 0;
  timerEl.classList.remove("timer-build");
  timerEl.classList.add("timer-flow");
  timerEl.textContent = "0";

  messageEl.textContent = "Water is flowing!";
  waterPos = { row: 0, col: 0 };
  waterDir = "down";

  flowClock = setInterval(() => {
    flowTime++;
    timerEl.textContent = flowTime;
  }, 1000);

  moveWater();
  waterTimer = setInterval(moveWater, WATER_SPEED_MS);
}

function moveWater() {
  const { row, col } = waterPos;

  if (row < 0 || row >= ROWS || col < 0 || col >= COLS) {
    gameOver("Game over! The water escaped the grid.");
    return;
  }

  const tile = grid[row][col];

  if (!tile) {
    gameOver("Game over! The water hit a hole.");
    return;
  }

  const enteringFrom = opposite(waterDir);

  if (!tile.exits.includes(enteringFrom)) {
    gameOver("Game over! The pipe connection failed.");
    return;
  }

  const cell = getCell(row, col);
  cell.classList.add("water-passed");

  const pipe = cell.querySelector(".pipe-symbol");
  if (pipe) pipe.classList.add("pipe-water");

  score += 1;
  updateDisplay();

  if (tile.type === "cross") {
    const key = `${row}-${col}`;
    crossPasses[key] = (crossPasses[key] || 0) + 1;

    if (crossPasses[key] === 2) {
      score += 10;
      updateDisplay();
      messageEl.textContent = "Cross tile bonus! +10";
    }
  }

  if (row === ROWS - 1 && col === COLS - 1) {
    winGame();
    return;
  }

  waterDir = getNextDirection(tile, enteringFrom);

  if (!waterDir) {
    gameOver("Game over! The water reached a dead end.");
    return;
  }

  if (waterDir === "up") waterPos.row--;
  if (waterDir === "down") waterPos.row++;
  if (waterDir === "left") waterPos.col--;
  if (waterDir === "right") waterPos.col++;
}

function getNextDirection(tile, enteringFrom) {
  if (tile.type === "cross") {
    return opposite(enteringFrom);
  }

  const exits = tile.exits.filter(exit => exit !== enteringFrom);
  return exits[0];
}

function opposite(dir) {
  if (dir === "up") return "down";
  if (dir === "down") return "up";
  if (dir === "left") return "right";
  if (dir === "right") return "left";
}

function getCell(row, col) {
  return document.querySelector(`.wf-cell[data-row="${row}"][data-col="${col}"]`);
}

function updateDisplay() {
  if (!waterStarted) timerEl.textContent = timeLeft;
  scoreEl.textContent = score;
}

function gameOver(text) {
  clearInterval(buildTimer);
  clearInterval(spawnTimer);
  clearInterval(waterTimer);
  clearInterval(flowClock);

  gameRunning = false;

  if (gameOverOverlay) {
    gameOverOverlay.style.display = "flex";
    gameOverText.textContent = text;
  }

  startBtn.disabled = false;
}
if (playAgainBtn) {
  playAgainBtn.addEventListener("click", () => {
    if (gameOverOverlay) gameOverOverlay.style.display = "none";
    startGame();
  });
}

function winGame() {
  clearInterval(waterTimer);
  clearInterval(flowClock);
  clearInterval(spawnTimer);

  gameRunning = false;
  score += 25;
  updateDisplay();

  messageEl.textContent = "You win! Water reached the finish. +25 bonus!";
  startBtn.disabled = false;
}

function resetGame(showMessage = true) {
  clearInterval(buildTimer);
  clearInterval(spawnTimer);
  clearInterval(waterTimer);
  clearInterval(flowClock);
if (gameOverOverlay) gameOverOverlay.style.display = "none";
  queue = [];
  upcomingTile = null;
  selectedTile = null;
  draggedTileIndex = null;

  score = 0;
  timeLeft = BUILD_TIME;
  flowTime = 0;
  waterStarted = false;
  gameRunning = false;
  waterPos = { row: 0, col: 0 };
  waterDir = "down";
  crossPasses = {};

  timerEl.classList.remove("timer-flow");
  timerEl.classList.add("timer-build");

  initGrid();
  renderQueue();
  updateDisplay();

  if (showMessage) {
    messageEl.textContent = "Press Start Game to begin.";
  }

  startBtn.disabled = false;
}

startBtn.addEventListener("click", startGame);
resetBtn.addEventListener("click", () => resetGame(true));

if (rulesPlayBtn) {
  rulesPlayBtn.addEventListener("click", startGame);
}

resetGame(true);