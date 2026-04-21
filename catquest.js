const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const timeEl = document.getElementById("time");
const scoreEl = document.getElementById("score");
const livesLostEl = document.getElementById("livesLost");
const messageEl = document.getElementById("message");

const TILE_SIZE = 40;
const ROWS = 15;
const COLS = 15;

const WALL = "#";
const PATH = " ";
const START = "S";
const EXIT = "E";
const TREAT = ".";

const mazeTemplate = [
  "###############",
  "#S....#.......#",
  "#.###.#.#####.#",
  "#...#.#.....#.#",
  "###.#.###.#.#.#",
  "#...#.....#.#.#",
  "#.#######.#.#.#",
  "#.#.....#.#...#",
  "#.#.###.#.###.#",
  "#...#...#...#.#",
  "#####.#####.#.#",
  "#.....#.....#.#",
  "#.#####.#####.#",
  "#............E#",
  "###############"
];

let maze = [];
let treats = new Set();
let score = 0;
let livesLost = 0;
let timeLeft = 60;
let gameOver = false;
let timerInterval = null;
let animationFrameId = null;
let lastTime = 0;

let startTile = { row: 1, col: 1 };
let exitTile = { row: 13, col: 13 };

const cat = {
  x: 0,
  y: 0,
  size: 28,
  speed: 140,
  dirX: 0,
  dirY: 0
};

const dogs = [];

const catImg = new Image();
catImg.src = "cat.jpg";

const treatImg = new Image();
treatImg.src = "treat.jpg";

function tileKey(row, col) {
  return `${row},${col}`;
}

function cloneMaze() {
  return mazeTemplate.map(row => row.split(""));
}

function resetMazeAndTreats() {
  maze = cloneMaze();
  treats.clear();

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const cell = maze[row][col];

      if (cell === START) {
        startTile = { row, col };
        maze[row][col] = PATH;
      } else if (cell === EXIT) {
        exitTile = { row, col };
        maze[row][col] = PATH;
      } else if (cell === TREAT) {
        treats.add(tileKey(row, col));
        maze[row][col] = PATH;
      }
    }
  }
}

function tileCenter(row, col) {
  return {
    x: col * TILE_SIZE + TILE_SIZE / 2,
    y: row * TILE_SIZE + TILE_SIZE / 2
  };
}

function resetCatPosition() {
  const pos = tileCenter(startTile.row, startTile.col);
  cat.x = pos.x;
  cat.y = pos.y;
  cat.dirX = 0;
  cat.dirY = 0;
}

function createDogs() {
  dogs.length = 0;

  for (let i = 0; i < 3; i++) {
    const pos = tileCenter(exitTile.row, exitTile.col);
    dogs.push({
      x: pos.x + (i - 1) * 6,
      y: pos.y + (i - 1) * 6,
      size: 26,
      speed: 95,
      dirX: 0,
      dirY: 0,
      changeTimer: 0
    });
  }
}

function resetRoundPositions() {
  resetCatPosition();
  createDogs();
}

function isWallAtPixel(x, y, radius = 12) {
  const testPoints = [
    { x: x - radius, y: y - radius },
    { x: x + radius, y: y - radius },
    { x: x - radius, y: y + radius },
    { x: x + radius, y: y + radius }
  ];

  for (const point of testPoints) {
    const col = Math.floor(point.x / TILE_SIZE);
    const row = Math.floor(point.y / TILE_SIZE);

    if (row < 0 || row >= ROWS || col < 0 || col >= COLS) {
      return true;
    }

    if (maze[row][col] === WALL) {
      return true;
    }
  }

  return false;
}

function moveEntity(entity, dt) {
  const newX = entity.x + entity.dirX * entity.speed * dt;
  const newY = entity.y + entity.dirY * entity.speed * dt;

  if (!isWallAtPixel(newX, entity.y, entity.size / 2 - 2)) {
    entity.x = newX;
  } else {
    entity.dirX = 0;
  }

  if (!isWallAtPixel(entity.x, newY, entity.size / 2 - 2)) {
    entity.y = newY;
  } else {
    entity.dirY = 0;
  }
}

function collectTreats() {
  const col = Math.floor(cat.x / TILE_SIZE);
  const row = Math.floor(cat.y / TILE_SIZE);
  const key = tileKey(row, col);

  if (treats.has(key)) {
    treats.delete(key);
    score += 1;
    scoreEl.textContent = score;
  }
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function handleDogCollision() {
  for (const dog of dogs) {
    if (distance(cat, dog) < 24) {
      livesLost += 1;
      livesLostEl.textContent = livesLost;
      messageEl.textContent = "Caught by a dog! Restarting from the entrance...";
      resetRoundPositions();
      return;
    }
  }
}

function validDirectionsForDog(dog) {
  const directions = [
    { dx: 1, dy: 0 },
    { dx: -1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: 0, dy: -1 }
  ];

  return directions.filter(dir => {
    const testX = dog.x + dir.dx * 12;
    const testY = dog.y + dir.dy * 12;
    return !isWallAtPixel(testX, testY, dog.size / 2 - 2);
  });
}

function updateDogs(dt) {
  dogs.forEach(dog => {
    dog.changeTimer -= dt;

    const nearCenterX = Math.abs((dog.x % TILE_SIZE) - TILE_SIZE / 2) < 6;
    const nearCenterY = Math.abs((dog.y % TILE_SIZE) - TILE_SIZE / 2) < 6;

    if (dog.changeTimer <= 0 || (dog.dirX === 0 && dog.dirY === 0) || (nearCenterX && nearCenterY)) {
      const options = validDirectionsForDog(dog);

      if (options.length > 0) {
        const choice = options[Math.floor(Math.random() * options.length)];
        dog.dirX = choice.dx;
        dog.dirY = choice.dy;
        dog.changeTimer = 0.6 + Math.random() * 1.2;
      }
    }

    moveEntity(dog, dt);
  });
}

function drawMaze() {
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const x = col * TILE_SIZE;
      const y = row * TILE_SIZE;

      if (maze[row][col] === WALL) {
        ctx.fillStyle = "#1f7a1f";
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        ctx.strokeStyle = "#00ff88";
        ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);
      } else {
        ctx.fillStyle = "#111";
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
      }
    }
  }

  const startPos = tileCenter(startTile.row, startTile.col);
  const exitPos = tileCenter(exitTile.row, exitTile.col);

  ctx.fillStyle = "#1e88ff";
  ctx.fillRect(startPos.x - 16, startPos.y - 16, 32, 32);

  ctx.fillStyle = "#ff9800";
  ctx.fillRect(exitPos.x - 16, exitPos.y - 16, 32, 32);
}

function drawTreats() {
  treats.forEach(key => {
    const [row, col] = key.split(",").map(Number);
    const x = col * TILE_SIZE + 10;
    const y = row * TILE_SIZE + 10;

    if (treatImg.complete && treatImg.naturalWidth > 0) {
      ctx.drawImage(treatImg, x, y, 20, 20);
    } else {
      ctx.fillStyle = "#ffd54f";
      ctx.beginPath();
      ctx.arc(x + 10, y + 10, 7, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

function drawCat() {
  if (catImg.complete && catImg.naturalWidth > 0) {
    ctx.drawImage(catImg, cat.x - 16, cat.y - 16, 32, 32);
  } else {
    ctx.fillStyle = "#111";
    ctx.beginPath();
    ctx.arc(cat.x, cat.y, 14, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(cat.x - 5, cat.y - 3, 2, 0, Math.PI * 2);
    ctx.arc(cat.x + 5, cat.y - 3, 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawDogs() {
  dogs.forEach(dog => {
    ctx.fillStyle = "#8d6e63";
    ctx.beginPath();
    ctx.arc(dog.x, dog.y, 13, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(dog.x - 4, dog.y - 2, 2, 0, Math.PI * 2);
    ctx.arc(dog.x + 4, dog.y - 2, 2, 0, Math.PI * 2);
    ctx.fill();
  });
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawMaze();
  drawTreats();
  drawCat();
  drawDogs();
}

function endGame(win = false) {
  gameOver = true;
  clearInterval(timerInterval);
  cancelAnimationFrame(animationFrameId);

  if (win) {
    messageEl.textContent = `You cleared every Dreamie with ${timeLeft} seconds left. Final score: ${score}`;
  } else {
    messageEl.textContent = `Time up. Final score: ${score}`;
  }
}

function gameLoop(timestamp) {
  if (gameOver) return;

  if (!lastTime) lastTime = timestamp;
  const dt = Math.min((timestamp - lastTime) / 1000, 0.033);
  lastTime = timestamp;

  moveEntity(cat, dt);
  updateDogs(dt);
  collectTreats();
  handleDogCollision();
  draw();

  if (treats.size === 0) {
    endGame(true);
    return;
  }

  animationFrameId = requestAnimationFrame(gameLoop);
}

function startTimer() {
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    if (gameOver) return;

    timeLeft -= 1;
    timeEl.textContent = timeLeft;

    if (timeLeft <= 0) {
      timeLeft = 0;
      timeEl.textContent = 0;
      endGame(false);
    }
  }, 1000);
}

function setCatDirection(dir) {
  if (gameOver) return;

  if (dir === "up") {
    cat.dirX = 0;
    cat.dirY = -1;
  } else if (dir === "down") {
    cat.dirX = 0;
    cat.dirY = 1;
  } else if (dir === "left") {
    cat.dirX = -1;
    cat.dirY = 0;
  } else if (dir === "right") {
    cat.dirX = 1;
    cat.dirY = 0;
  }
}

function bindControls() {
  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowUp") setCatDirection("up");
    if (e.key === "ArrowDown") setCatDirection("down");
    if (e.key === "ArrowLeft") setCatDirection("left");
    if (e.key === "ArrowRight") setCatDirection("right");
  });

  document.querySelectorAll(".control-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      setCatDirection(btn.dataset.dir);
    });
  });
}

function initGame() {
  resetMazeAndTreats();
  resetRoundPositions();
  bindControls();
  draw();
  startTimer();
  animationFrameId = requestAnimationFrame(gameLoop);
}

initGame();