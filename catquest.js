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
  size: 30,
  speed: 140,
  dirX: 0,
  dirY: 0
};

const dogs = [];

const catImg = new Image();
catImg.src = "cat.jpg";

const treatImg = new Image();
treatImg.src = "treat.jpg";
const dog1Img = new Image();
dog1Img.src = "dog1.png";

const dog2Img = new Image();
dog2Img.src = "dog2.png";

const dog3Img = new Image();
dog3Img.src = "dog3.png";

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

function pixelToTile(x, y) {
  return {
    row: Math.floor(y / TILE_SIZE),
    col: Math.floor(x / TILE_SIZE)
  };
}

function isWalkableTile(row, col) {
  return row >= 0 && row < ROWS && col >= 0 && col < COLS && maze[row][col] !== WALL;
}

function isDecisionPoint(entity) {
  const center = tileCenter(
    Math.floor(entity.y / TILE_SIZE),
    Math.floor(entity.x / TILE_SIZE)
  );
  return Math.abs(entity.x - center.x) < 5 && Math.abs(entity.y - center.y) < 5;
}

function alignEntityToTileCenter(entity) {
  const tile = pixelToTile(entity.x, entity.y);
  const center = tileCenter(tile.row, tile.col);
  entity.x = center.x;
  entity.y = center.y;
}

function resetCatPosition() {
  const pos = tileCenter(startTile.row, startTile.col);
  cat.x = pos.x;
  cat.y = pos.y;
  cat.dirX = 0;
  cat.dirY = 0;
}

function findNearestOpenCornerTargets() {
  return [
    { row: 1, col: 1 },
    { row: 1, col: COLS - 2 },
    { row: ROWS - 2, col: COLS - 2 },
    { row: ROWS - 2, col: 1 }
  ].filter(t => isWalkableTile(t.row, t.col));
}

const patrolTargets = findNearestOpenCornerTargets();

function createDogs() {
  dogs.length = 0;

  const spawnPositions = [
    tileCenter(exitTile.row, exitTile.col),
    tileCenter(exitTile.row, exitTile.col - 1),
    tileCenter(exitTile.row - 1, exitTile.col)
  ];

  dogs.push({
    x: spawnPositions[0].x,
    y: spawnPositions[0].y,
    size: 28,
    speed: 92,
    dirX: 0,
    dirY: 0,
    type: "guardStart",
    color: "#8d6e63",
    name: "Bulldog",
    img: dog1Img,
    pathTimer: 0
  });

    dogs.push({
    x: spawnPositions[1].x,
    y: spawnPositions[1].y,
    size: 26,
    speed: 102,
    dirX: 0,
    dirY: 0,
    type: "stalker",
    color: "#cfa36f",
    name: "Terrier",
    img: dog2Img,
    pathTimer: 0
  });

  dogs.push({
    x: spawnPositions[2].x,
    y: spawnPositions[2].y,
    size: 24,
    speed: 88,
    dirX: 0,
    dirY: 0,
    type: "patrol",
    color: "#444",
    name: "Shepherd",
    img: dog3Img,
    pathTimer: 0,
    patrolIndex: 0
  });
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

function getNeighbors(row, col) {
  const candidates = [
    { row, col: col + 1, dx: 1, dy: 0 },
    { row, col: col - 1, dx: -1, dy: 0 },
    { row: row + 1, col, dx: 0, dy: 1 },
    { row: row - 1, col, dx: 0, dy: -1 }
  ];

  return candidates.filter(n => isWalkableTile(n.row, n.col));
}

function findPathNextStep(fromRow, fromCol, toRow, toCol) {
  if (fromRow === toRow && fromCol === toCol) return null;

  const queue = [{ row: fromRow, col: fromCol }];
  const visited = new Set([tileKey(fromRow, fromCol)]);
  const cameFrom = new Map();

  while (queue.length) {
    const current = queue.shift();

    if (current.row === toRow && current.col === toCol) {
      break;
    }

    const neighbors = getNeighbors(current.row, current.col);
    for (const next of neighbors) {
      const key = tileKey(next.row, next.col);
      if (visited.has(key)) continue;

      visited.add(key);
      cameFrom.set(key, current);
      queue.push({ row: next.row, col: next.col });
    }
  }

  const targetKey = tileKey(toRow, toCol);
  if (!cameFrom.has(targetKey)) return null;

  let step = { row: toRow, col: toCol };
  let prev = cameFrom.get(tileKey(step.row, step.col));

  while (prev && !(prev.row === fromRow && prev.col === fromCol)) {
    step = prev;
    prev = cameFrom.get(tileKey(step.row, step.col));
  }

  return {
    row: step.row,
    col: step.col,
    dx: Math.sign(step.col - fromCol),
    dy: Math.sign(step.row - fromRow)
  };
}

function setDogDirectionToTile(dog, targetRow, targetCol) {
  const from = pixelToTile(dog.x, dog.y);
  const nextStep = findPathNextStep(from.row, from.col, targetRow, targetCol);

  if (!nextStep) {
    dog.dirX = 0;
    dog.dirY = 0;
    return;
  }

  dog.dirX = nextStep.dx;
  dog.dirY = nextStep.dy;
}

function updateGuardStartDog(dog) {
  setDogDirectionToTile(dog, startTile.row, startTile.col);
}

function updateStalkerDog(dog) {
  const dogTile = pixelToTile(dog.x, dog.y);
  const catTile = pixelToTile(cat.x, cat.y);
  const d = distance(dog, cat);

  if (d < TILE_SIZE * 1.5) {
    const neighbors = getNeighbors(dogTile.row, dogTile.col);

    let best = null;
    let bestDist = -1;

    for (const n of neighbors) {
      const center = tileCenter(n.row, n.col);
      const distToCat = Math.hypot(center.x - cat.x, center.y - cat.y);

      if (distToCat > bestDist) {
        bestDist = distToCat;
        best = n;
      }
    }

    if (best) {
      dog.dirX = best.dx;
      dog.dirY = best.dy;
    } else {
      dog.dirX = 0;
      dog.dirY = 0;
    }
  } else {
    setDogDirectionToTile(dog, catTile.row, catTile.col);
  }
}

function updatePatrolDog(dog) {
  if (!patrolTargets.length) return;

  const dogTile = pixelToTile(dog.x, dog.y);
  let target = patrolTargets[dog.patrolIndex];

  if (dogTile.row === target.row && dogTile.col === target.col) {
    dog.patrolIndex = (dog.patrolIndex + 1) % patrolTargets.length;
    target = patrolTargets[dog.patrolIndex];
  }

  setDogDirectionToTile(dog, target.row, target.col);
}

function updateDogs(dt) {
  dogs.forEach(dog => {
    dog.pathTimer -= dt;

    if (isDecisionPoint(dog) || dog.dirX === 0 && dog.dirY === 0 || dog.pathTimer <= 0) {
      alignEntityToTileCenter(dog);

      if (dog.type === "guardStart") {
        updateGuardStartDog(dog);
      } else if (dog.type === "stalker") {
        updateStalkerDog(dog);
      } else if (dog.type === "patrol") {
        updatePatrolDog(dog);
      }

      dog.pathTimer = 0.18;
    }

    moveEntity(dog, dt);
  });
}

function drawMaze() {
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#f8f8f8";
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      if (maze[row][col] !== WALL) {
        ctx.fillRect(
          col * TILE_SIZE,
          row * TILE_SIZE,
          TILE_SIZE,
          TILE_SIZE
        );
      }
    }
  }

  ctx.strokeStyle = "#1e5eff";
  ctx.lineWidth = 8;
  ctx.lineCap = "round";

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      if (maze[row][col] === WALL) {
        const x = col * TILE_SIZE + TILE_SIZE / 2;
        const y = row * TILE_SIZE + TILE_SIZE / 2;

        const up = row > 0 && maze[row - 1][col] === WALL;
        const down = row < ROWS - 1 && maze[row + 1][col] === WALL;
        const left = col > 0 && maze[row][col - 1] === WALL;
        const right = col < COLS - 1 && maze[row][col + 1] === WALL;

        ctx.beginPath();

        if (up) {
          ctx.moveTo(x, y);
          ctx.lineTo(x, y - TILE_SIZE / 2);
        }

        if (down) {
          ctx.moveTo(x, y);
          ctx.lineTo(x, y + TILE_SIZE / 2);
        }

        if (left) {
          ctx.moveTo(x, y);
          ctx.lineTo(x, y - 0 + 0);
          ctx.lineTo(x - TILE_SIZE / 2, y);
        }

        if (right) {
          ctx.moveTo(x, y);
          ctx.lineTo(x + TILE_SIZE / 2, y);
        }

        ctx.stroke();
      }
    }
  }

  const startPos = tileCenter(startTile.row, startTile.col);
  const exitPos = tileCenter(exitTile.row, exitTile.col);

  ctx.fillStyle = "#4fc3f7";
  ctx.beginPath();
  ctx.arc(startPos.x, startPos.y, 14, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ff7043";
  ctx.beginPath();
  ctx.arc(exitPos.x, exitPos.y, 14, 0, Math.PI * 2);
  ctx.fill();
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
    const drawSize = 76;
    const cropX = catImg.naturalWidth * 0.08;
    const cropY = catImg.naturalHeight * 0.18;
    const cropW = catImg.naturalWidth * 0.72;
    const cropH = catImg.naturalHeight * 0.62;

    ctx.drawImage(
      catImg,
      cropX,
      cropY,
      cropW,
      cropH,
      cat.x - drawSize / 2,
      cat.y - drawSize / 2,
      drawSize,
      drawSize
    );
  } else {
    ctx.fillStyle = "#111";
    ctx.beginPath();
    ctx.arc(cat.x, cat.y, 16, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(cat.x - 5, cat.y - 3, 2, 0, Math.PI * 2);
    ctx.arc(cat.x + 5, cat.y - 3, 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawDogSprite(dog) {
  const x = dog.x;
  const y = dog.y;
  const drawSize = 44;

  ctx.save();
  ctx.translate(x, y);

  if (dog.dirX !== 0 || dog.dirY !== 0) {
    ctx.rotate(Math.atan2(dog.dirY, dog.dirX));
  }

  if (dog.img && dog.img.complete && dog.img.naturalWidth > 0) {
    ctx.drawImage(
      dog.img,
      -drawSize / 2,
      -drawSize / 2,
      drawSize,
      drawSize
    );
  } else {
    ctx.fillStyle = dog.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, dog.size * 0.55, dog.size * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(dog.size * 0.45, -1, dog.size * 0.24, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(dog.size * 0.34, -dog.size * 0.14);
    ctx.lineTo(dog.size * 0.42, -dog.size * 0.34);
    ctx.lineTo(dog.size * 0.5, -dog.size * 0.14);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(dog.size * 0.34, dog.size * 0.12);
    ctx.lineTo(dog.size * 0.42, dog.size * 0.32);
    ctx.lineTo(dog.size * 0.5, dog.size * 0.12);
    ctx.fill();
  }

  ctx.restore();
}


function drawDogs() {
  dogs.forEach(dog => drawDogSprite(dog));
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

  let touchStartX = 0;
  let touchStartY = 0;

  canvas.addEventListener(
    "touchstart",
    (e) => {
      const touch = e.touches[0];
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
    },
    { passive: true }
  );

  canvas.addEventListener(
    "touchend",
    (e) => {
      const touch = e.changedTouches[0];
      const dx = touch.clientX - touchStartX;
      const dy = touch.clientY - touchStartY;

      const absX = Math.abs(dx);
      const absY = Math.abs(dy);

      if (Math.max(absX, absY) < 20) return;

      if (absX > absY) {
        if (dx > 0) setCatDirection("right");
        else setCatDirection("left");
      } else {
        if (dy > 0) setCatDirection("down");
        else setCatDirection("up");
      }
    },
    { passive: true }
  );
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