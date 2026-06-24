'use strict';

const COLS = 10, ROWS = 20, CELL = 16;
const COLORS = { I: '#00f0f0', O: '#f0f000', T: '#a000f0', S: '#00f000', Z: '#f00000', J: '#0000f0', L: '#f0a000' };
const PIECES = {
  I: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], O: [[1,1],[1,1]],
  T: [[0,1,0],[1,1,1],[0,0,0]], S: [[0,1,1],[1,1,0],[0,0,0]],
  Z: [[1,1,0],[0,1,1],[0,0,0]], J: [[1,0,0],[1,1,1],[0,0,0]],
  L: [[0,0,1],[1,1,1],[0,0,0]]
};

const boardCtx = document.getElementById('boardCanvas').getContext('2d');
const holdCtx  = document.getElementById('holdCanvas').getContext('2d');
const nextCtx  = document.getElementById('nextCanvas').getContext('2d');

let board, current, currentPos, heldPiece, heldUsed, nextQueue;
let score = 0, linesCleared = 0, level = 1, startLevel = 1;
let maxUnlockedLevel = parseInt(localStorage.getItem('beztris_max_level')) || 1;
let gameOver = false, paused = false, dropTimer = null;
let dropLocked = false, isAnimatingDrop = false;
let lockTimer = null, lockGlow = false, lockGlowTimer = null;
let bag = [];

function refillBag() {
  bag = Object.keys(PIECES);
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
}
function nextFromBag() {
  if (bag.length === 0) refillBag();
  return bag.pop();
}

function getSpawnY(matrix) {
  for (let r = 0; r < matrix.length; r++) {
    if (matrix[r].some(c => c)) return -r;
  }
  return 0;
}

function initGame(lvl) {
  level = lvl || startLevel || 1; startLevel = level;
  score = 0; linesCleared = 0; gameOver = false; paused = false;
  heldPiece = null; heldUsed = false; dropLocked = false; isAnimatingDrop = false; lockGlow = false;
  if(lockTimer) clearTimeout(lockTimer);
  if(lockGlowTimer) clearTimeout(lockGlowTimer);
  bag = []; board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  nextQueue = [nextFromBag(), nextFromBag(), nextFromBag()];
  spawnPiece(); updateHUD(); startLoop();
}

function spawnPiece() {
  const type = nextQueue.shift(); nextQueue.push(nextFromBag());
  current = { type, matrix: rotateCopy(PIECES[type], 0) };
  currentPos = { x: Math.floor((COLS - current.matrix[0].length) / 2), y: getSpawnY(current.matrix) };
  heldUsed = false; dropLocked = false; isAnimatingDrop = false;
  if (collides(current.matrix, currentPos)) endGame();
}

function rotateCopy(mat, times) {
  let m = mat.map(r => [...r]);
  for (let i = 0; i < ((times % 4) + 4) % 4; i++) {
    m = m[0].map((_, c) => m.map(r => r[c]).reverse());
  }
  return m;
}

function tryRotate(dir) {
  if (isAnimatingDrop || lockGlow) return;
  const next = rotateCopy(current.matrix, dir === 1 ? 1 : 3);
  for (const [dx, dy] of [[0,0],[dir,0],[-dir,0],[0,-1],[0,-2]]) {
    const pos = { x: currentPos.x + dx, y: currentPos.y + dy };
    if (!collides(next, pos)) {
      current.matrix = next; currentPos = pos;
      resetLockDelay(); render(); return;
    }
  }
}

function moveLeft() {
  if (isAnimatingDrop || lockGlow) return;
  const pos = { ...currentPos, x: currentPos.x - 1 };
  if (!collides(current.matrix, pos)) { currentPos = pos; resetLockDelay(); render(); }
}

function moveRight() {
  if (isAnimatingDrop || lockGlow) return;
  const pos = { ...currentPos, x: currentPos.x + 1 };
  if (!collides(current.matrix, pos)) { currentPos = pos; resetLockDelay(); render(); }
}

function softDrop() {
  const pos = { ...currentPos, y: currentPos.y + 1 };
  if (!collides(current.matrix, pos)) {
    currentPos = pos;
    if (lockTimer) { clearTimeout(lockTimer); lockTimer = null; }
    render();
  } else {
    // 1.5 second lock delay
    if (!lockTimer && !lockGlow) lockTimer = setTimeout(triggerLockGlow, 1500);
  }
}

function hardDrop() {
  if (dropLocked || isAnimatingDrop) return;
  let targetY = currentPos.y;
  while (!collides(current.matrix, { x: currentPos.x, y: targetY + 1 })) targetY++;

  const dist = targetY - currentPos.y;
  if (dist > 0) {
    dropLocked = true; isAnimatingDrop = true;
    let startY = currentPos.y;
    let frames = Math.min(dist, 5);
    let frame = 0;
    function anim() {
      frame++;
      currentPos.y = Math.floor(startY + (dist * (frame / frames)));
      render();
      if (frame < frames) requestAnimationFrame(anim);
      else {
        currentPos.y = targetY; isAnimatingDrop = false; dropLocked = false;
        if (lockTimer) clearTimeout(lockTimer);
        // 1.5 second lock delay after hard dropping
        lockTimer = setTimeout(triggerLockGlow, 1500);
      }
    }
    requestAnimationFrame(anim);
  } else {
    if (lockTimer) clearTimeout(lockTimer);
    lockTimer = setTimeout(triggerLockGlow, 1500);
  }
}

function holdPiece() {
  if (heldUsed || isAnimatingDrop || lockGlow) return;
  if (heldPiece) {
    const tmp = current.type;
    current = { type: heldPiece, matrix: rotateCopy(PIECES[heldPiece], 0) };
    currentPos = { x: Math.floor((COLS - current.matrix[0].length) / 2), y: getSpawnY(current.matrix) };
    heldPiece = tmp;
    if (collides(current.matrix, currentPos)) { endGame(); return; }
  } else {
    heldPiece = current.type; spawnPiece();
  }
  heldUsed = true;
  if (lockTimer) { clearTimeout(lockTimer); lockTimer = null; }
  render();
}

function collides(mat, pos) {
  for (let r = 0; r < mat.length; r++) {
    for (let c = 0; c < mat[r].length; c++) {
      if (mat[r][c]) {
        const nx = pos.x + c, ny = pos.y + r;
        if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
        if (ny >= 0 && board[ny][nx]) return true;
      }
    }
  }
  return false;
}

function resetLockDelay() {
  if (lockTimer) clearTimeout(lockTimer); lockTimer = null;
  if (collides(current.matrix, { x: currentPos.x, y: currentPos.y + 1 })) {
    lockTimer = setTimeout(triggerLockGlow, 1500);
  }
}

function triggerLockGlow() {
  if (lockGlowTimer) return;
  lockGlow = true; dropLocked = true; render();
  // Fast visual glowing effect duration (60ms)
  lockGlowTimer = setTimeout(() => { lockGlow = false; lockGlowTimer = null; lockPiece(); }, 60);
}

function lockPiece() {
  for (let r = 0; r < current.matrix.length; r++) {
    for (let c = 0; c < current.matrix[r].length; c++) {
      if (current.matrix[r][c]) {
        const ny = currentPos.y + r;
        if (ny < 0) { endGame(); return; }
        board[ny][currentPos.x + c] = current.type;
      }
    }
  }
  clearLines(); spawnPiece(); render();
}

function clearLines() {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every(c => c !== null)) {
      board.splice(r, 1); board.unshift(Array(COLS).fill(null)); cleared++; r++;
    }
  }
  if (cleared > 0) {
    const pts = [0, 10, 30, 50, 80];
    score += pts[cleared] * level;
    linesCleared += cleared;
    
    const nextLevel = startLevel + Math.floor(linesCleared / 10);
    if (nextLevel > level) {
      level = nextLevel;
      if (level > maxUnlockedLevel) {
        maxUnlockedLevel = level;
        localStorage.setItem('beztris_max_level', maxUnlockedLevel);
      }
    }
    updateHUD(); startLoop();
  }
}

function endGame() {
  gameOver = true; clearInterval(dropTimer);
  boardCtx.fillStyle = 'rgba(200,0,0,0.55)'; boardCtx.fillRect(0,0,boardCtx.canvas.width,boardCtx.canvas.height);
  setTimeout(showPause, 900);
}

function startLoop() {
  clearInterval(dropTimer);
  const speed = Math.max(50, 800 * Math.pow(0.85, level - 1));
  dropTimer = setInterval(() => { if (!paused && !gameOver && !lockGlow && !dropLocked) softDrop(); }, speed);
}

function render() {
  boardCtx.clearRect(0,0,160,320);
  
  // Grid Lines
  boardCtx.strokeStyle = 'rgba(255,255,255,0.04)'; boardCtx.lineWidth = 1;
  for (let c=0; c<=COLS; c++){ boardCtx.beginPath(); boardCtx.moveTo(c*CELL,0); boardCtx.lineTo(c*CELL,320); boardCtx.stroke();}
  for (let r=0; r<=ROWS; r++){ boardCtx.beginPath(); boardCtx.moveTo(0,r*CELL); boardCtx.lineTo(160,r*CELL); boardCtx.stroke();}

  // Ghost Piece
  let gy = currentPos.y;
  while (!collides(current.matrix, { x: currentPos.x, y: gy + 1 })) gy++;
  drawPiece(boardCtx, current.matrix, currentPos.x, gy, COLORS[current.type], 0.2);

  // Locked Board and Active Piece
  for (let r=0; r<ROWS; r++) for (let c=0; c<COLS; c++) if (board[r][c]) drawCell(boardCtx, c, r, COLORS[board[r][c]]);
  drawPiece(boardCtx, current.matrix, currentPos.x, currentPos.y, lockGlow ? '#ffffff' : COLORS[current.type], 1);
  
  renderMini(holdCtx, heldPiece ? PIECES[heldPiece] : null, heldPiece ? COLORS[heldPiece] : '#333');
  renderNext();
}

function drawPiece(ctx, mat, ox, oy, col, alpha) {
  ctx.globalAlpha = alpha;
  for (let r=0; r<mat.length; r++) for (let c=0; c<mat[r].length; c++) if (mat[r][c]) drawCell(ctx, ox+c, oy+r, col);
  ctx.globalAlpha = 1;
}

function drawCell(ctx, x, y, col) {
  ctx.fillStyle = col; ctx.fillRect(x*CELL+1, y*CELL+1, CELL-2, CELL-2);
  ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(x*CELL+1, y*CELL+1, CELL-2, 2); ctx.fillRect(x*CELL+1, y*CELL+1, 2, CELL-2);
  ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(x*CELL+1, y*CELL+CELL-3, CELL-2, 2); ctx.fillRect(x*CELL+CELL-3, y*CELL+1, 2, CELL-2);
}

function renderMini(ctx, mat, color) {
  ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height);
  if (!mat) return;
  const size = 12, cols = mat[0].length, rows = mat.length;
  const ox = Math.floor((ctx.canvas.width - cols*size)/2), oy = Math.floor((ctx.canvas.height - rows*size)/2);
  ctx.fillStyle = color;
  for (let r=0; r<rows; r++) for (let c=0; c<cols; c++) if (mat[r][c]) ctx.fillRect(ox+c*size+1, oy+r*size+1, size-2, size-2);
}

function renderNext() {
  nextCtx.clearRect(0,0,nextCtx.canvas.width,nextCtx.canvas.height);
  const size = 11, secH = nextCtx.canvas.height / 3;
  nextQueue.forEach((type, i) => {
    const mat = PIECES[type], r = mat.length, c = mat[0].length;
    const ox = Math.floor((nextCtx.canvas.width - c*size)/2), oy = Math.floor(i*secH + (secH - r*size)/2);
    nextCtx.fillStyle = COLORS[type];
    for (let y=0; y<r; y++) for (let x=0; x<c; x++) if (mat[y][x]) nextCtx.fillRect(ox+x*size+1, oy+y*size+1, size-2, size-2);
  });
}

function updateHUD() { document.getElementById('scoreVal').textContent = score; document.getElementById('levelVal').textContent = level; }
function showGame() { document.getElementById('overlay').classList.remove('active'); paused = false; startLoop(); }
function showPause() {
  paused = true; clearInterval(dropTimer);
  document.getElementById('overlay').classList.add('active'); document.getElementById('pauseMenu').classList.add('active');
  document.getElementById('levelMenu').classList.remove('active'); document.getElementById('controlsMenu').classList.remove('active');
}

// GUI Binding
document.getElementById('pauseBtn').addEventListener('touchstart', e => { e.preventDefault(); showPause(); }, { passive: false });
document.getElementById('pmResume').onclick = () => { if(!gameOver) showGame(); };
document.getElementById('pmRestart').onclick = () => { showGame(); initGame(startLevel); };
document.getElementById('pmLevel').onclick = () => {
  document.getElementById('pauseMenu').classList.remove('active'); document.getElementById('levelMenu').classList.add('active');
  document.getElementById('levelNum').textContent = startLevel; document.getElementById('levelMax').textContent = '/' + maxUnlockedLevel;
};
document.getElementById('pmControls').onclick = () => {
  document.getElementById('pauseMenu').classList.remove('active'); document.getElementById('controlsMenu').classList.add('active');
};
document.getElementById('controlsMenu').onclick = () => { document.getElementById('controlsMenu').classList.remove('active'); document.getElementById('pauseMenu').classList.add('active'); };
document.getElementById('levelBack').onclick = () => { document.getElementById('levelMenu').classList.remove('active'); document.getElementById('pauseMenu').classList.add('active'); };

document.getElementById('lvlUp').onclick = () => { if(startLevel < maxUnlockedLevel) document.getElementById('levelNum').textContent = ++startLevel; };
document.getElementById('lvlDown').onclick = () => { if(startLevel > 1) document.getElementById('levelNum').textContent = --startLevel; };

// Play Screen Touch Inputs
document.getElementById('gameScreen').addEventListener('touchstart', e => {
  if (gameOver || paused || e.target.closest('#pauseBtn')) return;
  e.preventDefault();
  const touch = e.changedTouches[0], x = touch.clientX, y = touch.clientY, vw = window.innerWidth, vh = window.innerHeight;
  
  if (y > vh * 0.75) { 
    if(!dropLocked) hardDrop(); 
  } else if (x < vw * 0.35) { 
    tryRotate(-1);
  } else if (x > vw * 0.65) {
    if (y < vh * 0.50) holdPiece();
    else tryRotate(1);
  }
}, { passive: false });

document.addEventListener('rotarydetent', e => {
  if (document.getElementById('levelMenu').classList.contains('active')) {
    if (e.detail.direction === 'CW' && startLevel < maxUnlockedLevel) document.getElementById('levelNum').textContent = ++startLevel;
    else if (e.detail.direction === 'CCW' && startLevel > 1) document.getElementById('levelNum').textContent = --startLevel;
    return;
  }
  if (gameOver || paused) return;
  if (e.detail.direction === 'CW') moveRight(); else moveLeft();
});

document.addEventListener('tizenhwkey', e => {
  if (e.keyName !== 'back') return;
  if (document.getElementById('levelMenu').classList.contains('active') || document.getElementById('controlsMenu').classList.contains('active')) {
    document.getElementById('levelMenu').classList.remove('active'); document.getElementById('controlsMenu').classList.remove('active'); document.getElementById('pauseMenu').classList.add('active');
  } else if (document.getElementById('overlay').classList.contains('active')) { if(!gameOver) showGame(); } else showPause();
});

window.addEventListener('load', () => {
  setTimeout(() => { document.getElementById('splash').style.display = 'none'; document.getElementById('gameScreen').style.display = 'block'; initGame(1); render(); }, 2500);
});