const SIZE = 6;
const ROUND_COUNT = 5;
let elapsedTime = 0;;

const targetGridEl = document.getElementById("targetGrid");
const playerGridEl = document.getElementById("playerGrid");

const topArrowsEl = document.getElementById("topArrows");
const bottomArrowsEl = document.getElementById("bottomArrows");
const leftArrowsEl = document.getElementById("leftArrows");
const rightArrowsEl = document.getElementById("rightArrows");

const roundText = document.getElementById("roundText");
const movesText = document.getElementById("movesText");
const timeText = document.getElementById("timeText");
const messageEl = document.getElementById("message");

const resetBtn = document.getElementById("resetBtn");
const hintBtn = document.getElementById("hintBtn");
const backBtn = document.getElementById("backBtn");

let round = 1;
let moves = 0;
let timer = null;

let targetGrid = [];
let playerGrid = [];
let startingGrid = [];
let solutionMoves = [];

const patterns = [
  [
    "WWWWWW",
    "BBBBBB",
    "WWWWWW",
    "BBBBBB",
    "WWWWWW",
    "BBBBBB"
  ],
  [
    "WWWBBB",
    "WWWBBB",
    "WWWBBB",
    "BBBWWW",
    "BBBWWW",
    "BBBWWW"
  ],
  [
    "WWBBWW",
    "BBWWBB",
    "WWBBWW",
    "BBWWBB",
    "WWBBWW",
    "BBWWBB"
  ],
  [
    "WBBBBW",
    "BWBBWB",
    "BBWBBB",
    "BBWBBB",
    "BWBBWB",
    "WBBBBW"
  ],
  [
    "WBWBWB",
    "BWBWBW",
    "WBWBWB",
    "BWBWBW",
    "WBWBWB",
    "BWBWBW"
  ]
];

function patternToGrid(pattern) {
  return pattern.map(row => row.split(""));
}

function copyGrid(grid) {
  return grid.map(row => [...row]);
}

function renderGrid(element, grid) {
  element.innerHTML = "";

  grid.flat().forEach(cell => {
    const tile = document.createElement("div");
    tile.className = `tile ${cell === "W" ? "white" : "black"}`;
    element.appendChild(tile);
  });
}

function renderAll() {
  renderGrid(targetGridEl, targetGrid);
  renderGrid(playerGridEl, playerGrid);

  roundText.textContent = `${round}/${ROUND_COUNT}`;
  movesText.textContent = moves;
  timeText.textContent = `${elapsedTime}s`;
}

function createArrowButtons() {
  topArrowsEl.innerHTML = "";
  bottomArrowsEl.innerHTML = "";
  leftArrowsEl.innerHTML = "";
  rightArrowsEl.innerHTML = "";

  for (let col = 0; col < SIZE; col++) {
    const upBtn = document.createElement("button");
    upBtn.className = "arrow-btn";
    upBtn.textContent = "↑";
    upBtn.onclick = () => makeMove("col", col, "up");
    topArrowsEl.appendChild(upBtn);

    const downBtn = document.createElement("button");
    downBtn.className = "arrow-btn";
    downBtn.textContent = "↓";
    downBtn.onclick = () => makeMove("col", col, "down");
    bottomArrowsEl.appendChild(downBtn);
  }

  for (let row = 0; row < SIZE; row++) {
    const leftBtn = document.createElement("button");
    leftBtn.className = "arrow-btn";
    leftBtn.textContent = "←";
    leftBtn.onclick = () => makeMove("row", row, "left");
    leftArrowsEl.appendChild(leftBtn);

    const rightBtn = document.createElement("button");
    rightBtn.className = "arrow-btn";
    rightBtn.textContent = "→";
    rightBtn.onclick = () => makeMove("row", row, "right");
    rightArrowsEl.appendChild(rightBtn);
  }
}

function shiftRow(grid, row, direction) {
  if (direction === "right") {
    grid[row].unshift(grid[row].pop());
  }

  if (direction === "left") {
    grid[row].push(grid[row].shift());
  }
}

function shiftColumn(grid, col, direction) {
  const column = [];

  for (let row = 0; row < SIZE; row++) {
    column.push(grid[row][col]);
  }

  if (direction === "down") {
    column.unshift(column.pop());
  }

  if (direction === "up") {
    column.push(column.shift());
  }

  for (let row = 0; row < SIZE; row++) {
    grid[row][col] = column[row];
  }
}

function applyMove(grid, move) {
  if (move.type === "row") {
    shiftRow(grid, move.index, move.direction);
  }

  if (move.type === "col") {
    shiftColumn(grid, move.index, move.direction);
  }
}

function oppositeMove(move) {
  const opposites = {
    left: "right",
    right: "left",
    up: "down",
    down: "up"
  };

  return {
    type: move.type,
    index: move.index,
    direction: opposites[move.direction]
  };
}

function makeMove(type, index, direction) {
  const move = { type, index, direction };

  applyMove(playerGrid, move);

  moves++;
  messageEl.textContent = "";

  renderAll();
  checkWin();
}

function gridsMatch(a, b) {
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      if (a[row][col] !== b[row][col]) {
        return false;
      }
    }
  }

  return true;
}

function getRandomMove() {
  const type = Math.random() < 0.5 ? "row" : "col";
  const index = Math.floor(Math.random() * SIZE);

  let direction;

  if (type === "row") {
    direction = Math.random() < 0.5 ? "left" : "right";
  } else {
    direction = Math.random() < 0.5 ? "up" : "down";
  }

  return { type, index, direction };
}

function scrambleFromTarget(moveCount) {
  playerGrid = copyGrid(targetGrid);
  solutionMoves = [];

  let previousMove = null;

  for (let i = 0; i < moveCount; i++) {
    let move = getRandomMove();

    while (
      previousMove &&
      move.type === previousMove.type &&
      move.index === previousMove.index &&
      move.direction === oppositeMove(previousMove).direction
    ) {
      move = getRandomMove();
    }

    applyMove(playerGrid, move);
    solutionMoves.unshift(oppositeMove(move));
    previousMove = move;
  }

  startingGrid = copyGrid(playerGrid);
}
function showBigFlash(text) {
  let flash = document.getElementById("bigFlash");

  if (!flash) {
    flash = document.createElement("div");
    flash.id = "bigFlash";
    document.body.appendChild(flash);
  }

  flash.textContent = text;
  flash.classList.remove("show");

  void flash.offsetWidth;

  flash.classList.add("show");

  setTimeout(() => {
    flash.classList.remove("show");
  }, 1000);
}

function startRound() {
  clearInterval(timer);

  moves = 0;
  messageEl.textContent = "";

  targetGrid = patternToGrid(patterns[round - 1]);

  const movesAway = round + 2;
  scrambleFromTarget(movesAway);

  renderAll();

  showBigFlash(`Round ${round}`);

  timer = setInterval(() => {
    elapsedTime++;
    timeText.textContent = `${elapsedTime}s`;
  }, 1000);
}

function checkWin() {
  if (!gridsMatch(playerGrid, targetGrid)) return;

  clearInterval(timer);

  showBigFlash("Correct!");
  messageEl.textContent = "Pattern matched!";

  setTimeout(() => {
    if (round < ROUND_COUNT) {
      round++;
      startRound();
    } else {
      showBigFlash("Game complete!");
      messageEl.textContent = `Game complete! Time: ${elapsedTime}s`;
    }
  }, 1200);
}

resetBtn.addEventListener("click", () => {
  playerGrid = copyGrid(startingGrid);
  moves = 0;
  messageEl.textContent = "Round reset.";
  renderAll();
});

hintBtn.addEventListener("click", () => {
  if (!solutionMoves.length) {
    messageEl.textContent = "No hint available.";
    return;
  }

  const move = solutionMoves[0];

  let text = "";

  if (move.type === "row") {
    text = `Try row ${move.index + 1} ${move.direction}.`;
  } else {
    text = `Try column ${move.index + 1} ${move.direction}.`;
  }

  messageEl.textContent = text;
});

backBtn.addEventListener("click", () => {
  window.history.back();
});

createArrowButtons();
startRound();