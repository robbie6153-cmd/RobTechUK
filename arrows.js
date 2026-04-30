const SIZE = 6;
const ROUND_COUNT = 5;

let elapsedTime = 0;

const DIFFICULTY_MOVES = {
  easy: 3,
  medium: 4,
  hard: 5
};

let selectedDifficulty = "easy";

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
let roundPatterns = [];
let hintsLeft = 3;
let isAnimating = false;

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
  ],
  [
    "WWBBWW",
    "WBBBBW",
    "BBBBBB",
    "BBBBBB",
    "WBBBBW",
    "WWBBWW"
  ],
  [
    "BBWWBB",
    "BWWWWB",
    "WWBBWW",
    "WWBBWW",
    "BWWWWB",
    "BBWWBB"
  ],
  [
    "WWWWWW",
    "WBBBBW",
    "WBWWBW",
    "WBWWBW",
    "WBBBBW",
    "WWWWWW"
  ],
  [
    "BBBBBB",
    "BWWWWB",
    "BWBBWB",
    "BWBBWB",
    "BWWWWB",
    "BBBBBB"
  ],
  [
    "WWWWWW",
    "WWBBWW",
    "WBBBBW",
    "WBBBBW",
    "WWBBWW",
    "WWWWWW"
  ]
];

function patternToGrid(pattern) {
  return pattern.map(row => row.split(""));
}

function copyGrid(grid) {
  return grid.map(row => [...row]);
}

function gridKey(grid) {
  return grid.map(row => row.join("")).join("");
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

function getAllMoves() {
  const allMoves = [];

  for (let i = 0; i < SIZE; i++) {
    allMoves.push({ type: "row", index: i, direction: "left" });
    allMoves.push({ type: "row", index: i, direction: "right" });
    allMoves.push({ type: "col", index: i, direction: "up" });
    allMoves.push({ type: "col", index: i, direction: "down" });
  }

  return allMoves;
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
  if (isAnimating) return;

  const move = { type, index, direction };

  isAnimating = true;
  messageEl.textContent = "";

  animateMove(move, () => {
    applyMove(playerGrid, move);

    moves++;
    renderAll();
    checkWin();

    isAnimating = false;
  });
}
function animateMove(move, done) {
  const tiles = [...playerGridEl.children];
  const firstTile = tiles[0];

  if (!firstTile) {
    done();
    return;
  }

  const tileRect = firstTile.getBoundingClientRect();
  const tileSize = tileRect.width + 4; // includes grid gap roughly

  let movingTiles = [];

  if (move.type === "row") {
    for (let col = 0; col < SIZE; col++) {
      movingTiles.push(tiles[move.index * SIZE + col]);
    }
  }

  if (move.type === "col") {
    for (let row = 0; row < SIZE; row++) {
      movingTiles.push(tiles[row * SIZE + move.index]);
    }
  }

  movingTiles.forEach(tile => {
    tile.style.transition = "transform 0.8s ease";
  });

  requestAnimationFrame(() => {
    movingTiles.forEach(tile => {
      if (move.direction === "left") tile.style.transform = `translateX(-${tileSize}px)`;
      if (move.direction === "right") tile.style.transform = `translateX(${tileSize}px)`;
      if (move.direction === "up") tile.style.transform = `translateY(-${tileSize}px)`;
      if (move.direction === "down") tile.style.transform = `translateY(${tileSize}px)`;
    });
  });

  setTimeout(() => {
    movingTiles.forEach(tile => {
      tile.style.transition = "";
      tile.style.transform = "";
    });

    done();
  }, 800);
}

function gridsMatch(a, b) {
  return gridKey(a) === gridKey(b);
}

function getRandomMove() {
  const allMoves = getAllMoves();
  return allMoves[Math.floor(Math.random() * allMoves.length)];
}

function shortestSolutionDepth(startGrid, goalGrid, maxDepth) {
  const goalKey = gridKey(goalGrid);
  const startKey = gridKey(startGrid);

  if (startKey === goalKey) return 0;

  const allMoves = getAllMoves();
  const visited = new Set([startKey]);

  let queue = [
    {
      grid: copyGrid(startGrid),
      depth: 0
    }
  ];

  while (queue.length) {
    const current = queue.shift();

    if (current.depth >= maxDepth) continue;

    for (const move of allMoves) {
      const nextGrid = copyGrid(current.grid);
      applyMove(nextGrid, move);

      const key = gridKey(nextGrid);

      if (visited.has(key)) continue;

      if (key === goalKey) {
        return current.depth + 1;
      }

      visited.add(key);

      queue.push({
        grid: nextGrid,
        depth: current.depth + 1
      });
    }
  }

  return null;
}

function scrambleFromTargetExact(moveCount) {
  const maxAttempts = 500;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
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

    const depth = shortestSolutionDepth(playerGrid, targetGrid, moveCount);

    if (depth === moveCount) {
      startingGrid = copyGrid(playerGrid);
      return;
    }
  }

  // Fallback, just in case it struggles to find an exact one.
  playerGrid = copyGrid(targetGrid);
  solutionMoves = [];

  for (let i = 0; i < moveCount; i++) {
    const move = getRandomMove();
    applyMove(playerGrid, move);
    solutionMoves.unshift(oppositeMove(move));
  }

  startingGrid = copyGrid(playerGrid);
}

function chooseRoundPatterns() {
  roundPatterns = [];

  for (let i = 0; i < ROUND_COUNT; i++) {
    const randomIndex = Math.floor(Math.random() * patterns.length);
    roundPatterns.push(patterns[randomIndex]);
  }
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

function startGame(difficulty = "easy", btn = null) {
  selectedDifficulty = difficulty;
  round = 1;
  moves = 0;
  elapsedTime = 0;

  document.querySelectorAll(".difficulty-btn").forEach(button => {
    button.classList.remove("active");
  });

  if (btn) {
    btn.classList.add("active");
  } else {
    const defaultBtn = document.querySelector(
      `.difficulty-btn[onclick*="${difficulty}"]`
    );

    if (defaultBtn) {
      defaultBtn.classList.add("active");
    }
  }

  chooseRoundPatterns();
  startRound();
}

function startRound() {
  clearInterval(timer);

  moves = 0;
  hintsLeft = 3;
  messageEl.textContent = "";

  targetGrid = patternToGrid(roundPatterns[round - 1]);

  const movesAway = DIFFICULTY_MOVES[selectedDifficulty];
  scrambleFromTargetExact(movesAway);

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

function findBestMove() {
  const possibleMoves = getAllMoves();

  let bestMove = null;
  let bestDepth = Infinity;

  possibleMoves.forEach(move => {
    const testGrid = copyGrid(playerGrid);
    applyMove(testGrid, move);

    const depth = shortestSolutionDepth(testGrid, targetGrid, 6);

    if (depth !== null && depth < bestDepth) {
      bestDepth = depth;
      bestMove = move;
    }
  });

  return bestMove;
}

hintBtn.addEventListener("click", () => {
  if (isAnimating) return;

  if (hintsLeft <= 0) {
    messageEl.textContent = "No hints left this round.";
    return;
  }

  hintsLeft--;

  const bestMove = solutionMoves[moves];

  if (!bestMove) {
    messageEl.textContent = `No hint available. Hints left: ${hintsLeft}`;
    return;
  }

  let text = "";

  if (bestMove.type === "row") {
    text = `Try row ${bestMove.index + 1} ${bestMove.direction}.`;
  } else {
    text = `Try column ${bestMove.index + 1} ${bestMove.direction}.`;
  }

  messageEl.textContent = `${text} Hints left: ${hintsLeft}`;
});

backBtn.addEventListener("click", () => {
  window.history.back();
});


createArrowButtons();
chooseRoundPatterns();
startGame("easy", document.querySelector(".difficulty-btn"));