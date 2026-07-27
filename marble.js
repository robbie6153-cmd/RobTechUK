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

/*
  Lower speed and tilt strength make
  the marble easier to control.
*/

const MAX_SPEED = 3.2;

const TILT_STRENGTH = 0.006;

const FRICTION = 0.96;

const KEYBOARD_FORCE = 0.16;


/* =========================
   GAME STATE
========================= */

let currentLevelIndex = 0;

let timeRemaining =
  LEVEL_TIME;

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

let neutralGamma = null;

let neutralBeta = null;

let walls = [];

const keysPressed = {};


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
  if (
    typeof DeviceOrientationEvent ===
    "undefined"
  ) {
    return false;
  }

  /*
    iPhone and iPad require permission
    after the user presses a button.
  */

  if (
    typeof DeviceOrientationEvent
      .requestPermission ===
    "function"
  ) {
    try {
      const permission =
        await DeviceOrientationEvent
          .requestPermission();

      return permission ===
        "granted";
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
  const motionAllowed =
    await requestMotionPermission();

  /*
    Keyboard play still works on a
    computer even without motion data.
  */

  if (
    !motionAllowed &&
    isProbablyMobile()
  ) {
    alert(
      "Motion access was not available. Make sure this game is opened through an HTTPS address and allow Motion & Orientation access."
    );
  }

  currentLevelIndex = 0;

  resetTiltCalibration();

  showGameScreen();

  /*
    Wait until the game screen is visible
    before measuring the maze.
  */

  requestAnimationFrame(() => {
    loadLevel(
      currentLevelIndex
    );
  });
}


function resetTiltCalibration() {
  neutralGamma = null;
  neutralBeta = null;

  tiltX = 0;
  tiltY = 0;

  velocityX = 0;
  velocityY = 0;
}


/* =========================
   LOAD LEVEL
========================= */

function loadLevel(levelIndex) {
  if (
    !Array.isArray(
      window.LEVELS
    ) ||
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
    level.time ||
    LEVEL_TIME;

  timerDisplay.textContent =
    timeRemaining;

  timerDisplay.style.color =
    "";

  mazeWidth =
    maze.clientWidth;

  mazeHeight =
    maze.clientHeight;

  if (
    mazeWidth <= 0 ||
    mazeHeight <= 0
  ) {
    requestAnimationFrame(() => {
      loadLevel(
        levelIndex
      );
    });

    return;
  }

  buildGridLevel(
    level.grid
  );

  resetTiltCalibration();

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

  const cellSize =
    Math.min(
      cellWidth,
      cellHeight
    );

  /*
    The marble remains smaller than one
    open grid square.
  */

  marbleRadius =
    cellSize * 0.27;

  const marbleDiameter =
    marbleRadius * 2;

  marble.style.width =
    `${marbleDiameter}px`;

  marble.style.height =
    `${marbleDiameter}px`;

  const exitSize =
    cellSize * 0.82;

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
        row[columnIndex] ||
        "#";

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
    A tiny overlap prevents visible gaps
    between touching grid cells.
  */

  const overlap = 0.6;

  const wallX =
    x - overlap;

  const wallY =
    y - overlap;

  const wallWidth =
    width +
    overlap * 2;

  const wallHeight =
    height +
    overlap * 2;

  wallElement.style.left =
    `${wallX}px`;

  wallElement.style.top =
    `${wallY}px`;

  wallElement.style.width =
    `${wallWidth}px`;

  wallElement.style.height =
    `${wallHeight}px`;

  maze.appendChild(
    wallElement
  );

  walls.push({
    element: wallElement,
    x: wallX,
    y: wallY,
    width: wallWidth,
    height: wallHeight
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
  if (!gameRunning) {
    return;
  }

  const gamma =
    Number(event.gamma);

  const beta =
    Number(event.beta);

  if (
    !Number.isFinite(gamma) ||
    !Number.isFinite(beta)
  ) {
    return;
  }

  /*
    The position in which the player
    begins each level becomes neutral.
  */

  if (
    neutralGamma === null ||
    neutralBeta === null
  ) {
    neutralGamma =
      gamma;

    neutralBeta =
      beta;

    tiltX = 0;
    tiltY = 0;

    return;
  }

  const gammaDifference =
    gamma -
    neutralGamma;

  const betaDifference =
    beta -
    neutralBeta;

  tiltX =
    clamp(
      gammaDifference,
      -20,
      20
    );

  tiltY =
    clamp(
      betaDifference,
      -20,
      20
    );
}


window.addEventListener(
  "deviceorientation",
  handleDeviceOrientation,
  true
);


/* =========================
   KEYBOARD TESTING
========================= */

window.addEventListener(
  "keydown",
  event => {
    const key =
      event.key.toLowerCase();

    keysPressed[key] =
      true;

    if (
      [
        "arrowup",
        "arrowdown",
        "arrowleft",
        "arrowright"
      ].includes(key)
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
  if (
    keysPressed.arrowleft ||
    keysPressed.a
  ) {
    velocityX -=
      KEYBOARD_FORCE;
  }

  if (
    keysPressed.arrowright ||
    keysPressed.d
  ) {
    velocityX +=
      KEYBOARD_FORCE;
  }

  if (
    keysPressed.arrowup ||
    keysPressed.w
  ) {
    velocityY -=
      KEYBOARD_FORCE;
  }

  if (
    keysPressed.arrowdown ||
    keysPressed.s
  ) {
    velocityY +=
      KEYBOARD_FORCE;
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

  /*
    Break each frame into small movement
    steps so the marble cannot jump
    through thin walls.
  */

  const largestMovement =
    Math.max(
      Math.abs(
        velocityX
      ),
      Math.abs(
        velocityY
      )
    );

  const movementSteps =
    Math.max(
      1,
      Math.ceil(
        largestMovement /
        0.75
      )
    );

  const stepX =
    velocityX /
    movementSteps;

  const stepY =
    velocityY /
    movementSteps;

  for (
    let step = 0;
    step < movementSteps;
    step += 1
  ) {
    moveMarbleOnXAxis(
      stepX
    );

    moveMarbleOnYAxis(
      stepY
    );

    keepMarbleInsideMaze();
  }

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

function moveMarbleOnXAxis(
  movement
) {
  if (movement === 0) {
    return;
  }

  const previousX =
    marbleX;

  marbleX +=
    movement;

  for (const wall of walls) {
    if (
      circleIntersectsRectangle(
        marbleX,
        marbleY,
        marbleRadius,
        wall
      )
    ) {
      /*
        Return to the last safe position
        instead of forcing the ball across
        or through adjoining walls.
      */

      marbleX =
        previousX;

      velocityX = 0;

      return;
    }
  }
}


function moveMarbleOnYAxis(
  movement
) {
  if (movement === 0) {
    return;
  }

  const previousY =
    marbleY;

  marbleY +=
    movement;

  for (const wall of walls) {
    if (
      circleIntersectsRectangle(
        marbleX,
        marbleY,
        marbleRadius,
        wall
      )
    ) {
      marbleY =
        previousY;

      velocityY = 0;

      return;
    }
  }
}


function keepMarbleInsideMaze() {
  if (
    marbleX <
    marbleRadius
  ) {
    marbleX =
      marbleRadius;

    velocityX = 0;
  }

  if (
    marbleX >
    mazeWidth -
      marbleRadius
  ) {
    marbleX =
      mazeWidth -
      marbleRadius;

    velocityX = 0;
  }

  if (
    marbleY <
    marbleRadius
  ) {
    marbleY =
      marbleRadius;

    velocityY = 0;
  }

  if (
    marbleY >
    mazeHeight -
      marbleRadius
  ) {
    marbleY =
      mazeHeight -
      marbleRadius;

    velocityY = 0;
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
      marbleX -
        exitX,
      marbleY -
        exitY
    );

  const exitRadius =
    exit.offsetWidth / 2;

  const completionDistance =
    Math.max(
      exitRadius * 0.72,
      marbleRadius * 0.8
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
    animationFrameId !== null
  ) {
    cancelAnimationFrame(
      animationFrameId
    );

    animationFrameId = null;
  }

  velocityX = 0;
  velocityY = 0;

  tiltX = 0;
  tiltY = 0;
}


/* =========================
   HELPERS
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


function isProbablyMobile() {
  return /iPhone|iPad|iPod|Android/i
    .test(
      navigator.userAgent
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