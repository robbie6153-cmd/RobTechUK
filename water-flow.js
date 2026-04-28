const COLS = 7;
const ROWS = 9;
const BUILD_TIME = 30;
const QUEUE_LIMIT = 4;
const TILE_SPAWN_MS = 2000;
const WATER_SPEED_MS = 2000;

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

const HIGH_SCORE_KEY = "waterflow_high_scores_v1";

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

  if (tile.type === "cross") {
    cell.innerHTML = `
      <span class="pipe-symbol cross-symbol">
        <span class="cross-line cross-horizontal"></span>
        <span class="cross-line cross-vertical"></span>
      </span>
    `;
  } else {
    cell.innerHTML = `<span class="pipe-symbol">${tile.symbol}</span>`;
  }

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

  if (tile.type === "cross") {
    const key = `${row}-${col}`;

    if (!crossPasses[key]) {
      crossPasses[key] = {
        horizontal: false,
        vertical: false,
        count: 0
      };
    }

    if (enteringFrom === "left" || enteringFrom === "right") {
      crossPasses[key].horizontal = true;

      const horizontal = cell.querySelector(".cross-horizontal");
      if (horizontal) horizontal.classList.add("pipe-water");
    }

    if (enteringFrom === "up" || enteringFrom === "down") {
      crossPasses[key].vertical = true;

      const vertical = cell.querySelector(".cross-vertical");
      if (vertical) vertical.classList.add("pipe-water");
    }

    crossPasses[key].count++;

    if (crossPasses[key].count === 2) {
      score += 10;
      updateDisplay();
      messageEl.textContent = "Cross tile bonus! +10";
    }
  } else {
    const pipe = cell.querySelector(".pipe-symbol");

    if (pipe) {
      cell.classList.add("water-passed");
      pipe.classList.add("pipe-water");
    }
  }

  score += 1;
  updateDisplay();

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

  const qualifies = scoreQualifies(score);

  if (gameOverOverlay) {
    gameOverOverlay.style.display = "flex";
  }

  if (gameOverText) {
    gameOverText.innerHTML = `
      <h2>Game Over</h2>
      <p>${text}</p>
      <p>Final score: <strong>${score}</strong></p>

      ${
        qualifies
          ? `
            <div class="high-score-entry">
              <h3>New High Score!</h3>
              <p>Enter name, max 7 letters:</p>
              <input id="highScoreNameInput" maxlength="7" placeholder="PLAYER">
              <button id="saveHighScoreBtn">Save Score</button>
            </div>
          `
          : `<p>You did not reach the top 100 this time.</p>`
      }

      <div id="gameOverHighScores">
        ${getHighScoresHtml()}
      </div>
    `;
  }

  const saveBtn = document.getElementById("saveHighScoreBtn");

  if (saveBtn) {
    saveBtn.addEventListener("click", () => {
      const input = document.getElementById("highScoreNameInput");

      let name = input.value.trim().toUpperCase();
      name = name.replace(/[^A-Z0-9]/g, "");
      name = name.substring(0, 7);

      if (!name) name = "PLAYER";

      saveHighScore(name, score);

      const entryBox = document.querySelector(".high-score-entry");
      if (entryBox) {
        entryBox.innerHTML = `<h3>Score Saved!</h3>`;
      }

      const scoresBox = document.getElementById("gameOverHighScores");
      if (scoresBox) {
        scoresBox.innerHTML = getHighScoresHtml();
      }
    });
  }

  startBtn.disabled = false;
}

function winGame() {
  clearInterval(waterTimer);
  clearInterval(flowClock);
  clearInterval(spawnTimer);

  gameRunning = false;
  score += 25;
  updateDisplay();

  messageEl.textContent = "You win! Water reached the finish. +25 bonus!";

  const qualifies = scoreQualifies(score);

  if (gameOverOverlay) {
    gameOverOverlay.style.display = "flex";
  }

  if (gameOverText) {
    gameOverText.innerHTML = `
      <h2>You Win!</h2>
      <p>Water reached the finish.</p>
      <p>Final score: <strong>${score}</strong></p>

      ${
        qualifies
          ? `
            <div class="high-score-entry">
              <h3>New High Score!</h3>
              <p>Enter name, max 7 letters:</p>
              <input id="highScoreNameInput" maxlength="7" placeholder="PLAYER">
              <button id="saveHighScoreBtn">Save Score</button>
            </div>
          `
          : `<p>You did not reach the top 100 this time.</p>`
      }

      <div id="gameOverHighScores">
        ${getHighScoresHtml()}
      </div>
    `;
  }

  const saveBtn = document.getElementById("saveHighScoreBtn");

  if (saveBtn) {
    saveBtn.addEventListener("click", () => {
      const input = document.getElementById("highScoreNameInput");

      let name = input.value.trim().toUpperCase();
      name = name.replace(/[^A-Z0-9]/g, "");
      name = name.substring(0, 7);

      if (!name) name = "PLAYER";

      saveHighScore(name, score);

      const entryBox = document.querySelector(".high-score-entry");
      if (entryBox) {
        entryBox.innerHTML = `<h3>Score Saved!</h3>`;
      }

      const scoresBox = document.getElementById("gameOverHighScores");
      if (scoresBox) {
        scoresBox.innerHTML = getHighScoresHtml();
      }
    });
  }

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

/* -------------------------
   HIGH SCORES
------------------------- */

function loadHighScores() {
  const saved = localStorage.getItem(HIGH_SCORE_KEY);

  if (!saved) return [];

  try {
    return JSON.parse(saved);
  } catch {
    return [];
  }
}

function saveHighScores(scores) {
  localStorage.setItem(HIGH_SCORE_KEY, JSON.stringify(scores));
}

function saveHighScore(name, scoreValue) {
  const scores = loadHighScores();

  scores.push({
    name,
    score: scoreValue,
    date: new Date().toISOString()
  });

  scores.sort((a, b) => b.score - a.score);

  saveHighScores(scores.slice(0, 100));
}

function scoreQualifies(scoreValue) {
  const scores = loadHighScores();

  if (scores.length < 100) return true;

  return scoreValue > scores[scores.length - 1].score;
}

function getHighScoresHtml() {
  const scores = loadHighScores();

  if (!scores.length) {
    return `
      <div class="high-score-list">
        <h3>High Scores</h3>
        <p>No scores yet.</p>
      </div>
    `;
  }

  return `
    <div class="high-score-list">
      <h3>High Scores</h3>
      <ol>
        ${scores.map(item => `
          <li>
            <span>${escapeHtml(item.name)}</span>
            <strong>${item.score}</strong>
          </li>
        `).join("")}
      </ol>
    </div>
  `;
}

function showHighScoresPopup() {
  let popup = document.getElementById("highScoresPopup");

  if (!popup) {
    popup = document.createElement("div");
    popup.id = "highScoresPopup";
    popup.className = "high-scores-popup";
    document.body.appendChild(popup);
  }

  popup.innerHTML = `
    <div class="high-scores-inner">
      <button id="closeHighScoresBtn" class="close-high-scores">×</button>
      ${getHighScoresHtml()}
    </div>
  `;

  popup.style.display = "flex";

  document.getElementById("closeHighScoresBtn").addEventListener("click", () => {
    popup.style.display = "none";
  });
}

function addHighScoresButtonToRules() {
  if (!rulesPlayBtn) return;
  if (document.getElementById("rulesHighScoresBtn")) return;

  const btn = document.createElement("button");
  btn.id = "rulesHighScoresBtn";
  btn.textContent = "High Scores";
  btn.type = "button";

  btn.addEventListener("click", showHighScoresPopup);

  rulesPlayBtn.insertAdjacentElement("afterend", btn);
}

function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* -------------------------
   CSS FOR CROSS + SCORES
------------------------- */

function injectExtraStyles() {
  const style = document.createElement("style");

  style.textContent = `
    .cross-symbol {
      position: relative;
      display: inline-block;
      width: 1em;
      height: 1em;
      font-size: inherit;
    }

    .cross-line {
      position: absolute;
      background: black;
      border-radius: 999px;
    }

    .cross-horizontal {
      left: 0;
      right: 0;
      top: 43%;
      height: 14%;
    }

    .cross-vertical {
      top: 0;
      bottom: 0;
      left: 43%;
      width: 14%;
    }

    .cross-line.pipe-water {
      background: #00aaff;
    }

    .high-score-entry {
      margin: 12px auto;
      padding: 10px;
      border: 2px solid #00ff66;
      border-radius: 10px;
      max-width: 280px;
    }

    #highScoreNameInput {
      text-transform: uppercase;
      text-align: center;
      font-size: 18px;
      max-width: 140px;
      padding: 8px;
      margin: 8px;
    }

    #saveHighScoreBtn,
    #rulesHighScoresBtn {
      padding: 10px 14px;
      margin: 8px;
      font-weight: bold;
      border-radius: 8px;
      border: 2px solid #00ff66;
      background: #111;
      color: #00ff66;
      cursor: pointer;
    }

    .high-score-list {
      margin-top: 12px;
      max-height: 280px;
      overflow-y: auto;
    }

    .high-score-list ol {
      padding-left: 25px;
      text-align: left;
    }

    .high-score-list li {
      display: flex;
      justify-content: space-between;
      gap: 20px;
      margin: 4px 0;
      font-family: monospace;
    }

    .high-scores-popup {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.8);
      z-index: 9999;
      justify-content: center;
      align-items: center;
    }

    .high-scores-inner {
      background: white;
      color: black;
      width: 90%;
      max-width: 420px;
      max-height: 80vh;
      overflow-y: auto;
      padding: 20px;
      border-radius: 14px;
      position: relative;
      text-align: center;
    }

    .close-high-scores {
      position: absolute;
      top: 8px;
      right: 10px;
      border: none;
      background: none;
      font-size: 28px;
      cursor: pointer;
    }
  `;

  document.head.appendChild(style);
}

/* -------------------------
   BUTTONS
------------------------- */

if (playAgainBtn) {
  playAgainBtn.addEventListener("click", () => {
    if (gameOverOverlay) gameOverOverlay.style.display = "none";
    startGame();
  });
}

startBtn.addEventListener("click", startGame);
resetBtn.addEventListener("click", () => resetGame(true));

if (rulesPlayBtn) {
  rulesPlayBtn.addEventListener("click", startGame);
}

/* -------------------------
   INIT
------------------------- */

injectExtraStyles();
addHighScoresButtonToRules();
resetGame(true);