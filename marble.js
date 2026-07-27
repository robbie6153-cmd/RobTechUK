"use strict";


/* =========================
   PAGE ELEMENTS
========================= */

const homeScreen =
  document.getElementById(
    "homeScreen"
  );

const gameScreen =
  document.getElementById(
    "gameScreen"
  );

const playButton =
  document.getElementById(
    "playButton"
  );

const homeButton =
  document.getElementById(
    "homeButton"
  );

const continueButton =
  document.getElementById(
    "continueButton"
  );

const maze =
  document.getElementById(
    "maze"
  );

const marble =
  document.getElementById(
    "marble"
  );

const exit =
  document.getElementById(
    "exit"
  );

const levelNumber =
  document.getElementById(
    "levelNumber"
  );

const timerDisplay =
  document.getElementById(
    "timer"
  );

const messagePanel =
  document.getElementById(
    "messagePanel"
  );

const messageTitle =
  document.getElementById(
    "messageTitle"
  );

const messageText =
  document.getElementById(
    "messageText"
  );


/* =========================
   GAME SETTINGS
========================= */

const LEVEL_TIME = 60;

let marbleRadius = 12;

const MAX_SPEED = 6.5;

const TILT_STRENGTH = 0.018;

const FRICTION = 0.985;


/* =========================
   GAME STATE
========================= */

let currentLevelIndex = 0;

let timeRemaining = LEVEL_TIME;

let timerInterval = null;

let animationFrameId = null;

let gameRunning = false;

let mazeWidth = 0;

let mazeHeight = 0;

let marbleX = 0;

let marbleY = 0;
let exitX = 0;

let exitY = 0;
let velocityX = 0;

let velocityY = 0;

let tiltX = 0;

let tiltY = 0;

let walls = [];

let keysPressed = {};


/* =========================
   SCREEN CONTROLS
========================= */

function showHomeScreen() {
  stopGame();

  homeScreen.classList.remove(
    "hidden"
  );

  gameScreen.classList.add(
    "hidden"
  );

  messagePanel.classList.add(
    "hidden"
  );
}


function showGameScreen() {
  homeScreen.classList.add(
    "hidden"
  );

  gameScreen.classList.remove(
    "hidden"
  );
}


/* =========================
   SENSOR PERMISSION
========================= */

async function requestMotionPermission() {
  /*
    Some Apple devices require motion
    permission after the user presses
    a button.

    Android devices normally do not.
  */

  if (
    typeof DeviceOrientationEvent !==
      "undefined" &&
    typeof DeviceOrientationEvent
      .requestPermission ===
      "function"
  ) {
    try {
      const permission =
        await DeviceOrientationEvent
          .requestPermission();

      return permission === "granted";
    } catch (error) {
      console.error(
        "Motion permission error:",
        error
      );

      return false;
    }
  }

  return true;
}


/* =========================
   START GAME
========================= */

async function startNewGame() {
  await requestMotionPermission();

  currentLevelIndex = 0;

  showGameScreen();

  /*
    Wait until the browser has displayed
    the game screen before measuring it.
  */

  requestAnimationFrame(() => {
    loadLevel(
      currentLevelIndex
    );
  });
}


/* =========================
   LOAD LEVEL
========================= */

function loadLevel(levelIndex) {
  if (
    !Array.isArray(window.LEVELS) ||
    window.LEVELS.length === 0
  ) {
    showError(
      "No levels found",
      "Create levels.js and add the level data."
    );

    return;
  }

  const level =
    window.LEVELS[levelIndex];

  if (!level) {
    finishGame();

    return;
  }

  stopGame();

  clearMazeWalls();

  messagePanel.classList.add(
    "hidden"
  );

  levelNumber.textContent =
    levelIndex + 1;

  timeRemaining =
    level.time || LEVEL_TIME;

  timerDisplay.textContent =
    timeRemaining;

  mazeWidth =
  maze.clientWidth;

mazeHeight =
  maze.clientHeight;

buildGridLevel(
  level.grid
);

  velocityX = 0;
  velocityY = 0;

  gameRunning = true;

  startTimer();

  animationFrameId =
    requestAnimationFrame(
      updateGame
    );
}

/* =========================
   BUILD GRID LEVEL
========================= */

function clearMazeWalls() {
  maze
    .querySelectorAll(
      ".maze-wall"
    )
    .forEach(wall => {
      wall.remove();
    });

  walls = [];
}


function buildGridLevel(grid) {
  if (
    !Array.isArray(grid) ||
    grid.length === 0
  ) {
    showError(
      "Invalid level",
      "This level does not contain a valid maze grid."
    );

    return;
  }

  clearMazeWalls();

  const rowCount =
    grid.length;

  const columnCount =
    Math.max(
      ...grid.map(
        row => row.length
      )
    );

  const cellWidth =
    mazeWidth /
    columnCount;

  const cellHeight =
    mazeHeight /
    rowCount;

  /*
    Resize the marble according to the
    size of one grid square.

    This keeps it usable on both desktop
    and mobile screens.
  */

  marbleRadius =
    Math.min(
      cellWidth,
      cellHeight
    ) * 0.3;

  const marbleDiameter =
    marbleRadius * 2;

  marble.style.width =
    `${marbleDiameter}px`;

  marble.style.height =
    `${marbleDiameter}px`;

  /*
    Resize the exit so it fits within
    one open grid square.
  */

  const exitSize =
    Math.min(
      cellWidth,
      cellHeight
    ) * 0.82;

  exit.style.width =
    `${exitSize}px`;

  exit.style.height =
    `${exitSize}px`;

  let startFound = false;
  let exitFound = false;

  for (
    let rowIndex = 0;
    rowIndex < rowCount;
    rowIndex += 1
  ) {
    const row =
      grid[rowIndex];

    for (
      let columnIndex = 0;
      columnIndex < columnCount;
      columnIndex += 1
    ) {
      const symbol =
        row[columnIndex] || "#";

      const x =
        columnIndex *
        cellWidth;

      const y =
        rowIndex *
        cellHeight;

      if (symbol === "#") {
        createGridWall(
          x,
          y,
          cellWidth,
          cellHeight
        );
      }

      if (symbol === "S") {
        marbleX =
          x +
          cellWidth / 2;

        marbleY =
          y +
          cellHeight / 2;

        startFound = true;
      }

      if (symbol === "E") {
        positionGridExit(
          x +
            cellWidth / 2,
          y +
            cellHeight / 2
        );

        exitFound = true;
      }
    }
  }

  if (!startFound) {
    marbleX =
      mazeWidth / 2;

    marbleY =
      mazeHeight / 2;
  }

  if (!exitFound) {
    positionGridExit(
      mazeWidth -
        cellWidth / 2,
      mazeHeight -
        cellHeight / 2
    );
  }

  renderMarble();
}


function createGridWall(
  x,
  y,
  width,
  height
) {
  const wallElement =
    document.createElement(
      "div"
    );

  wallElement.className =
    "maze-wall";

  /*
    Slight overlap prevents tiny visible
    gaps between neighbouring wall cells.
  */

  const overlap = 0.5;

  wallElement.style.left =
    `${x - overlap}px`;

  wallElement.style.top =
    `${y - overlap}px`;

  wallElement.style.width =
    `${width + overlap * 2}px`;

  wallElement.style.height =
    `${height + overlap * 2}px`;

  maze.appendChild(
    wallElement
  );

  walls.push({
    element: wallElement,
    x: x - overlap,
    y: y - overlap,
    width:
      width +
      overlap * 2,
    height:
      height +
      overlap * 2
  });
}


function positionGridExit(
  x,
  y
) {
  exitX = x;
  exitY = y;

  exit.style.left =
    `${exitX}px`;

  exit.style.top =
    `${exitY}px`;

  exit.style.right =
    "auto";

  exit.style.bottom =
    "auto";

  exit.style.transform =
    "translate(-50%, -50%)";
}

/* =========================
   PHONE TILT
========================= */

function handleDeviceOrientation(
  event
) {
  /*
    beta:
    phone tilting towards and away
    from the player.

    gamma:
    phone tilting left and right.
  */

  const gamma =
    Number(event.gamma) || 0;

  const beta =
    Number(event.beta) || 0;

  /*
    Limit extreme readings so the
    marble remains controllable.
  */

  tiltX =
    clamp(
      gamma,
      -35,
      35
    );

  tiltY =
    clamp(
      beta,
      -35,
      35
    );
}


window.addEventListener(
  "deviceorientation",
  handleDeviceOrientation
);


/* =========================
   KEYBOARD TESTING
========================= */

window.addEventListener(
  "keydown",
  event => {
    keysPressed[
      event.key.toLowerCase()
    ] = true;

    if (
      [
        "arrowup",
        "arrowdown",
        "arrowleft",
        "arrowright"
      ].includes(
        event.key.toLowerCase()
      )
    ) {
      event.preventDefault();
    }
  }
);


window.addEventListener(
  "keyup",
  event => {
    keysPressed[
      event.key.toLowerCase()
    ] = false;
  }
);


function applyKeyboardControls() {
  const keyboardForce = 0.22;

  if (
    keysPressed.arrowleft ||
    keysPressed.a
  ) {
    velocityX -=
      keyboardForce;
  }

  if (
    keysPressed.arrowright ||
    keysPressed.d
  ) {
    velocityX +=
      keyboardForce;
  }

  if (
    keysPressed.arrowup ||
    keysPressed.w
  ) {
    velocityY -=
      keyboardForce;
  }

  if (
    keysPressed.arrowdown ||
    keysPressed.s
  ) {
    velocityY +=
      keyboardForce;
  }
}


/* =========================
   GAME LOOP
========================= */

function updateGame() {
  if (!gameRunning) {
    return;
  }

  applyKeyboardControls();

  /*
    Convert the phone's angle into
    acceleration.
  */

  velocityX +=
    tiltX *
    TILT_STRENGTH;

  velocityY +=
    tiltY *
    TILT_STRENGTH;

  velocityX *=
    FRICTION;

  velocityY *=
    FRICTION;

  velocityX =
    clamp(
      velocityX,
      -MAX_SPEED,
      MAX_SPEED
    );

  velocityY =
    clamp(
      velocityY,
      -MAX_SPEED,
      MAX_SPEED
    );

  moveMarbleOnXAxis();

  moveMarbleOnYAxis();

  keepMarbleInsideMaze();

  renderMarble();

  checkExit();

  animationFrameId =
    requestAnimationFrame(
      updateGame
    );
}


/* =========================
   MARBLE MOVEMENT
========================= */

function moveMarbleOnXAxis() {
  marbleX +=
    velocityX;

  walls.forEach(wall => {
    if (
      circleIntersectsRectangle(
        marbleX,
        marbleY,
        marbleRadius,
        wall
      )
    ) {
      if (velocityX > 0) {
        marbleX =
          wall.x -
          marbleRadius;
      } else if (
        velocityX < 0
      ) {
        marbleX =
          wall.x +
          wall.width +
          marbleRadius;
      }

      velocityX *= -0.25;
    }
  });
}


function moveMarbleOnYAxis() {
  marbleY +=
    velocityY;

  walls.forEach(wall => {
    if (
      circleIntersectsRectangle(
        marbleX,
        marbleY,
        marbleRadius,
        wall
      )
    ) {
      if (velocityY > 0) {
        marbleY =
          wall.y -
          marbleRadius;
      } else if (
        velocityY < 0
      ) {
        marbleY =
          wall.y +
          wall.height +
          marbleRadius;
      }

      velocityY *= -0.25;
    }
  });
}


function keepMarbleInsideMaze() {
  if (
    marbleX <
    marbleRadius
  ) {
    marbleX =
      marbleRadius;

    velocityX *= -0.3;
  }

  if (
    marbleX >
    mazeWidth -
      marbleRadius
  ) {
    marbleX =
      mazeWidth -
      marbleRadius;

    velocityX *= -0.3;
  }

  if (
    marbleY <
    marbleRadius
  ) {
    marbleY =
      marbleRadius;

    velocityY *= -0.3;
  }

  if (
    marbleY >
    mazeHeight -
      marbleRadius
  ) {
    marbleY =
      mazeHeight -
     marbleRadius;

    velocityY *= -0.3;
  }
}


function renderMarble() {
  marble.style.left =
    `${marbleX}px`;

  marble.style.top =
    `${marbleY}px`;
}


/* =========================
   COLLISION DETECTION
========================= */

function circleIntersectsRectangle(
  circleX,
  circleY,
  radius,
  rectangle
) {
  const closestX =
    clamp(
      circleX,
      rectangle.x,
      rectangle.x +
        rectangle.width
    );

  const closestY =
    clamp(
      circleY,
      rectangle.y,
      rectangle.y +
        rectangle.height
    );

  const distanceX =
    circleX -
    closestX;

  const distanceY =
    circleY -
    closestY;

  const distanceSquared =
    distanceX *
      distanceX +
    distanceY *
      distanceY;

  return (
    distanceSquared <
    radius *
      radius
  );
}


/* =========================
   EXIT DETECTION
========================= */

function checkExit() {
  const distance =
    Math.hypot(
      marbleX - exitX,
      marbleY - exitY
    );

  const exitRadius =
    exit.offsetWidth / 2;

  /*
    Trigger when most of the marble
    reaches the green exit.
  */

  const completionDistance =
    Math.max(
      exitRadius * 0.7,
      marbleRadius
    );

  if (
    distance <=
    completionDistance
  ) {
    completeLevel();
  }
}


/* =========================
   TIMER
========================= */

function startTimer() {
  clearInterval(
    timerInterval
  );

  timerInterval =
    setInterval(() => {
      if (!gameRunning) {
        return;
      }

      timeRemaining -= 1;

      timerDisplay.textContent =
        timeRemaining;

      if (
        timeRemaining <= 10
      ) {
        timerDisplay.style.color =
          "#ff7a7a";
      } else {
        timerDisplay.style.color =
          "";
      }

      if (
        timeRemaining <= 0
      ) {
        failLevel();
      }
    }, 1000);
}


/* =========================
   LEVEL RESULTS
========================= */

function completeLevel() {
  if (!gameRunning) {
    return;
  }

  stopGame();

  messagePanel.classList.remove(
    "hidden"
  );

  messageTitle.textContent =
    "Level Complete";

  messageText.textContent =
    `You escaped with ${timeRemaining} seconds remaining.`;

  const isLastLevel =
    currentLevelIndex ===
    window.LEVELS.length - 1;

  continueButton.textContent =
    isLastLevel
      ? "Finish Game"
      : "Next Level";
}


function failLevel() {
  if (!gameRunning) {
    return;
  }

  stopGame();

  messagePanel.classList.remove(
    "hidden"
  );

  messageTitle.textContent =
    "Time Up";

  messageText.textContent =
    "The marble did not reach the exit in time.";

  continueButton.textContent =
    "Try Again";
}


function finishGame() {
  stopGame();

  messagePanel.classList.remove(
    "hidden"
  );

  messageTitle.textContent =
    "Game Complete";

  messageText.textContent =
    "You completed all five levels.";

  continueButton.textContent =
    "Play Again";
}


function showError(
  title,
  text
) {
  stopGame();

  messagePanel.classList.remove(
    "hidden"
  );

  messageTitle.textContent =
    title;

  messageText.textContent =
    text;

  continueButton.textContent =
    "Return Home";
}


/* =========================
   CONTINUE BUTTON
========================= */

function handleContinue() {
  const title =
    messageTitle.textContent;

  if (
    title ===
    "Level Complete"
  ) {
    currentLevelIndex += 1;

    if (
      currentLevelIndex >=
      window.LEVELS.length
    ) {
      finishGame();
    } else {
      loadLevel(
        currentLevelIndex
      );
    }

    return;
  }

  if (
    title ===
    "Time Up"
  ) {
    loadLevel(
      currentLevelIndex
    );

    return;
  }

  if (
    title ===
    "Game Complete"
  ) {
    currentLevelIndex = 0;

    loadLevel(
      currentLevelIndex
    );

    return;
  }

  showHomeScreen();
}


/* =========================
   STOP GAME
========================= */

function stopGame() {
  gameRunning = false;

  clearInterval(
    timerInterval
  );

  timerInterval = null;

  if (
    animationFrameId
  ) {
    cancelAnimationFrame(
      animationFrameId
    );

    animationFrameId = null;
  }

  velocityX = 0;
  velocityY = 0;
}


/* =========================
   RESIZING
========================= */

window.addEventListener(
  "resize",
  () => {
    if (
      !gameScreen.classList.contains(
        "hidden"
      )
    ) {
      loadLevel(
        currentLevelIndex
      );
    }
  }
);


/* =========================
   HELPER
========================= */

function clamp(
  value,
  minimum,
  maximum
) {
  return Math.min(
    Math.max(
      value,
      minimum
    ),
    maximum
  );
}


/* =========================
   BUTTON EVENTS
========================= */

playButton.addEventListener(
  "click",
  startNewGame
);

homeButton.addEventListener(
  "click",
  showHomeScreen
);

continueButton.addEventListener(
  "click",
  handleContinue
);