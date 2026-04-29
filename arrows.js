const SIZE = 6;
const TOTAL = SIZE * SIZE;

const gameGrid = document.getElementById("gameGrid");
const targetGrid = document.getElementById("targetGrid");
const roundText = document.getElementById("roundText");
const movesText = document.getElementById("movesText");
const timerText = document.getElementById("timerText");
const messageText = document.getElementById("messageText");
const resetBtn = document.getElementById("resetBtn");
const hintBtn = document.getElementById("hintBtn");
const rulesBtn = document.getElementById("rulesBtn");
const backBtn = document.getElementById("backBtn");
const rulesOverlay = document.getElementById("rulesOverlay");
const closeRulesBtn = document.getElementById("closeRulesBtn");

const arrows = ["up", "right", "down", "left"];

const arrowSymbols = {
  up: "↑",
  down: "↓",
  left: "←",
  right: "→"
};

let round = 1;
let moves = 0;
let seconds = 0;
let timer = null;
let hintsLeft = 3;
let animating = false;

let board = [];
let startingBoard = [];
let targetPattern = [];
let moveHistory = [];

let plannedSolution = [];
let solutionStep = 0;

const roundSolutions = [
  ["black", "white", "black"],
  ["white", "black", "black", "white"],
  ["black", "white", "black", "white", "black"],
  ["white", "black", "white", "black", "white", "black"],
  ["black", "white", "black", "white", "black", "white", "black"]
];

function createTargets(roundNumber) {
  const pattern = [];

  for (let i = 0; i < TOTAL; i++) {
    const row = Math.floor(i / SIZE);
    const col = i % SIZE;

    if (roundNumber === 1) {
      pattern.push(row % 2 === 0 ? "black" : "white");
    }

    if (roundNumber === 2) {
      pattern.push(col < 3 ? "black" : "white");
    }

    if (roundNumber === 3) {
      const top = row < 3;
      const left = col < 3;
      pattern.push(top === left ? "black" : "white");
    }

    if (roundNumber === 4) {
      const isT = row < 2 || col === 2 || col === 3;
      pattern.push(isT ? "black" : "white");
    }

    if (roundNumber === 5) {
      pattern.push((row + col) % 2 === 0 ? "black" : "white");
    }
  }

  return pattern;
}

function createSolvedBoard(pattern) {
  return pattern.map((colour, index) => ({
    id: index,
    colour,
    arrow: arrows[index % arrows.length]
  }));
}

function cloneBoard(source) {
  return source.map(tile => ({ ...tile }));
}

function getIndex(row, col) {
  return row * SIZE + col;
}

function getNextIndex(index, direction, inverse = false) {
  let row = Math.floor(index / SIZE);
  let col = index % SIZE;
  let dir = direction;

  if (inverse) {
    if (dir === "up") dir = "down";
    else if (dir === "down") dir = "up";
    else if (dir === "left") dir = "right";
    else if (dir === "right") dir = "left";
  }

  if (dir === "up") row = (row - 1 + SIZE) % SIZE;
  if (dir === "down") row = (row + 1) % SIZE;
  if (dir === "left") col = (col - 1 + SIZE) % SIZE;
  if (dir === "right") col = (col + 1) % SIZE;

  return getIndex(row, col);
}

function getMoveAnimations(colour) {
  const animations = [];

  board.forEach((tile, index) => {
    if (tile.colour !== colour) return;

    const next = getNextIndex(index, tile.arrow, false);
    const row = Math.floor(index / SIZE);
    const col = index % SIZE;
    const nextRow = Math.floor(next / SIZE);
    const nextCol = next % SIZE;

    animations.push({
      id: tile.id,
      x: (nextCol - col) * 100,
      y: (nextRow - row) * 100
    });
  });

  return animations;
}

function moveColour(colour, inverse = false) {
  const selectedTiles = board
    .filter(tile => tile.colour === colour)
    .sort((a, b) => inverse ? b.id - a.id : a.id - b.id);

  selectedTiles.forEach(tileToMove => {
    const currentIndex = board.findIndex(tile => tile.id === tileToMove.id);
    const tile = board[currentIndex];
    const nextIndex = getNextIndex(currentIndex, tile.arrow, inverse);

    const temp = board[nextIndex];
    board[nextIndex] = board[currentIndex];
    board[currentIndex] = temp;
  });
}

function scrambleFromTarget() {
  targetPattern = createTargets(round);
  board = createSolvedBoard(targetPattern);

  plannedSolution = roundSolutions[round - 1];

  const backwards = [...plannedSolution].reverse();

  backwards.forEach(colour => {
    moveColour(colour, true);
  });

  startingBoard = cloneBoard(board);
}

function renderTarget() {
  targetGrid.innerHTML = "";

  targetPattern.forEach(colour => {
    const square = document.createElement("div");
    square.className = `target-tile ${colour}`;
    targetGrid.appendChild(square);
  });
}

function renderBoard() {
  gameGrid.innerHTML = "";

  board.forEach(tile => {
    const square = document.createElement("button");
    square.className = `tile ${tile.colour}`;
    square.textContent = arrowSymbols[tile.arrow];
    square.dataset.id = tile.id;

    square.addEventListener("click", () => {
      handleMove(tile.colour);
    });

    gameGrid.appendChild(square);
  });
}

function animateMove(colour, callback) {
  animating = true;

  const animations = getMoveAnimations(colour);

  animations.forEach(move => {
    const tileEl = document.querySelector(`[data-id="${move.id}"]`);

    if (tileEl) {
      tileEl.style.transform = `translate(${move.x}%, ${move.y}%)`;
      tileEl.style.zIndex = "5";
    }
  });

  setTimeout(() => {
    callback();

    renderBoard();
    animating = false;
    checkWin();
  }, 1500);
}

function handleMove(colour) {
  if (animating) return;

  moveHistory.push(cloneBoard(board));

  animateMove(colour, () => {
    moveColour(colour);

    moves++;
    movesText.textContent = moves;

    if (plannedSolution[solutionStep] === colour) {
      solutionStep++;
    }

    messageText.textContent = "";
  });
}

function undoMove() {
  if (animating) return;

  if (moveHistory.length === 0) {
    messageText.textContent = "No previous move to undo.";
    return;
  }

  board = moveHistory.pop();

  if (moves > 0) moves--;

  solutionStep = Math.max(0, solutionStep - 1);

  movesText.textContent = moves;
  messageText.textContent = "Previous move undone.";

  renderBoard();
}

function checkWin() {
  const currentPattern = board.map(tile => tile.colour);

  const solved = currentPattern.every((colour, index) => {
    return colour === targetPattern[index];
  });

  if (!solved) return;

  clearInterval(timer);

  if (round < 5) {
    messageText.textContent = `Round ${round} complete!`;

    setTimeout(() => {
      round++;
      startRound();
    }, 1200);
  } else {
    messageText.textContent = `Game complete! Final time: ${seconds}s`;
  }
}

function startTimer() {
  clearInterval(timer);

  timer = setInterval(() => {
    seconds++;
    timerText.textContent = seconds;
  }, 1000);
}

function startRound() {
  moves = 0;
  hintsLeft = 3;
  solutionStep = 0;
  moveHistory = [];

  roundText.textContent = round;
  movesText.textContent = moves;
  hintBtn.textContent = `Hint ${hintsLeft}`;
  messageText.textContent = "";

  scrambleFromTarget();
  renderTarget();
  renderBoard();

  if (round === 1 && seconds === 0) {
    startTimer();
  }
}

function resetRound() {
  if (animating) return;

  board = cloneBoard(startingBoard);
  moves = 0;
  hintsLeft = 3;
  solutionStep = 0;
  moveHistory = [];

  movesText.textContent = moves;
  hintBtn.textContent = `Hint ${hintsLeft}`;
  messageText.textContent = "Round reset.";

  renderBoard();
}

function useHint() {
  if (hintsLeft <= 0) {
    messageText.textContent = "No hints left this round.";
    return;
  }

  const nextMove = plannedSolution[solutionStep];

  hintsLeft--;
  hintBtn.textContent = `Hint ${hintsLeft}`;

  if (nextMove) {
    messageText.textContent = `Try tapping a ${nextMove} square next.`;
  } else {
    messageText.textContent = "You may already be close.";
  }
}

resetBtn.addEventListener("click", resetRound);
hintBtn.addEventListener("click", useHint);
backBtn.addEventListener("click", undoMove);

rulesBtn.addEventListener("click", () => {
  rulesOverlay.classList.remove("hidden");
});

closeRulesBtn.addEventListener("click", () => {
  rulesOverlay.classList.add("hidden");
});

startRound();