const canvas = document.getElementById('pool-table');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
  let w = Math.min(window.innerWidth * 0.98, 800);
  let h = w / 2;
  canvas.width = w;
  canvas.height = h;
  WIDTH = canvas.width;
  HEIGHT = canvas.height;
  POCKETS[0].x = 0; POCKETS[0].y = 0;
  POCKETS[1].x = WIDTH / 2; POCKETS[1].y = 0;
  POCKETS[2].x = WIDTH; POCKETS[2].y = 0;
  POCKETS[3].x = 0; POCKETS[3].y = HEIGHT;
  POCKETS[4].x = WIDTH / 2; POCKETS[4].y = HEIGHT;
  POCKETS[5].x = WIDTH; POCKETS[5].y = HEIGHT;
  draw();
}
let WIDTH = canvas.width;
let HEIGHT = canvas.height;

const BALL_RADIUS = 13;
const POCKET_RADIUS = 24;
const FRICTION = 0.975;
const MIN_VELOCITY = 0.07;
const CUE_LENGTH = 180;
const CUE_WIDTH = 6;
const MIN_CUE_DIST = 25;

const POCKETS = [
  { x: 0, y: 0 },
  { x: WIDTH / 2, y: 0 },
  { x: WIDTH, y: 0 },
  { x: 0, y: HEIGHT },
  { x: WIDTH / 2, y: HEIGHT },
  { x: WIDTH, y: HEIGHT }
];

let balls = [];
let cueBall;
let isAiming = false;
let aimStart = null;
let aimEnd = null;
let currentPlayer = 1;
let message = "";
let gameOver = false;

let playerType = [null, "impar", "par"];
let lastPocketed = [];
let turnHasPocketed = false;
let gameStarted = false;

// Perfis dos jogadores
let jogadores = [
  {
    nome: "Jogador 1",
    bolas: [],
    cor: "#ffd700"
  },
  {
    nome: "Computador",
    bolas: [],
    cor: "#00bfff"
  }
];

const ballData = [
  {num: 1, color: "#fcdc3b"},
  {num: 2, color: "#334cff"},
  {num: 3, color: "#f05e3b"},
  {num: 4, color: "#9143e6"},
  {num: 5, color: "#f4a83b"},
  {num: 6, color: "#26734d"},
  {num: 7, color: "#883426"},
  {num: 8, color: "#222"},
  {num: 9, color: "#fcdc3b"},
  {num:10, color: "#334cff"},
  {num:11, color: "#f05e3b"},
  {num:12, color: "#9143e6"},
  {num:13, color: "#f4a83b"},
  {num:14, color: "#26734d"},
  {num:15, color: "#883426"}
];

function showStartMessage() {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = "#226644";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Sombra na caixa central
  ctx.save();
  ctx.globalAlpha = 0.20;
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.ellipse(WIDTH / 2, HEIGHT / 2 + 90, 220, 50, 0, 0, 2 * Math.PI);
  ctx.fill();
  ctx.restore();

  // Caixa central do aviso
  ctx.save();
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = "#184d33";
  ctx.strokeStyle = "#ffe66d";
  ctx.lineWidth = 5;
  ctx.roundRect(WIDTH/2-240, HEIGHT/2-82, 480, 175, 28);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  ctx.font = "bold 30px Arial";
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.fillText("Bem-vindo ao Jogo de Sinuca!", WIDTH / 2, HEIGHT / 2 - 50);
  ctx.font = "bold 21px Arial";
  ctx.fillStyle = "#ffe66d";
  ctx.fillText("Jogador 1: Bolas ÍMPARES (1,3,5,7,9,11,13,15)", WIDTH / 2, HEIGHT / 2 - 10);
  ctx.fillStyle = "#75d2ff";
  ctx.fillText("Computador: Bolas PARES (2,4,6,8,10,12,14)", WIDTH / 2, HEIGHT / 2 + 23);
  ctx.font = "18px Arial";
  ctx.fillStyle = "#fff";
  ctx.fillText("Puxe o taco para trás e solte para tacar!", WIDTH / 2, HEIGHT / 2 + 57);
  ctx.fillStyle = "#ffe66d";
  ctx.fillText("Toque para começar!", WIDTH / 2, HEIGHT / 2 + 86);
  document.getElementById('message').textContent = "";
  atualizarPerfilJogadores();
}

// Forçar rotação landscape em mobile
function requestLandscape() {
  if (window.screen.orientation && /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
    try {
      if (screen.orientation.type.indexOf('landscape') === -1) {
        screen.orientation.lock('landscape').catch(() => {
          if (canvas.requestFullscreen) {
            canvas.requestFullscreen().then(() => {
              screen.orientation.lock('landscape').catch(()=>{});
            });
          }
        });
      }
    } catch (e) {}
  }
}

function Ball(x, y, color, number, isCue=false) {
  this.x = x;
  this.y = y;
  this.vx = 0;
  this.vy = 0;
  this.color = color;
  this.number = number;
  this.inPocket = false;
  this.isCue = isCue;
}

function resetGame() {
  balls = [];
  gameOver = false;
  lastPocketed = [];
  turnHasPocketed = false;
  jogadores[0].bolas = [];
  jogadores[1].bolas = [];

  cueBall = new Ball(WIDTH * 0.22, HEIGHT / 2, "#fff", 0, true);
  balls.push(cueBall);

  const rackX = WIDTH * 0.7;
  const rackY = HEIGHT / 2;
  let positions = [];
  let idx = 0;
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col <= row; col++) {
      if (idx >= ballData.length) break;
      let x = rackX + row * BALL_RADIUS * 2 * Math.cos(Math.PI / 6);
      let y = rackY - row * BALL_RADIUS + col * (BALL_RADIUS * 2);
      positions.push({ x, y });
      idx++;
    }
  }
  let shuffleBalls = [...ballData];
  let eight = shuffleBalls.splice(7, 1)[0];
  shuffleBalls = shuffle(shuffleBalls);
  shuffleBalls.splice(6, 0, eight);

  for (let i = 0; i < positions.length; i++) {
    balls.push(new Ball(
      positions[i].x, positions[i].y,
      shuffleBalls[i].color,
      shuffleBalls[i].num,
      false
    ));
  }
  currentPlayer = 1;
  message = `Jogador 1, sua vez!`;
  draw();
  atualizarPerfilJogadores();
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function drawTable() {
  // Sombra na mesa
  ctx.save();
  ctx.shadowColor = "#1b3c24";
  ctx.shadowBlur = 38;
  ctx.fillStyle = "#226644";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.restore();

  // Pockets com gradient e blur
  for (let p of POCKETS) {
    let grad = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, POCKET_RADIUS);
    grad.addColorStop(0, "#000");
    grad.addColorStop(0.6, "#333c");
    grad.addColorStop(1, "#0000");
    ctx.beginPath();
    ctx.arc(p.x, p.y, POCKET_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.shadowBlur = 13;
    ctx.shadowColor = "#000";
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}

function drawBalls() {
  ctx.font = "bold 15px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let b of balls) {
    if (b.inPocket) continue;
    // Bola
    ctx.save();
    let grad = ctx.createRadialGradient(b.x - 6, b.y - 7, 2, b.x, b.y, BALL_RADIUS * 1.15);
    grad.addColorStop(0, "#fff");
    grad.addColorStop(0.18, "#fff9");
    grad.addColorStop(0.37, b.color);
    grad.addColorStop(1, "#222");
    ctx.beginPath();
    ctx.arc(b.x, b.y, BALL_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.shadowColor = "#0009";
    ctx.shadowBlur = 6;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "#222";
    ctx.lineWidth = 2;
    ctx.stroke();
    // Número
    if (!b.isCue) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, BALL_RADIUS * 0.56, 0, Math.PI * 2);
      ctx.fillStyle = "#fff";
      ctx.globalAlpha = 0.92;
      ctx.fill();
      ctx.globalAlpha = 1.0;
      ctx.lineWidth = 1.3;
      ctx.strokeStyle = "#eee";
      ctx.stroke();
      ctx.fillStyle = (b.number === 8) ? "#fff" : "#222";
      ctx.font = "bold 13px Arial";
      ctx.fillText(b.number, b.x, b.y);
    }
    if (b.isCue) {
      ctx.strokeStyle = "#bbb";
      ctx.lineWidth = 3;
      ctx.stroke();
      // brilho na branca
      ctx.beginPath();
      ctx.arc(b.x - 5, b.y - 4, 3, 0, Math.PI * 2);
      ctx.fillStyle = "#fff9";
      ctx.globalAlpha = 0.6;
      ctx.fill();
      ctx.globalAlpha = 1.0;
    }
    ctx.restore();
  }
}

function drawAimLine() {
  if (isAiming && aimStart && aimEnd) {
    let dist = Math.sqrt(Math.pow(aimEnd.x - aimStart.x, 2) + Math.pow(aimEnd.y - aimStart.y, 2));
    if (dist > MIN_CUE_DIST) {
      ctx.save();
      ctx.strokeStyle = "#ffe66d";
      ctx.setLineDash([6, 8]);
      ctx.lineWidth = 2.2;
      ctx.shadowBlur = 4;
      ctx.shadowColor = "#ffe66d";
      ctx.beginPath();
      ctx.moveTo(aimStart.x, aimStart.y);
      ctx.lineTo(aimEnd.x, aimEnd.y);
      ctx.stroke();
      ctx.restore();
    }
  }
}

function drawCue() {
  if (!isAiming || !aimStart || !aimEnd) return;
  let dx = aimEnd.x - aimStart.x;
  let dy = aimEnd.y - aimStart.y;
  let dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < MIN_CUE_DIST) return;
  let angle = Math.atan2(dy, dx);
  let cueStartDist = BALL_RADIUS + 6;
  let cueEndDist = BALL_RADIUS + CUE_LENGTH;
  let startX = cueBall.x - Math.cos(angle) * cueStartDist;
  let startY = cueBall.y - Math.sin(angle) * cueStartDist;
  let endX = cueBall.x - Math.cos(angle) * cueEndDist;
  let endY = cueBall.y - Math.sin(angle) * cueEndDist;
  ctx.save();
  // Taco
  let grad = ctx.createLinearGradient(startX, startY, endX, endY);
  grad.addColorStop(0, "#f3e0c5");
  grad.addColorStop(0.25, "#d4996a");
  grad.addColorStop(0.7, "#d4996a");
  grad.addColorStop(1, "#b5772f");
  ctx.strokeStyle = grad;
  ctx.lineWidth = CUE_WIDTH;
  ctx.lineCap = "round";
  ctx.shadowBlur = 5;
  ctx.shadowColor = "#664422";
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(endX, endY);
  ctx.stroke();
  // Ponta azul
  ctx.strokeStyle = "#2299ee";
  ctx.lineWidth = CUE_WIDTH - 2;
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(startX - Math.cos(angle) * 12, startY - Math.sin(angle) * 12);
  ctx.stroke();
  ctx.restore();
}

function draw() {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  drawTable();
  drawBalls();
  drawAimLine();
  drawCue();
  document.getElementById('message').textContent = message;
  atualizarPerfilJogadores();
}

function ballCollision(b1, b2) {
  let dx = b2.x - b1.x;
  let dy = b2.y - b1.y;
  let dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < BALL_RADIUS * 2) {
    let overlap = BALL_RADIUS * 2 - dist;
    let nx = dx / dist;
    let ny = dy / dist;
    b1.x -= nx * overlap / 2;
    b1.y -= ny * overlap / 2;
    b2.x += nx * overlap / 2;
    b2.y += ny * overlap / 2;
    let dvx = b2.vx - b1.vx;
    let dvy = b2.vy - b1.vy;
    let impactSpeed = dvx * nx + dvy * ny;
    if (impactSpeed < 0) {
      let impulse = 2 * impactSpeed / 2;
      b1.vx += impulse * nx;
      b1.vy += impulse * ny;
      b2.vx -= impulse * nx;
      b2.vy -= impulse * ny;
    }
  }
}

function wallCollision(ball) {
  if (ball.x - BALL_RADIUS < 0) {
    ball.x = BALL_RADIUS;
    ball.vx = -ball.vx * 0.8;
  }
  if (ball.x + BALL_RADIUS > WIDTH) {
    ball.x = WIDTH - BALL_RADIUS;
    ball.vx = -ball.vx * 0.8;
  }
  if (ball.y - BALL_RADIUS < 0) {
    ball.y = BALL_RADIUS;
    ball.vy = -ball.vy * 0.8;
  }
  if (ball.y + BALL_RADIUS > HEIGHT) {
    ball.y = HEIGHT - BALL_RADIUS;
    ball.vy = -ball.vy * 0.8;
  }
}

function isPlayerBall(ball, type) {
  if (!type) return false;
  if (ball.number === 8) return false;
  if (type === "impar") return ball.number % 2 === 1;
  if (type === "par") return ball.number % 2 === 0;
  return false;
}

function checkPockets(ball) {
  for (let pocket of POCKETS) {
    let dx = ball.x - pocket.x;
    let dy = ball.y - pocket.y;
    if (Math.sqrt(dx * dx + dy * dy) < POCKET_RADIUS) {
      ball.inPocket = true;
      ball.vx = 0;
      ball.vy = 0;
      if (ball.isCue) {
        message = "A bola branca caiu! Ela será recolocada. Passa o turno.";
        setTimeout(() => {
          ball.x = WIDTH * 0.22;
          ball.y = HEIGHT / 2;
          ball.inPocket = false;
          draw();
        }, 1200);
        continue;
      }
      if (ball.number === 8) {
        let myType = playerType[currentPlayer];
        let restamDoMeuTipo = balls.filter(
          b => !b.inPocket && !b.isCue && b.number !== 8 && isPlayerBall(b, myType)
        ).length;
        if (restamDoMeuTipo === 0) {
          message = `Jogador ${currentPlayer} venceu! Clique em Resetar para jogar de novo.`;
        } else {
          message = `Você perdeu o jogo! Encaçapou a bola 8 antes da hora. Clique em Resetar para jogar de novo.`;
        }
        gameOver = true;
        draw();
        continue;
      }
      lastPocketed.push(ball);
      turnHasPocketed = true;
    }
  }
}

function updateBalls() {
  let moving = false;
  for (let ball of balls) {
    if (ball.inPocket) continue;
    ball.x += ball.vx;
    ball.y += ball.vy;
    ball.vx *= FRICTION;
    ball.vy *= FRICTION;
    if (Math.abs(ball.vx) > MIN_VELOCITY || Math.abs(ball.vy) > MIN_VELOCITY) {
      moving = true;
    } else {
      ball.vx = 0;
      ball.vy = 0;
    }
    wallCollision(ball);
    checkPockets(ball);
  }
  for (let i = 0; i < balls.length; i++) {
    for (let j = i + 1; j < balls.length; j++) {
      if (!balls[i].inPocket && !balls[j].inPocket) {
        ballCollision(balls[i], balls[j]);
      }
    }
  }
  draw();
  if (moving) {
    requestAnimationFrame(updateBalls);
  } else {
    if (!gameOver) processTurn();
  }
}

function processTurn() {
  let foul = false;
  let wrongBall = false;
  for (let b of lastPocketed) {
    if (b.number === 8) continue;
    if (playerType[currentPlayer] && !isPlayerBall(b, playerType[currentPlayer])) {
      wrongBall = true;
    }
  }
  if (cueBall.inPocket) foul = true;

  if (gameOver) return;

  // Atribuir bolas encaçapadas ao jogador da vez (apenas se forem do tipo dele)
  for (let b of lastPocketed) {
    if (b.number >= 1 && b.number <= 15 && isPlayerBall(b, playerType[currentPlayer])) {
      if (!jogadores[currentPlayer-1].bolas.includes(b.number)) {
        jogadores[currentPlayer-1].bolas.push(b.number);
      }
    }
  }

  if (foul || wrongBall || !turnHasPocketed) {
    currentPlayer = 3 - currentPlayer;
    message = `Jogador ${currentPlayer === 2 ? "Computador" : "Jogador 1"}, sua vez!`;
  } else {
    message = `Jogador ${currentPlayer === 2 ? "Computador" : "Jogador 1"} continua!`;
  }

  lastPocketed = [];
  turnHasPocketed = false;
  draw();

  // Se for a vez do Computador e não acabou, joga!
  if (!gameOver && currentPlayer === 2) {
    setTimeout(iaComputadorJoga, 1100);
  }
}

// --- IA MELHORADA (apenas bolas pares para o Comp.) ---
function iaComputadorJoga() {
  let meuTipo = "par";
  let bolasAlvo = balls.filter(b => !b.inPocket && !b.isCue && isPlayerBall(b, meuTipo));
  if (bolasAlvo.length === 0) {
    bolasAlvo = balls.filter(b => !b.inPocket && !b.isCue && b.number === 8);
  }
  if (bolasAlvo.length === 0) return;

  let melhor = null;
  let melhorScore = -Infinity;

  for (let bola of bolasAlvo) {
    for (let pocket of POCKETS) {
      let vx = pocket.x - bola.x;
      let vy = pocket.y - bola.y;
      let distAlvoBuraco = Math.sqrt(vx * vx + vy * vy);

      let px = bola.x - (vx / distAlvoBuraco) * BALL_RADIUS * 2;
      let py = bola.y - (vy / distAlvoBuraco) * BALL_RADIUS * 2;

      let dx = px - cueBall.x;
      let dy = py - cueBall.y;
      let distBrancaAlvo = Math.sqrt(dx * dx + dy * dy);

      let score = -distBrancaAlvo - distAlvoBuraco * 0.5;

      let colisao = false;
      for (let ob of balls) {
        if (ob === cueBall || ob === bola || ob.inPocket) continue;
        let t = ((ob.x - cueBall.x) * dx + (ob.y - cueBall.y) * dy) / (distBrancaAlvo * distBrancaAlvo);
        if (t > 0 && t < 1) {
          let px2 = cueBall.x + dx * t;
          let py2 = cueBall.y + dy * t;
          let dd = Math.hypot(px2 - ob.x, py2 - ob.y);
          if (dd < BALL_RADIUS * 2) colisao = true;
        }
      }
      if (colisao) score -= 1000;

      score += Math.random() * 10;

      if (score > melhorScore) {
        melhorScore = score;
        melhor = { alvo: bola, pocket, px, py, distBrancaAlvo, vx, vy, distAlvoBuraco };
      }
    }
  }
  if (!melhor) return;

  let dx = melhor.px - cueBall.x;
  let dy = melhor.py - cueBall.y;
  let dist = Math.sqrt(dx * dx + dy * dy);
  let force = Math.max(10, Math.min(20, dist / 8 + melhor.distAlvoBuraco / 14 + 3 + Math.random()*2));
  let erro = (Math.random() - 0.5) * 0.15;
  let ang = Math.atan2(dy, dx) + erro;
  cueBall.vx = Math.cos(ang) * force;
  cueBall.vy = Math.sin(ang) * force;
  updateBalls();
}

function getCanvasPos(e) {
  let rect = canvas.getBoundingClientRect();
  if (e.touches && e.touches.length) {
    return {
      x: (e.touches[0].clientX - rect.left) * (canvas.width / rect.width),
      y: (e.touches[0].clientY - rect.top) * (canvas.height / rect.height)
    };
  } else {
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height)
    };
  }
}
canvas.addEventListener('mousedown', pointerStart, false);
canvas.addEventListener('mousemove', pointerMove, false);
canvas.addEventListener('mouseup', pointerEnd, false);
canvas.addEventListener('touchstart', pointerStart, false);
canvas.addEventListener('touchmove', pointerMove, false);
canvas.addEventListener('touchend', pointerEnd, false);

function pointerStart(e) {
  if (!gameStarted) {
    gameStarted = true;
    requestLandscape();
    resetGame();
    return;
  }
  if (gameOver) return;
  if (currentPlayer === 2) return;

  if (!cueBall.inPocket && !balls.some(b => b.vx !== 0 || b.vy !== 0)) {
    let pos = getCanvasPos(e);
    let dx = pos.x - cueBall.x;
    let dy = pos.y - cueBall.y;
    if (Math.sqrt(dx * dx + dy * dy) <= BALL_RADIUS * 1.3) {
      isAiming = true;
      aimStart = { x: cueBall.x, y: cueBall.y };
      aimEnd = { x: pos.x, y: pos.y };
      draw();
      e.preventDefault();
    }
  }
}

function pointerMove(e) {
  if (!isAiming) return;
  let pos = getCanvasPos(e);
  aimEnd = { x: pos.x, y: pos.y };
  draw();
  e.preventDefault();
}

function pointerEnd(e) {
  if (!isAiming) return;
  let pos = aimEnd;
  let dx = pos.x - aimStart.x;
  let dy = pos.y - aimStart.y;
  let dist = Math.sqrt(dx * dx + dy * dy);
  if (dist > MIN_CUE_DIST) {
    let force = Math.min(dist / 8, 20);
    let norm = Math.sqrt(dx * dx + dy * dy);
    if (norm > 0) {
      cueBall.vx = (dx / norm) * force;
      cueBall.vy = (dy / norm) * force;
    }
  }
  isAiming = false;
  aimStart = null;
  aimEnd = null;
  updateBalls();
  e.preventDefault();
}

window.addEventListener('resize', () => {
  resizeCanvas();
  draw();
});
document.getElementById('reset-btn').onclick = () => {
  gameStarted = false;
  resizeCanvas();
  showStartMessage();
};

// Numerador funcional de bolas encaçapadas
function atualizarPerfilJogadores() {
  let div = document.getElementById("player-profiles");
  if (!div) return;
  div.innerHTML = "";
  jogadores.forEach((jogador, idx) => {
    // Conta bolas do tipo certo para cada jogador
    const tipo = idx === 0 ? "impar" : "par";
    const total = 7;
    const encaçapadas = jogador.bolas.filter(bn => isPlayerBall({number: bn}, tipo)).length;
    let perfil = document.createElement("div");
    perfil.className = "player-profile" + (currentPlayer-1 === idx ? " active" : "");
    perfil.innerHTML = `
      <div class="player-profile-name" style="color:${jogador.cor};">${jogador.nome}${currentPlayer-1 === idx ? " <span style='font-size:.9em;'>(Vez)</span>" : ""}</div>
      <div style="color:#fff;margin-bottom:4px;"><b>Bolas encaçapadas: ${encaçapadas} de 7</b></div>
      <div class="player-profile-balls">
        ${jogador.bolas.length > 0 ? jogador.bolas.sort((a,b)=>a-b).map(n=>`<span>${n}</span>`).join(" ") : "<span style='color:#888;'>Nenhuma</span>"}
      </div>
    `;
    div.appendChild(perfil);
  });
}

resizeCanvas();
showStartMessage();
