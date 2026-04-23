window.addEventListener("load", () => {
  const canvas = document.getElementById("gameCanvas");
  const timeEl = document.getElementById("time");
  const scoreEl = document.getElementById("score");
  const livesLostEl = document.getElementById("livesLost");
  const messageEl = document.getElementById("message");

  if (!canvas || !timeEl || !scoreEl || !livesLostEl || !messageEl) {
    console.error("Missing one or more required HTML elements.");
    return;
  }

  const ctx = canvas.getContext("2d");

  const TILE_SIZE = 40;
  const ROWS = 15;
  const COLS = 15;

  canvas.width = COLS * TILE_SIZE;
  canvas.height = ROWS * TILE_SIZE;

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
  let patrolTargets = [];

  let score = 0;
  let livesLost = 0;
  let timeLeft = 60;
  let gameOver = false;
  let timerInterval = null;
  let animationFrameId = null;
  let lastTime = 0;
  let controlsBound = false;

  let startTile = { row: 1, col: 1 };
  let exitTile = { row: 13, col: 13 };

  const cat = {
    x: 0,
    y: 0,
    size: 30,
    speed: 140,
    dirX: 0,
    dirY: 0,
    facingAngle: 0
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
    return (
      row >= 0 &&
      row < ROWS &&
      col >= 0 &&
      col < COLS &&
      maze[row] &&
      maze[row][col] !== WALL
    );
  }

  function findNearestOpenCornerTargets() {
    return [
      { row: 1, col: 1 },
      { row: 1, col: COLS - 2 },
      { row: ROWS - 2, col: COLS - 2 },
      { row: ROWS - 2, col: 1 }
    ].filter(t => isWalkableTile(t.row, t.col));
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

    patrolTargets = findNearestOpenCornerTargets();
  }

  function isDecisionPoint(entity) {
    const tile = pixelToTile(entity.x, entity.y);
    const center = tileCenter(tile.row, tile.col);
    return Math.abs(entity.x - center.x) < 5 && Math.abs(entity.y - center.y) < 5;
  }

  function alignEntityToTileCenter(entity) {
    const tile = pixelToTile(entity.x, entity.y);
    const center = tileCenter(tile.row, tile.col);
    entity.x = center.x;
    entity.y = center.y;
  }

  function updateFacing(entity) {
    if (entity.dirX !== 0 || entity.dirY !== 0) {
      entity.facingAngle = Math.atan2(entity.dirY, entity.dirX);
    }
  }

  function resetCatPosition() {
    const pos = tileCenter(startTile.row, startTile.col);
    cat.x = pos.x;
    cat.y = pos.y;
    cat.dirX = 0;
    cat.dirY = 0;
    cat.facingAngle = 0;
  }

function createDogs() {
  dogs.length = 0;

  const spawnTiles = [
    { row: exitTile.row, col: exitTile.col - 1 },
    { row: exitTile.row - 1, col: exitTile.col },
    { row: exitTile.row - 1, col: exitTile.col - 1 }
  ];

  dogs.push({
    x: tileCenter(spawnTiles[0].row, spawnTiles[0].col).x,
    y: tileCenter(spawnTiles[0].row, spawnTiles[0].col).y,
    size: 28,
    speed: 92,
    dirX: 0,
    dirY: 0,
    type: "guardStart",
    color: "#8d6e63",
    img: dog1Img,
    pathTimer: 0,
    facingAngle: Math.PI
  });

  dogs.push({
    x: tileCenter(spawnTiles[1].row, spawnTiles[1].col).x,
    y: tileCenter(spawnTiles[1].row, spawnTiles[1].col).y,
    size: 26,
    speed: 102,
    dirX: 0,
    dirY: 0,
    type: "stalker",
    color: "#cfa36f",
    img: dog2Img,
    pathTimer: 0,
    facingAngle: Math.PI
  });

  dogs.push({
    x: tileCenter(spawnTiles[2].row, spawnTiles[2].col).x,
    y: tileCenter(spawnTiles[2].row, spawnTiles[2].col).y,
    size: 24,
    speed: 88,
    dirX: 0,
    dirY: 0,
    type: "patrol",
    color: "#444",
    img: dog3Img,
    pathTimer: 0,
    patrolIndex: 0,
    facingAngle: Math.PI
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

      if (!maze[row] || maze[row][col] === WALL) {
        return true;
      }
    }

    return false;
  }

  function updateDogs(dt) {
  dogs.forEach(dog => {
    dog.pathTimer -= dt;

    if (dog.pathTimer <= 0 || (dog.dirX === 0 && dog.dirY === 0) || isDecisionPoint(dog)) {
      alignEntityToTileCenter(dog);

      if (dog.type === "guardStart") {
        updateGuardStartDog(dog);
      } else if (dog.type === "stalker") {
        updateStalkerDog(dog);
      } else if (dog.type === "patrol") {
        updatePatrolDog(dog);
      }

      dog.pathTimer = 0.2;
    }

    moveEntity(dog, dt);
  });
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
    updateFacing(dog);
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
        updateFacing(dog);
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

    if (dog.pathTimer <= 0 || (dog.dirX === 0 && dog.dirY === 0) || isDecisionPoint(dog)) {
      alignEntityToTileCenter(dog);

      if (dog.type === "guardStart") {
        updateGuardStartDog(dog);
      } else if (dog.type === "stalker") {
        updateStalkerDog(dog);
      } else if (dog.type === "patrol") {
        updatePatrolDog(dog);
      }

      dog.pathTimer = 0.2;
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
          ctx.fillRect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
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

      ctx.save();
      ctx.translate(cat.x, cat.y);
      ctx.rotate(cat.facingAngle);

      ctx.drawImage(
        catImg,
        cropX,
        cropY,
        cropW,
        cropH,
        -drawSize / 2,
        -drawSize / 2,
        drawSize,
        drawSize
      );

      ctx.restore();
    } else {
      ctx.save();
      ctx.translate(cat.x, cat.y);
      ctx.rotate(cat.facingAngle);

      ctx.fillStyle = "#111";
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(5, -3, 2, 0, Math.PI * 2);
      ctx.arc(10, -3, 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  function drawDogSprite(dog) {
    const drawSize = 44;

    ctx.save();
    ctx.translate(dog.x, dog.y);
    ctx.rotate(dog.facingAngle);

    if (dog.img && dog.img.complete && dog.img.naturalWidth > 0) {
      ctx.drawImage(dog.img, -drawSize / 2, -drawSize / 2, drawSize, drawSize);
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

    updateFacing(cat);
  }

  function bindControls() {
    if (controlsBound) return;
    controlsBound = true;

    document.addEventListener("keydown", (e) => {
      if (
        e.key === "ArrowUp" ||
        e.key === "ArrowDown" ||
        e.key === "ArrowLeft" ||
        e.key === "ArrowRight"
      ) {
        e.preventDefault();
      }

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
        e.preventDefault();
        const touch = e.touches[0];
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
      },
      { passive: false }
    );

    canvas.addEventListener(
      "touchmove",
      (e) => {
        e.preventDefault();
      },
      { passive: false }
    );

    canvas.addEventListener(
      "touchend",
      (e) => {
        e.preventDefault();

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
      { passive: false }
    );
  }

  function initGame() {
    score = 0;
    livesLost = 0;
    timeLeft = 60;
    gameOver = false;
    lastTime = 0;

    scoreEl.textContent = score;
    livesLostEl.textContent = livesLost;
    timeEl.textContent = timeLeft;
    messageEl.textContent = "";

    resetMazeAndTreats();
    resetRoundPositions();
    bindControls();
    draw();
    startTimer();
    animationFrameId = requestAnimationFrame(gameLoop);
  }

  initGame();
});