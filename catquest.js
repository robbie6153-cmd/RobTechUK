window.addEventListener("load", () => {
  const canvas = document.getElementById("gameCanvas");
  const timeEl = document.getElementById("time");
  const scoreEl = document.getElementById("score");
  const livesLostEl = document.getElementById("livesLost");
  const messageEl = document.getElementById("message");

  if (!canvas || !timeEl || !scoreEl || !livesLostEl || !messageEl) {
    console.error("Missing required HTML elements.");
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
    dirX: 0,
    dirY: 0,
    speed: 130,
    facing: "right"
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

  function isInside(row, col) {
    return row >= 0 && row < ROWS && col >= 0 && col < COLS;
  }

  function isWalkable(row, col) {
    return isInside(row, col) && maze[row][col] !== WALL;
  }

  function getNeighbors(row, col) {
    return [
      { row, col: col + 1, dx: 1, dy: 0 },
      { row, col: col - 1, dx: -1, dy: 0 },
      { row: row + 1, col, dx: 0, dy: 1 },
      { row: row - 1, col, dx: 0, dy: -1 }
    ].filter(n => isWalkable(n.row, n.col));
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

  function updateFacing(entity) {
    if (entity.dirX > 0) entity.facing = "right";
    else if (entity.dirX < 0) entity.facing = "left";
  }

  function snapToTileCenter(entity) {
    const tile = pixelToTile(entity.x, entity.y);
    const center = tileCenter(tile.row, tile.col);
    entity.x = center.x;
    entity.y = center.y;
  }

  function atTileCenter(entity, tolerance = 4) {
    const tile = pixelToTile(entity.x, entity.y);
    const center = tileCenter(tile.row, tile.col);
    return Math.abs(entity.x - center.x) <= tolerance && Math.abs(entity.y - center.y) <= tolerance;
  }

  function resetCatPosition() {
    const pos = tileCenter(startTile.row, startTile.col);
    cat.x = pos.x;
    cat.y = pos.y;
    cat.dirX = 0;
    cat.dirY = 0;
    cat.facing = "right";
  }

  function makeDog(row, col, img, type, speed) {
    const pos = tileCenter(row, col);
    return {
      x: pos.x,
      y: pos.y,
      dirX: -1,
      dirY: 0,
      speed,
      img,
      type,
      facing: "left",
      patrolIndex: 0
    };
  }

  function createDogs() {
    dogs.length = 0;
    dogs.push(makeDog(exitTile.row, exitTile.col - 1, dog1Img, "guard", 78));
    dogs.push(makeDog(exitTile.row, exitTile.col - 2, dog2Img, "chase", 86));
    dogs.push(makeDog(exitTile.row - 1, exitTile.col, dog3Img, "patrol", 74));
  }

  function resetRoundPositions() {
    resetCatPosition();
    createDogs();
  }

  function moveEntity(entity, dt) {
  const newX = entity.x + entity.dirX * entity.speed * dt;
  const newY = entity.y + entity.dirY * entity.speed * dt;

  if (entity.dirX !== 0) {
    const nextTile = pixelToTile(newX, entity.y);
    if (isWalkable(nextTile.row, nextTile.col)) {
      entity.x = newX;
    } else {
      entity.dirX = 0;
      snapToTileCenter(entity);
    }
  }

  if (entity.dirY !== 0) {
    const nextTile = pixelToTile(entity.x, newY);
    if (isWalkable(nextTile.row, nextTile.col)) {
      entity.y = newY;
    } else {
      entity.dirY = 0;
      snapToTileCenter(entity);
    }
  }

  updateFacing(entity);
}
  function chooseDirectionToward(dog, targetRow, targetCol) {
    const tile = pixelToTile(dog.x, dog.y);
    let options = getNeighbors(tile.row, tile.col);

    const reverseX = -dog.dirX;
    const reverseY = -dog.dirY;
    const filtered = options.filter(o => !(o.dx === reverseX && o.dy === reverseY));
    if (filtered.length) options = filtered;

    if (!options.length) return;

    let best = options[0];
    let bestScore = Infinity;

    for (const option of options) {
      const score = Math.abs(option.row - targetRow) + Math.abs(option.col - targetCol);
      if (score < bestScore) {
        bestScore = score;
        best = option;
      }
    }

    dog.dirX = best.dx;
    dog.dirY = best.dy;
    updateFacing(dog);
  }

  function chooseDirectionAway(dog, fromX, fromY) {
    const tile = pixelToTile(dog.x, dog.y);
    let options = getNeighbors(tile.row, tile.col);

    const reverseX = -dog.dirX;
    const reverseY = -dog.dirY;
    const filtered = options.filter(o => !(o.dx === reverseX && o.dy === reverseY));
    if (filtered.length) options = filtered;

    if (!options.length) return;

    let best = options[0];
    let bestScore = -Infinity;

    for (const option of options) {
      const center = tileCenter(option.row, option.col);
      const score = Math.hypot(center.x - fromX, center.y - fromY);
      if (score > bestScore) {
        bestScore = score;
        best = option;
      }
    }

    dog.dirX = best.dx;
    dog.dirY = best.dy;
    updateFacing(dog);
  }

  function updateDogs(dt) {
  dogs.forEach(dog => {
    const dogTile = pixelToTile(dog.x, dog.y);

    if (atTileCenter(dog, 8) || (dog.dirX === 0 && dog.dirY === 0)) {
      snapToTileCenter(dog);

      let options = getNeighbors(dogTile.row, dogTile.col);

      if (options.length === 0) return;

      const reverseX = -dog.dirX;
      const reverseY = -dog.dirY;

      const nonReverse = options.filter(
        o => !(o.dx === reverseX && o.dy === reverseY)
      );

      if (nonReverse.length > 0) {
        options = nonReverse;
      }

      let choice = options[0];

      if (dog.type === "guard") {
        let bestScore = Infinity;
        options.forEach(o => {
          const score =
            Math.abs(o.row - startTile.row) +
            Math.abs(o.col - startTile.col);
          if (score < bestScore) {
            bestScore = score;
            choice = o;
          }
        });
      } else if (dog.type === "chase") {
        const catTile = pixelToTile(cat.x, cat.y);
        const tooClose = Math.hypot(dog.x - cat.x, dog.y - cat.y) < TILE_SIZE * 1.5;

        if (tooClose) {
          let bestScore = -Infinity;
          options.forEach(o => {
            const center = tileCenter(o.row, o.col);
            const score = Math.hypot(center.x - cat.x, center.y - cat.y);
            if (score > bestScore) {
              bestScore = score;
              choice = o;
            }
          });
        } else {
          let bestScore = Infinity;
          options.forEach(o => {
            const score =
              Math.abs(o.row - catTile.row) +
              Math.abs(o.col - catTile.col);
            if (score < bestScore) {
              bestScore = score;
              choice = o;
            }
          });
        }
      } else if (dog.type === "patrol") {
        const corners = [
          { row: 1, col: 1 },
          { row: 1, col: COLS - 2 },
          { row: ROWS - 2, col: COLS - 2 },
          { row: ROWS - 2, col: 1 }
        ].filter(c => isWalkable(c.row, c.col));

        let target = corners[dog.patrolIndex] || corners[0];

        if (dogTile.row === target.row && dogTile.col === target.col) {
          dog.patrolIndex = (dog.patrolIndex + 1) % corners.length;
          target = corners[dog.patrolIndex];
        }

        let bestScore = Infinity;
        options.forEach(o => {
          const score =
            Math.abs(o.row - target.row) +
            Math.abs(o.col - target.col);
          if (score < bestScore) {
            bestScore = score;
            choice = o;
          }
        });
      }

      dog.dirX = choice.dx;
      dog.dirY = choice.dy;
      updateFacing(dog);
    }

    moveEntity(dog, dt);
  });
}

  function collectTreats() {
    const tile = pixelToTile(cat.x, cat.y);
    const key = tileKey(tile.row, tile.col);

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
      if (distance(cat, dog) < 22) {
        livesLost += 1;
        livesLostEl.textContent = livesLost;
        messageEl.textContent = "Caught by a dog! Restarting from the entrance...";
        resetRoundPositions();
        return;
      }
    }
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

      if (cat.facing === "left") {
        ctx.scale(-1, 1);
      }

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
      ctx.fillStyle = "#111";
      ctx.beginPath();
      ctx.arc(cat.x, cat.y, 16, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawDogSprite(dog) {
    const drawSize = 34;

    ctx.save();
    ctx.translate(dog.x, dog.y);

    if (dog.facing === "left") {
      ctx.scale(-1, 1);
    }

    if (dog.img.complete && dog.img.naturalWidth > 0) {
      ctx.drawImage(dog.img, -drawSize / 2, -drawSize / 2, drawSize, drawSize);
    } else {
      ctx.fillStyle = "#555";
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  function drawDogs() {
    dogs.forEach(drawDogSprite);
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
      if (timeLeft < 0) timeLeft = 0;
      timeEl.textContent = timeLeft;

      if (timeLeft <= 0) {
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
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setCatDirection("up");
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setCatDirection("down");
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setCatDirection("left");
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setCatDirection("right");
      }
    });

    let touchStartX = 0;
    let touchStartY = 0;

    canvas.addEventListener("touchstart", (e) => {
      const touch = e.touches[0];
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
      e.preventDefault();
    }, { passive: false });

    canvas.addEventListener("touchmove", (e) => {
      e.preventDefault();
    }, { passive: false });

    canvas.addEventListener("touchend", (e) => {
      const touch = e.changedTouches[0];
      const dx = touch.clientX - touchStartX;
      const dy = touch.clientY - touchStartY;
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);

      if (Math.max(absX, absY) < 20) {
        e.preventDefault();
        return;
      }

      if (absX > absY) {
        if (dx > 0) setCatDirection("right");
        else setCatDirection("left");
      } else {
        if (dy > 0) setCatDirection("down");
        else setCatDirection("up");
      }

      e.preventDefault();
    }, { passive: false });
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