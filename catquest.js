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

  let startTile = { row: 1, col: 1 };
  let exitTile = { row: 13, col: 13 };

  const cat = {
    x: 0,
    y: 0,
    speed: 140,
    dirX: 0,
    dirY: 0,
    facing: "right"
  };

  const dogs = [];

  const catImg = new Image();
  catImg.src = "cat.jpg";

  const dog1Img = new Image();
  dog1Img.src = "dog1.png";

  const dog2Img = new Image();
  dog2Img.src = "dog2.png";

  const dog3Img = new Image();
  dog3Img.src = "dog3.png";

  function cloneMaze() {
    return mazeTemplate.map(r => r.split(""));
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

  function isWalkable(row, col) {
    return maze[row] && maze[row][col] !== WALL;
  }

  function getNeighbors(row, col) {
    return [
      { row, col: col + 1, dx: 1, dy: 0 },
      { row, col: col - 1, dx: -1, dy: 0 },
      { row: row + 1, col, dx: 0, dy: 1 },
      { row: row - 1, col, dx: 0, dy: -1 }
    ].filter(n => isWalkable(n.row, n.col));
  }

  function resetMaze() {
    maze = cloneMaze();

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (maze[r][c] === START) {
          startTile = { row: r, col: c };
          maze[r][c] = PATH;
        }
        if (maze[r][c] === EXIT) {
          exitTile = { row: r, col: c };
          maze[r][c] = PATH;
        }
      }
    }
  }

  function resetPositions() {
    const start = tileCenter(startTile.row, startTile.col);
    cat.x = start.x;
    cat.y = start.y;
    cat.dirX = 0;
    cat.dirY = 0;

    dogs.length = 0;

    dogs.push(makeDog(exitTile.row, exitTile.col - 1, dog1Img, "guard"));
    dogs.push(makeDog(exitTile.row, exitTile.col - 2, dog2Img, "chase"));
    dogs.push(makeDog(exitTile.row - 1, exitTile.col, dog3Img, "wander"));
  }

  function makeDog(row, col, img, type) {
    const pos = tileCenter(row, col);
    return {
      x: pos.x,
      y: pos.y,
      dirX: -1,
      dirY: 0,
      speed: 80,
      img,
      type,
      facing: "left",
      patrolIndex: 0
    };
  }

  function moveEntity(e, dt) {
    const nx = e.x + e.dirX * e.speed * dt;
    const ny = e.y + e.dirY * e.speed * dt;

    const t = pixelToTile(nx, ny);

    if (isWalkable(t.row, t.col)) {
      e.x = nx;
      e.y = ny;
    } else {
      e.dirX = 0;
      e.dirY = 0;
    }

    if (e.dirX > 0) e.facing = "right";
    if (e.dirX < 0) e.facing = "left";
  }

  function atCenter(e) {
    const t = pixelToTile(e.x, e.y);
    const c = tileCenter(t.row, t.col);
    return Math.abs(e.x - c.x) < 4 && Math.abs(e.y - c.y) < 4;
  }

  function chooseDirection(dog, targetRow, targetCol) {
    const t = pixelToTile(dog.x, dog.y);
    const options = getNeighbors(t.row, t.col);

    if (!options.length) return;

    let best = options[0];
    let bestScore = 9999;

    options.forEach(o => {
      const score = Math.abs(o.row - targetRow) + Math.abs(o.col - targetCol);
      if (score < bestScore) {
        bestScore = score;
        best = o;
      }
    });

    dog.dirX = best.dx;
    dog.dirY = best.dy;
  }

  function updateDogs(dt) {
    dogs.forEach(dog => {
      if (atCenter(dog)) {
        const catTile = pixelToTile(cat.x, cat.y);

        if (dog.type === "guard") {
          chooseDirection(dog, startTile.row, startTile.col);
        }

        if (dog.type === "chase") {
          chooseDirection(dog, catTile.row, catTile.col);
        }

        if (dog.type === "wander") {
          const options = getNeighbors(catTile.row, catTile.col);
          if (options.length) {
            const rand = options[Math.floor(Math.random() * options.length)];
            dog.dirX = rand.dx;
            dog.dirY = rand.dy;
          }
        }
      }

      moveEntity(dog, dt);
    });
  }
    function drawMaze() {
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#eee";
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (maze[r][c] !== WALL) {
          ctx.fillRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
      }
    }
  }

  function drawCat() {
    ctx.save();
    ctx.translate(cat.x, cat.y);

    if (cat.facing === "left") ctx.scale(-1, 1);

    ctx.drawImage(catImg, -30, -30, 60, 60);

    ctx.restore();
  }

  function drawDogs() {
    dogs.forEach(d => {
      ctx.save();
      ctx.translate(d.x, d.y);

      if (d.facing === "left") ctx.scale(-1, 1);

      ctx.drawImage(d.img, -20, -20, 40, 40);

      ctx.restore();
    });
  }

  function draw() {
    drawMaze();
    drawCat();
    drawDogs();
  }

  function gameLoop(t) {
    if (gameOver) return;

    if (!lastTime) lastTime = t;
    const dt = (t - lastTime) / 1000;
    lastTime = t;

    moveEntity(cat, dt);
    updateDogs(dt);
    draw();

    animationFrameId = requestAnimationFrame(gameLoop);
  }

  function startTimer() {
    timerInterval = setInterval(() => {
      timeLeft--;
      timeEl.textContent = timeLeft;
      if (timeLeft <= 0) gameOver = true;
    }, 1000);
  }

  function setCatDirection(dir) {
    if (dir === "up") { cat.dirX = 0; cat.dirY = -1; }
    if (dir === "down") { cat.dirX = 0; cat.dirY = 1; }
    if (dir === "left") { cat.dirX = -1; cat.dirY = 0; }
    if (dir === "right") { cat.dirX = 1; cat.dirY = 0; }
  }

  document.addEventListener("keydown", e => {
    if (e.key === "ArrowUp") setCatDirection("up");
    if (e.key === "ArrowDown") setCatDirection("down");
    if (e.key === "ArrowLeft") setCatDirection("left");
    if (e.key === "ArrowRight") setCatDirection("right");
  });

  function initGame() {
    resetMaze();
    resetPositions();
    draw();
    startTimer();
    animationFrameId = requestAnimationFrame(gameLoop);
  }

  initGame();
});