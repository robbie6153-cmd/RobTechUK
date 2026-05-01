const GRID_SIZE = 25;
const MAX_ROUNDS = 50;
const START_SEQUENCE_LENGTH = 5;
const FLASH_TIME = 500;
const GAP_TIME = 500;
const START_LIVES = 3;

let round = 1;
let lives = START_LIVES;
let sequence = [];
let playerInput = [];
let acceptingInput = false;
let gameActive = false;

const grid = document.getElementById("grid");
const roundText = document.getElementById("roundText");
const livesText = document.getElementById("livesText");
const message = document.getElementById("message");
const startBtn = document.getElementById("startBtn");
const restartBtn = document.getElementById("restartBtn");
const backBtn = document.getElementById("backBtn");

function buildGrid() {
  grid.innerHTML = "";

  for (let i = 0; i < GRID_SIZE; i++) {
    const square = document.createElement("button");
    square.className = "square disabled";
    square.dataset.index = i;
    square.addEventListener("click", () => handleSquareTap(i));
    grid.appendChild(square);
  }
}

function updateDisplay() {
  roundText.textContent = `${round}/${MAX_ROUNDS}`;
  livesText.textContent = "❤️".repeat(lives) + "🖤".repeat(START_LIVES - lives);
}

function getSequenceLength() {
  return START_SEQUENCE_LENGTH + (round - 1);
}

function generateSequence() {
  const length = getSequenceLength();
  sequence = [];

  for (let i = 0; i < length; i++) {
    sequence.push(Math.floor(Math.random() * GRID_SIZE));
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function showMessage(text, colourClass, duration = 1200) {
  message.textContent = text;
  message.className = `message ${colourClass}`;

  setTimeout(() => {
    message.className = "message hidden";
  }, duration);
}

function setGridDisabled(disabled) {
  document.querySelectorAll(".square").forEach(square => {
    square.classList.toggle("disabled", disabled);
  });
}

async function flashSquare(index) {
  const square = document.querySelector(`.square[data-index="${index}"]`);
  square.classList.add("flash");
  await sleep(FLASH_TIME);
  square.classList.remove("flash");
  await sleep(GAP_TIME);
}

async function playSequence() {
  acceptingInput = false;
  setGridDisabled(true);
  playerInput = [];

  await sleep(600);

  for (const index of sequence) {
    await flashSquare(index);
  }

  showMessage("REPEAT THE SEQUENCE", "red", 1400);

  await sleep(1400);

  acceptingInput = true;
  setGridDisabled(false);
}

function handleSquareTap(index) {
  if (!acceptingInput || !gameActive) return;

  const square = document.querySelector(`.square[data-index="${index}"]`);
  square.classList.add("player-tap");

  setTimeout(() => {
    square.classList.remove("player-tap");
  }, 160);

  playerInput.push(index);

  const currentPosition = playerInput.length - 1;

  if (playerInput[currentPosition] !== sequence[currentPosition]) {
    handleWrongAnswer();
    return;
  }

  if (playerInput.length === sequence.length) {
    handleCorrectAnswer();
  }
}

async function handleCorrectAnswer() {
  acceptingInput = false;
  setGridDisabled(true);

  showMessage("CORRECT!", "green", 1000);
  await sleep(1200);

  if (round >= MAX_ROUNDS) {
    winGame();
    return;
  }

  round++;
  updateDisplay();
  startRound();
}

async function handleWrongAnswer() {
  acceptingInput = false;
  setGridDisabled(true);

  lives--;
  updateDisplay();

  grid.classList.add("shake");
  showMessage("INCORRECT!", "red", 1000);

  setTimeout(() => {
    grid.classList.remove("shake");
  }, 350);

  await sleep(1200);

  if (lives <= 0) {
    gameOver();
    return;
  }

  showMessage("TRY AGAIN", "red", 900);
  await sleep(1000);

  playerInput = [];
  playSequence();
}

function startRound() {
  generateSequence();
  playSequence();
}

function startGame() {
  round = 1;
  lives = START_LIVES;
  gameActive = true;
  acceptingInput = false;

  startBtn.classList.add("hidden");
  restartBtn.classList.add("hidden");

  updateDisplay();
  startRound();
}

function gameOver() {
  gameActive = false;
  acceptingInput = false;
  setGridDisabled(true);

  showMessage(`GAME OVER\nYou reached round ${round}`, "red", 2500);

  setTimeout(() => {
    restartBtn.classList.remove("hidden");
  }, 1600);
}

function winGame() {
  gameActive = false;
  acceptingInput = false;
  setGridDisabled(true);

  showMessage("LEVEL 50 COMPLETE!", "gold", 3500);
  launchConfetti();

  setTimeout(() => {
    restartBtn.classList.remove("hidden");
  }, 2500);
}

function launchConfetti() {
  const colours = ["red", "gold", "lime", "deepskyblue", "white", "hotpink", "orange"];

  for (let i = 0; i < 120; i++) {
    const piece = document.createElement("div");
    piece.className = "confetti-piece";

    piece.style.left = `${Math.random() * 100}vw`;
    piece.style.background = colours[Math.floor(Math.random() * colours.length)];
    piece.style.animationDelay = `${Math.random() * 0.8}s`;

    document.body.appendChild(piece);

    setTimeout(() => {
      piece.remove();
    }, 3500);
  }
}

startBtn.addEventListener("click", startGame);
restartBtn.addEventListener("click", startGame);

backBtn.addEventListener("click", () => {
  window.location.href = "index.html";
});

buildGrid();
updateDisplay();