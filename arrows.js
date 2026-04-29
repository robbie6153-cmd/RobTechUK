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
const rulesOverlay = document.getElementById("rulesOverlay");
const closeRulesBtn = document.getElementById("closeRulesBtn");

const arrows = ["up", "down", "left", "right"];
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

let board = [];
let startingBoard = [];
let targetPattern = [];
let plannedSolution = [];
let solutionStep = 0;

const roundSolutions = [
  ["black", "white", "black"],
  ["white", "black", "black", "white"],
  ["black", "black", "white", "black", "white"],
  ["white", "black", "white", "white", "black", "black"],
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
      const isT = row === 0 || row === 1 || col === 2 || col === 3;
      pattern.push(isT ? "black" : "white");
    }

    if (roundNumber === 5) {
      pattern.push((row + col) % 2 === 0 ? "black" : "white");
    }
  }

  return pattern;
}

function createTargetBoard(pattern) {
  return pattern.map(colour => ({
    colour,
    arrow: arrows[Math.floor(Math.random() * arrows.length)]
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

function moveColour(colour, inverse = false) {
  const newBoard = cloneBoard(board);

  for (let i = 0; i < TOTAL; i++) {
    if (board[i].colour === colour) {
      const next = getNextIndex(i, board[i].arrow, inverse);
      const temp = newBoard[next];
      newBoard[next] = newBoard[i];
      newBoard[i] = temp;
    }
  }

  board = newBoard;
}

function scrambleFromTarget() {
  targetPattern = createTargets(round);
  board = createTargetBoard(targetPattern);

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

  board.forEach((tile) => {
    const square = document.createElement("button");
    square.className = `tile ${tile.colour}`;
    square.textContent = arrowSymbols[tile.arrow];

    square.addEventListener("click", () => {
      handleMove(tile.colour);
    });

    gameGrid.appendChild(square);
  });
}

function handleMove(colour) {
  moveColour(colour);
  moves++;
  movesText.textContent = moves;

  if (plannedSolution[solutionStep] === colour) {
    solutionStep++;
  }

  renderBoard();
  checkWin();
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
  board = cloneBoard(startingBoard);
  moves = 0;
  hintsLeft = 3;
  solutionStep = 0;

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

  const nextMove = plannedSolution[solutionStep] || plannedSolution[0];

  hintsLeft--;
  hintBtn.textContent = `Hint ${hintsLeft}`;
  messageText.textContent = `Try tapping a ${nextMove} square next.`;
}

resetBtn.addEventListener("click", resetRound);
hintBtn.addEventListener("click", useHint);

rulesBtn.addEventListener("click", () => {
  rulesOverlay.classList.remove("hidden");
});

closeRulesBtn.addEventListener("click", () => {
  rulesOverlay.classList.add("hidden");
});

startRound();