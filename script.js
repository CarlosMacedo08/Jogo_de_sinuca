// ... [O RESTANTE DO CÓDIGO NÃO MUDA, exceto a função iaComputadorJoga abaixo]

// --- IA MELHORADA ---
function iaComputadorJoga() {
  let meuTipo = "par";
  let bolasAlvo = balls.filter(b => !b.inPocket && !b.isCue && isPlayerBall(b, meuTipo));
  if (bolasAlvo.length === 0) {
    bolasAlvo = balls.filter(b => !b.inPocket && !b.isCue && b.number === 8);
  }
  if (bolasAlvo.length === 0) return;

  // Busca a melhor combinação bola/par de buraco com menor ângulo de entrada viável e caminho livre
  let melhor = null;
  let melhorScore = -Infinity;

  for (let bola of bolasAlvo) {
    for (let pocket of POCKETS) {
      // Calcula ângulo entre bola-alvo e buraco
      let vx = pocket.x - bola.x;
      let vy = pocket.y - bola.y;
      let distAlvoBuraco = Math.sqrt(vx * vx + vy * vy);

      // Posição ideal para a branca atingir a bola (ponto tangente atrás da bola em direção ao buraco)
      let px = bola.x - (vx / distAlvoBuraco) * BALL_RADIUS * 2;
      let py = bola.y - (vy / distAlvoBuraco) * BALL_RADIUS * 2;

      // Distância da branca ao ponto de impacto
      let dx = px - cueBall.x;
      let dy = py - cueBall.y;
      let distBrancaAlvo = Math.sqrt(dx * dx + dy * dy);

      // Penalidade se a branca está muito longe ou atrás da bola
      let score = -distBrancaAlvo - distAlvoBuraco * 0.5;

      // Checa se há bola entre a branca e o alvo (colisão prematura): simples raycast
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
      if (colisao) score -= 1000; // evita bolas bloqueadas

      // Pequeno random pra não ser impossível de ganhar
      score += Math.random() * 10;

      if (score > melhorScore) {
        melhorScore = score;
        melhor = { alvo: bola, pocket, px, py, distBrancaAlvo, vx, vy, distAlvoBuraco };
      }
    }
  }
  if (!melhor) return;

  // Mira com mira levemente imprecisa
  let dx = melhor.px - cueBall.x;
  let dy = melhor.py - cueBall.y;
  let dist = Math.sqrt(dx * dx + dy * dy);
  let force = Math.max(10, Math.min(20, dist / 8 + melhor.distAlvoBuraco / 14 + 3 + Math.random()*2));
  // Erro proposital para não ser impossível
  let erro = (Math.random() - 0.5) * 0.15; // até 9 graus de erro
  let ang = Math.atan2(dy, dx) + erro;
  cueBall.vx = Math.cos(ang) * force;
  cueBall.vy = Math.sin(ang) * force;
  updateBalls();
}
