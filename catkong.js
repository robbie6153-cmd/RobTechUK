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

  canvas.width = 600;
  canvas.height = 600;

  const GRAVITY = 900;
  const CAT_SPEED = 150;
  const CLIMB_SPEED = 130;
  const DOG_SPEED = 90;

  let timeLeft = 60;
  let dreamies = 0;
  let livesLost = 0;
  let gameOver = false;
  let timerInterval = null;
  let animationFrameId = null;
  let lastTime = 0;

  const keys = {
    left: false,
    right: false,
    up: false,
    down: false
  };

  const platforms = [
    { x: 40, y: 540, w: 520, h: 14 },
    { x: 40, y: 430, w: 520, h: 14 },
    { x: 40, y: 320, w: 520, h: 14 },
    { x: 40, y: 210, w: 520, h: 14 },
    { x: 40, y: 100, w: 520, h: 14 }
  ];

  const ladders = [];
  const treats = [];
  const dogs = [];

  const home = {
    x: 50,
    y: 58,
    w: 55,
    h: 40
  };

  const cat = {
    x: 55,
    y: 500,
    w: 34,
    h: 34,
    vx: 0,
    vy: 0,
    onGround: false,
    onLadder: false,
    facing: "right"
  };

  const catImg = new Image();
  catImg.src = "cat.jpg";

  const dogImg = new Image();
  dogImg.src = "dog1.png";

  const treatImg = new Image();
  treatImg.src = "treat.jpg";

  function randomBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function rectsOverlap(a, b) {
    return (
      a.x < b.x + b.w &&
      a.x + a.w > b.x &&
      a.y < b.y + b.h &&
      a.y + a.h > b.y
    );
  }

  function createLadders() {
    ladders.length = 0;

    for (let i = 0; i < platforms.length - 1; i++) {
      const lower = platforms[i];
      const upper = platforms[i + 1];

      const ladderCount = i === 0 ? 2 : 1;

      for (let j = 0; j < ladderCount; j++) {
        const x = [110, 230, 350, 470][Math.floor(Math.random() * 4)];

        ladders.push({
          x,
          y: upper.y,
          w: 34,
          h: lower.y - upper.y
        });
      }
    }
  }

  function createTreats() {
    treats.length = 0;

    platforms.forEach((platform, platformIndex) => {
      const treatsOnLevel = platformIndex === platforms.length - 1 ? 4 : 5;

      for (let i = 0; i < treatsOnLevel; i++) {
        treats.push({
          x: randomBetween(platform.x + 30, platform.x + platform.w - 50),
          y: platform.y - 28,
          w: 22,
          h: 22,
          collected: false
        });
      }
    });
  }

  function createDogs() {
    dogs.length = 0;

    dogs.push(makeDog(500, 66, -1));
    dogs.push(makeDog(420, 66, 1));
    dogs.push(makeDog(330, 66, -1));
  }

  function makeDog(x, y, dir) {
    return {
      x,
      y,
      w: 34,
      h: 34,
      vx: DOG_SPEED * dir,
      vy: 0,
      onLadder: false,
      platformIndex: platforms.length - 1,
      facing: dir > 0 ? "right" : "left",
      ladderCooldown: 0
    };
  }

  function resetCat() {
    cat.x = 55;
    cat.y = 500;
    cat.vx = 0;
    cat.vy = 0;
    cat.onGround = false;
    cat.onLadder = false;
    cat.facing = "right";
  }

  function getCurrentPlatform(entity) {
    for (let i = 0; i < platforms.length; i++) {
      const p = platforms[i];

      const feetY = entity.y + entity.h;

      if (
        entity.x + entity.w > p.x &&
        entity.x < p.x + p.w &&
        feetY >= p.y - 8 &&
        feetY <= p.y + 18
      ) {
        return { platform: p, index: i };
      }
    }

    return null;
  }

 function getTouchingLadder(entity) {
  return ladders.find(ladder => {
    const centreX = entity.x + entity.w / 2;
    const feetY = entity.y + entity.h;

    return (
      centreX >= ladder.x - 10 &&
      centreX <= ladder.x + ladder.w + 10 &&
      feetY >= ladder.y - 6 &&
      entity.y <= ladder.y + ladder.h
    );
  });
}

  function updateCat(dt) {
    cat.vx = 0;

    const ladder = getTouchingLadder(cat);
    cat.onLadder = !!ladder;

    if (keys.left) {
      cat.vx = -CAT_SPEED;
      cat.facing = "left";
    }

    if (keys.right) {
      cat.vx = CAT_SPEED;
      cat.facing = "right";
    }

    if (cat.onLadder && keys.up) {
      cat.vy = -CLIMB_SPEED;
    } else if (cat.onLadder && keys.down) {
      cat.vy = CLIMB_SPEED;
    } else if (cat.onLadder) {
      cat.vy = 0;
    } else {
      cat.vy += GRAVITY * dt;
    }

    cat.x += cat.vx * dt;
    cat.y += cat.vy * dt;

    cat.x = Math.max(20, Math.min(canvas.width - cat.w - 20, cat.x));

    cat.onGround = false;

    platforms.forEach(platform => {
      if (
        cat.x + cat.w > platform.x &&
        cat.x < platform.x + platform.w &&
        cat.y + cat.h >= platform.y &&
        cat.y + cat.h <= platform.y + 20 &&
        cat.vy >= 0
      ) {
        cat.y = platform.y - cat.h;
        cat.vy = 0;
        cat.onGround = true;
      }
    });

    if (cat.y > canvas.height) {
      loseLife();
    }
  }

  function updateDogs(dt) {
    dogs.forEach(dog => {
      dog.ladderCooldown -= dt;

      const ladder = getTouchingLadder(dog);
      const currentPlatform = getCurrentPlatform(dog);

      if (
        ladder &&
        dog.ladderCooldown <= 0 &&
        currentPlatform &&
        currentPlatform.index > 0 &&
        Math.random() < 0.75
      ) {
        dog.onLadder = true;
        dog.x = ladder.x + ladder.w / 2 - dog.w / 2;
        dog.vx = 0;
        dog.vy = DOG_SPEED;
        dog.ladderCooldown = 1.2;
      }

      if (dog.onLadder) {
        dog.y += dog.vy * dt;

        const landed = getCurrentPlatform(dog);

        if (landed && landed.index < currentPlatform?.index) {
          dog.onLadder = false;
          dog.vy = 0;
          dog.y = landed.platform.y - dog.h;
          dog.vx = Math.random() < 0.5 ? DOG_SPEED : -DOG_SPEED;
          dog.facing = dog.vx > 0 ? "right" : "left";
        }
      } else {
        dog.x += dog.vx * dt;

        const platform = getCurrentPlatform(dog);

        if (platform) {
          dog.y = platform.platform.y - dog.h;

          if (dog.x <= platform.platform.x) {
            dog.x = platform.platform.x;
            dog.vx = DOG_SPEED;
          }

          if (dog.x + dog.w >= platform.platform.x + platform.platform.w) {
            dog.x = platform.platform.x + platform.platform.w - dog.w;
            dog.vx = -DOG_SPEED;
          }

          dog.facing = dog.vx > 0 ? "right" : "left";
        }
      }
    });
  }

  function collectTreats() {
    treats.forEach(treat => {
      if (!treat.collected && rectsOverlap(cat, treat)) {
        treat.collected = true;
        dreamies += 1;
        scoreEl.textContent = dreamies;
      }
    });
  }

  function checkDogCollision() {
    dogs.forEach(dog => {
      if (!gameOver && rectsOverlap(cat, dog)) {
        loseLife();
      }
    });
  }

  function checkHomeReached() {
    if (rectsOverlap(cat, home)) {
      endGame(true);
    }
  }

  function loseLife() {
    livesLost += 1;
    livesLostEl.textContent = livesLost;
    messageEl.textContent = "Caught by a dog! Back to the bottom.";
    resetCat();
  }

 function drawBackground() {
  ctx.fillStyle = "#d8d8d8";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

  function drawPlatforms() {
    platforms.forEach(platform => {
      ctx.fillStyle = "#8b5a2b";
      ctx.fillRect(platform.x, platform.y, platform.w, platform.h);

      ctx.fillStyle = "#c27c38";
      ctx.fillRect(platform.x, platform.y, platform.w, 4);
    });
  }

  function drawLadders() {
    ladders.forEach(ladder => {
      ctx.strokeStyle = "#ffd43b";
      ctx.lineWidth = 5;

      ctx.beginPath();
      ctx.moveTo(ladder.x, ladder.y);
      ctx.lineTo(ladder.x, ladder.y + ladder.h);
      ctx.moveTo(ladder.x + ladder.w, ladder.y);
      ctx.lineTo(ladder.x + ladder.w, ladder.y + ladder.h);
      ctx.stroke();

      ctx.lineWidth = 3;

      for (let y = ladder.y + 12; y < ladder.y + ladder.h; y += 18) {
        ctx.beginPath();
        ctx.moveTo(ladder.x, y);
        ctx.lineTo(ladder.x + ladder.w, y);
        ctx.stroke();
      }
    });
  }

  function drawHome() {
    ctx.fillStyle = "#20c997";
    ctx.fillRect(home.x, home.y, home.w, home.h);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 15px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("HOME", home.x + home.w / 2, home.y + home.h / 2);
  }

  function drawTreats() {
    treats.forEach(treat => {
      if (treat.collected) return;

      if (treatImg.complete && treatImg.naturalWidth > 0) {
        ctx.drawImage(treatImg, treat.x, treat.y, treat.w, treat.h);
      } else {
        ctx.fillStyle = "#ffd43b";
        ctx.beginPath();
        ctx.arc(treat.x + treat.w / 2, treat.y + treat.h / 2, 9, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }

  function drawCat() {
    ctx.save();

    if (catImg.complete && catImg.naturalWidth > 0) {
      ctx.translate(cat.x + cat.w / 2, cat.y + cat.h / 2);

      if (cat.facing === "left") {
        ctx.scale(-1, 1);
      }

      ctx.drawImage(catImg, -38, -38, 76, 76);
    } else {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(cat.x, cat.y, cat.w, cat.h);
    }

    ctx.restore();
  }

  function drawDogs() {
    dogs.forEach(dog => {
      ctx.save();

      if (dogImg.complete && dogImg.naturalWidth > 0) {
        ctx.translate(dog.x + dog.w / 2, dog.y + dog.h / 2);

        if (dog.facing === "left") {
          ctx.scale(-1, 1);
        }

        ctx.drawImage(dogImg, -25, -25, 50, 50);
      } else {
        ctx.fillStyle = "#ff4d4d";
        ctx.fillRect(dog.x, dog.y, dog.w, dog.h);
      }

      ctx.restore();
    });
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawBackground();
    drawLadders();
    drawPlatforms();
    drawHome();
    drawTreats();
    drawCat();
    drawDogs();
  }

  function createCompleteOverlay(dreamiesScore, timeBonus, totalScore) {
    const canvasParent = canvas.parentElement;
    canvasParent.style.position = "relative";

    const oldOverlay = document.getElementById("catKongCompleteOverlay");
    if (oldOverlay) oldOverlay.remove();

    const overlay = document.createElement("div");
    overlay.id = "catKongCompleteOverlay";

    overlay.style.position = "absolute";
    overlay.style.left = canvas.offsetLeft + "px";
    overlay.style.top = canvas.offsetTop + "px";
    overlay.style.width = canvas.width + "px";
    overlay.style.height = canvas.height + "px";
    overlay.style.background = "rgba(0, 0, 0, 0.8)";
    overlay.style.color = "#ffffff";
    overlay.style.display = "flex";
    overlay.style.flexDirection = "column";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";
    overlay.style.textAlign = "center";
    overlay.style.zIndex = "999";
    overlay.style.fontFamily = "Arial, sans-serif";
    overlay.style.borderRadius = "12px";

    overlay.innerHTML = `
      <div style="font-size: 46px; font-weight: 900; margin-bottom: 28px;">
        CAT KONG COMPLETE!
      </div>

      <div id="scoreBreakdown" style="
        width: 85%;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 24px;
        font-weight: 800;
        margin-bottom: 28px;
      ">
        <div>
          <div>Dreamies</div>
          <div style="font-size: 38px;">${dreamiesScore}</div>
        </div>

        <div>
          <div>Time</div>
          <div style="font-size: 38px;">${timeBonus}</div>
        </div>
      </div>

      <div id="totalScoreBox" style="
        display: none;
        font-size: 38px;
        font-weight: 900;
        margin-bottom: 24px;
      ">
        Total Score: ${totalScore}
      </div>

      <button id="playAgainButton" style="
        display: none;
        padding: 14px 22px;
        font-size: 18px;
        font-weight: 800;
        border: none;
        border-radius: 10px;
        background: #ffd43b;
        color: #111;
        cursor: pointer;
      ">
        Play Again
      </button>
    `;

    canvasParent.appendChild(overlay);

    const breakdown = document.getElementById("scoreBreakdown");
    const totalBox = document.getElementById("totalScoreBox");
    const playAgainButton = document.getElementById("playAgainButton");

    let flickers = 0;

    const flickerInterval = setInterval(() => {
      breakdown.style.opacity = breakdown.style.opacity === "0.25" ? "1" : "0.25";
      flickers++;

      if (flickers >= 8) {
        clearInterval(flickerInterval);
        breakdown.style.display = "none";
        totalBox.style.display = "block";

        setTimeout(() => {
          playAgainButton.style.display = "inline-block";
        }, 900);
      }
    }, 220);

    playAgainButton.addEventListener("click", () => {
      initGame();
    });
  }

  function endGame(win = false) {
    gameOver = true;
    clearInterval(timerInterval);
    cancelAnimationFrame(animationFrameId);

    if (win) {
      const dreamiesScore = dreamies;
      const timeBonus = timeLeft;
      const totalScore = dreamiesScore + timeBonus;

      scoreEl.textContent = totalScore;

      messageEl.textContent =
        `Complete! Dreamies: ${dreamiesScore}. Time bonus: ${timeBonus}. Total score: ${totalScore}.`;

      createCompleteOverlay(dreamiesScore, timeBonus, totalScore);
    } else {
      messageEl.textContent = `Time up. Final score: ${dreamies}`;
    }
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

  function gameLoop(timestamp) {
    if (gameOver) return;

    if (!lastTime) lastTime = timestamp;

    const dt = Math.min((timestamp - lastTime) / 1000, 0.033);
    lastTime = timestamp;

    updateCat(dt);
    updateDogs(dt);
    collectTreats();
    checkDogCollision();
    checkHomeReached();
    draw();

    animationFrameId = requestAnimationFrame(gameLoop);
  }

  function bindControls() {
    document.addEventListener("keydown", e => {
      if (e.key === "ArrowLeft") keys.left = true;
      if (e.key === "ArrowRight") keys.right = true;
      if (e.key === "ArrowUp") keys.up = true;
      if (e.key === "ArrowDown") keys.down = true;
    });

    document.addEventListener("keyup", e => {
      if (e.key === "ArrowLeft") keys.left = false;
      if (e.key === "ArrowRight") keys.right = false;
      if (e.key === "ArrowUp") keys.up = false;
      if (e.key === "ArrowDown") keys.down = false;
    });

    let touchStartX = 0;
    let touchStartY = 0;

    canvas.addEventListener(
      "touchstart",
      e => {
        const touch = e.touches[0];
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
        e.preventDefault();
      },
      { passive: false }
    );

    canvas.addEventListener(
      "touchmove",
      e => {
        e.preventDefault();
      },
      { passive: false }
    );

    canvas.addEventListener(
      "touchend",
      e => {
        const touch = e.changedTouches[0];
        const dx = touch.clientX - touchStartX;
        const dy = touch.clientY - touchStartY;
        const absX = Math.abs(dx);
        const absY = Math.abs(dy);

        keys.left = false;
        keys.right = false;
        keys.up = false;
        keys.down = false;

        if (Math.max(absX, absY) < 20) {
          e.preventDefault();
          return;
        }

        if (absX > absY) {
          if (dx > 0) keys.right = true;
          else keys.left = true;
        } else {
          if (dy > 0) keys.down = true;
          else keys.up = true;
        }

        setTimeout(() => {
          keys.left = false;
          keys.right = false;
          keys.up = false;
          keys.down = false;
        }, 220);

        e.preventDefault();
      },
      { passive: false }
    );
  }

  function initGame() {
    const oldOverlay = document.getElementById("catKongCompleteOverlay");
    if (oldOverlay) oldOverlay.remove();

    timeLeft = 60;
    dreamies = 0;
    livesLost = 0;
    gameOver = false;
    lastTime = 0;

    keys.left = false;
    keys.right = false;
    keys.up = false;
    keys.down = false;

    timeEl.textContent = timeLeft;
    scoreEl.textContent = dreamies;
    livesLostEl.textContent = livesLost;
    messageEl.textContent = "";

    createLadders();
    createTreats();
    createDogs();
    resetCat();
    draw();
    startTimer();

    cancelAnimationFrame(animationFrameId);
    animationFrameId = requestAnimationFrame(gameLoop);
  }

  bindControls();
  initGame();
});