(() => {
  "use strict";

  // ---------- 설정 ----------
  const GRID_SIZE = 20;              // 20 x 20 칸
  const BEST_SCORE_KEY = "snakeGameBestScore";
  const POINTS_PER_FOOD = 10;

  const BASE_INTERVAL = 160;         // 시작 속도 (ms per move)
  const MIN_INTERVAL = 65;           // 최고 속도 하한
  const SPEED_UP_SCORE_SPAN = 220;   // 이 점수쯤에서 최고 속도에 근접

  // ---------- 엘리먼트 ----------
  const canvas = document.getElementById("board");
  const ctx = canvas.getContext("2d");
  const scoreValueEl = document.getElementById("scoreValue");
  const bestValueEl = document.getElementById("bestValue");
  const finalScoreEl = document.getElementById("finalScore");
  const finalBestEl = document.getElementById("finalBest");
  const startOverlay = document.getElementById("startOverlay");
  const gameOverOverlay = document.getElementById("gameOverOverlay");
  const startBtn = document.getElementById("startBtn");
  const restartBtn = document.getElementById("restartBtn");
  const touchPad = document.getElementById("touchPad");

  let cellSize = canvas.width / GRID_SIZE;

  // ---------- 상태 ----------
  let snake, direction, nextDirection, food, score, best;
  let loopTimer = null;
  let running = false;

  function loadBest() {
    const saved = localStorage.getItem(BEST_SCORE_KEY);
    return saved ? parseInt(saved, 10) || 0 : 0;
  }

  function saveBest(value) {
    localStorage.setItem(BEST_SCORE_KEY, String(value));
  }

  best = loadBest();
  bestValueEl.textContent = best;

  // ---------- 초기화 ----------
  function resetState() {
    const start = Math.floor(GRID_SIZE / 2);
    snake = [
      { x: start - 1, y: start },
      { x: start - 2, y: start },
      { x: start - 3, y: start },
    ];
    direction = { x: 1, y: 0 };
    nextDirection = { x: 1, y: 0 };
    score = 0;
    scoreValueEl.textContent = score;
    food = spawnFood();
  }

  function spawnFood() {
    const emptyCells = [];
    for (let x = 0; x < GRID_SIZE; x++) {
      for (let y = 0; y < GRID_SIZE; y++) {
        if (!snake.some(seg => seg.x === x && seg.y === y)) {
          emptyCells.push({ x, y });
        }
      }
    }
    return emptyCells[Math.floor(Math.random() * emptyCells.length)];
  }

  // ---------- 속도 계산 (점수가 오를수록 자연스럽게 빨라짐) ----------
  function currentInterval() {
    const t = Math.min(score / SPEED_UP_SCORE_SPAN, 1);
    // easeOutQuad 곡선으로 급격한 변화 없이 서서히 빨라지도록
    const eased = 1 - Math.pow(1 - t, 2);
    return BASE_INTERVAL - (BASE_INTERVAL - MIN_INTERVAL) * eased;
  }

  // ---------- 게임 루프 ----------
  function scheduleNextTick() {
    loopTimer = setTimeout(tick, currentInterval());
  }

  function tick() {
    direction = nextDirection;
    const head = snake[0];
    const newHead = { x: head.x + direction.x, y: head.y + direction.y };

    // 벽 충돌
    if (
      newHead.x < 0 || newHead.x >= GRID_SIZE ||
      newHead.y < 0 || newHead.y >= GRID_SIZE
    ) {
      return endGame();
    }

    // 자기 몸 충돌 (꼬리가 이번 턴에 비는 칸은 제외)
    const willEat = newHead.x === food.x && newHead.y === food.y;
    const bodyToCheck = willEat ? snake : snake.slice(0, -1);
    if (bodyToCheck.some(seg => seg.x === newHead.x && seg.y === newHead.y)) {
      return endGame();
    }

    snake.unshift(newHead);

    if (willEat) {
      score += POINTS_PER_FOOD;
      scoreValueEl.textContent = score;
      food = spawnFood();
    } else {
      snake.pop();
    }

    draw();
    scheduleNextTick();
  }

  // ---------- 그리기 ----------
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 은은한 격자
    ctx.strokeStyle = "#D7EADD";
    ctx.lineWidth = 1;
    for (let i = 1; i < GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cellSize, 0);
      ctx.lineTo(i * cellSize, canvas.height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * cellSize);
      ctx.lineTo(canvas.width, i * cellSize);
      ctx.stroke();
    }

    // 먹이
    const foodPad = cellSize * 0.16;
    ctx.fillStyle = "#FF6B5E";
    roundRect(
      food.x * cellSize + foodPad,
      food.y * cellSize + foodPad,
      cellSize - foodPad * 2,
      cellSize - foodPad * 2,
      6
    );
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.beginPath();
    ctx.arc(
      food.x * cellSize + cellSize * 0.35,
      food.y * cellSize + cellSize * 0.35,
      cellSize * 0.09,
      0, Math.PI * 2
    );
    ctx.fill();

    // 몸통
    for (let i = snake.length - 1; i >= 1; i--) {
      const seg = snake[i];
      const pad = cellSize * 0.12;
      ctx.fillStyle = i % 2 === 0 ? "#4C9A6B" : "#5CAA79";
      roundRect(
        seg.x * cellSize + pad,
        seg.y * cellSize + pad,
        cellSize - pad * 2,
        cellSize - pad * 2,
        7
      );
      ctx.fill();
    }

    // 머리
    const head = snake[0];
    const hPad = cellSize * 0.08;
    ctx.fillStyle = "#2F7A50";
    roundRect(
      head.x * cellSize + hPad,
      head.y * cellSize + hPad,
      cellSize - hPad * 2,
      cellSize - hPad * 2,
      8
    );
    ctx.fill();

    drawEyes(head);
  }

  function drawEyes(head) {
    const cx = head.x * cellSize + cellSize / 2;
    const cy = head.y * cellSize + cellSize / 2;
    const eyeOffset = cellSize * 0.2;
    const eyeR = cellSize * 0.08;

    let e1 = { x: cx, y: cy }, e2 = { x: cx, y: cy };

    if (direction.x === 1) { // right
      e1 = { x: cx + eyeOffset * 0.4, y: cy - eyeOffset };
      e2 = { x: cx + eyeOffset * 0.4, y: cy + eyeOffset };
    } else if (direction.x === -1) { // left
      e1 = { x: cx - eyeOffset * 0.4, y: cy - eyeOffset };
      e2 = { x: cx - eyeOffset * 0.4, y: cy + eyeOffset };
    } else if (direction.y === -1) { // up
      e1 = { x: cx - eyeOffset, y: cy - eyeOffset * 0.4 };
      e2 = { x: cx + eyeOffset, y: cy - eyeOffset * 0.4 };
    } else if (direction.y === 1) { // down
      e1 = { x: cx - eyeOffset, y: cy + eyeOffset * 0.4 };
      e2 = { x: cx + eyeOffset, y: cy + eyeOffset * 0.4 };
    }

    ctx.fillStyle = "#ffffff";
    [e1, e2].forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, eyeR, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.fillStyle = "#1B3A28";
    [e1, e2].forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, eyeR * 0.5, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // ---------- 시작 / 종료 ----------
  function startGame() {
    startOverlay.classList.add("overlay--hidden");
    gameOverOverlay.classList.add("overlay--hidden");
    resetState();
    draw();
    running = true;
    scheduleNextTick();
  }

  function endGame() {
    running = false;
    clearTimeout(loopTimer);

    if (score > best) {
      best = score;
      saveBest(best);
    }
    bestValueEl.textContent = best;
    finalScoreEl.textContent = score;
    finalBestEl.textContent = best;
    gameOverOverlay.classList.remove("overlay--hidden");
  }

  // ---------- 입력 ----------
  function setDirection(dx, dy) {
    if (!running) return;
    // 현재 이동 방향의 반대로는 갈 수 없음 (자기 몸 즉시 충돌 방지)
    if (direction.x === -dx && direction.y === -dy) return;
    nextDirection = { x: dx, y: dy };
  }

  window.addEventListener("keydown", (e) => {
    switch (e.key) {
      case "ArrowUp": e.preventDefault(); setDirection(0, -1); break;
      case "ArrowDown": e.preventDefault(); setDirection(0, 1); break;
      case "ArrowLeft": e.preventDefault(); setDirection(-1, 0); break;
      case "ArrowRight": e.preventDefault(); setDirection(1, 0); break;
    }
  });

  touchPad.addEventListener("click", (e) => {
    const btn = e.target.closest(".touch-btn");
    if (!btn) return;
    const dir = btn.dataset.dir;
    if (dir === "up") setDirection(0, -1);
    else if (dir === "down") setDirection(0, 1);
    else if (dir === "left") setDirection(-1, 0);
    else if (dir === "right") setDirection(1, 0);
  });

  startBtn.addEventListener("click", startGame);
  restartBtn.addEventListener("click", startGame);

  // ---------- 초기 화면 ----------
  resetState();
  draw();
})();
