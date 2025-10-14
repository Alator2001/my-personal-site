document.addEventListener("DOMContentLoaded", () => {
  // ===== Настройки =====
  const CONFIG = {
    dprLimit: 2,
    spawnEveryMs: 280,
    maxComets: 2,
    minSpeed: 1.0,
    maxSpeed: 4.3,
    tailLength: 36,
    tailWidth: 2,
    angles: [120, 300, 45, 225],
    angleJitter: 8,
    trail: { fade: 0.28, blur: 0.8 },
    starCount: 100,
    starAlpha: 0.65
  };

  // ===== Canvas setup =====
  const canvas = document.createElement("canvas");
  canvas.id = "stars";
  document.body.prepend(canvas);
  const ctx = canvas.getContext("2d");

  // слой фоновых звёзд
  const bgCanvas = document.createElement("canvas");
  const bgCtx = bgCanvas.getContext("2d");

  // << отдельный слой для хвостов >>
  const tailCanvas = document.createElement("canvas");
  const tailCtx = tailCanvas.getContext("2d");

  function sizeCanvases() {
    const dpr = Math.min(window.devicePixelRatio || 1, CONFIG.dprLimit);
    const w = Math.floor(window.innerWidth);
    const h = Math.floor(window.innerHeight);

    // главный холст
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // фоновые звёзды и хвосты в CSS-пикселях (без DPR)
    bgCanvas.width = w;
    bgCanvas.height = h;
    tailCanvas.width = w;
    tailCanvas.height = h;

    drawBackgroundStars();
  }
  window.addEventListener("resize", sizeCanvases);
  sizeCanvases();

  // ===== Фоновая россыпь =====
  function drawBackgroundStars() {
    const w = bgCanvas.width, h = bgCanvas.height;
    bgCtx.clearRect(0, 0, w, h);
    for (let i = 0; i < CONFIG.starCount; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const r = Math.random() * 1.2 + 0.6; // ядро
      const coreAlpha = CONFIG.starAlpha * (0.6 + Math.random() * 0.4);

      // мягкая "корона"
      const halo = bgCtx.createRadialGradient(x, y, 0, x, y, r * 3);
      halo.addColorStop(0, `rgba(255,255,255,${0.35 * coreAlpha})`);
      halo.addColorStop(1, `rgba(255,255,255,0)`);
      bgCtx.fillStyle = halo;
      bgCtx.beginPath();
      bgCtx.arc(x, y, r * 3, 0, Math.PI * 2);
      bgCtx.fill();

      // яркое ядро
      bgCtx.fillStyle = `rgba(255,255,255,${coreAlpha})`;
      bgCtx.beginPath();
      bgCtx.arc(x, y, r, 0, Math.PI * 2);
      bgCtx.fill();
    }
  }

  // ===== Кометы =====
  const comets = [];
  let lastSpawn = 0;

  const rand = (a, b) => a + Math.random() * (b - a);
  const degToRad = (deg) => (deg * Math.PI) / 180;

  function pickAngleRad() {
    if (CONFIG.angles && CONFIG.angles.length) {
      const base = CONFIG.angles[Math.floor(Math.random() * CONFIG.angles.length)];
      const jitter = rand(-CONFIG.angleJitter, CONFIG.angleJitter);
      return degToRad(base + jitter);
    }
    return rand(0, Math.PI * 2);
  }

  function getSpawnPointForVector(vx, vy, w, h, margin = 40) {
    const ax = Math.abs(vx), ay = Math.abs(vy);
    if (ax > ay) {
      const y = Math.random() * h;
      return vx > 0 ? { x: -margin, y } : { x: w + margin, y };
    } else {
      const x = Math.random() * w;
      return vy > 0 ? { x, y: -margin } : { x, y: h + margin };
    }
  }

  function spawnComet() {
    if (comets.length >= CONFIG.maxComets) return;

    const angle = pickAngleRad();
    const speed = rand(CONFIG.minSpeed, CONFIG.maxSpeed);
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;

    const w = canvas.clientWidth, h = canvas.clientHeight;
    const start = getSpawnPointForVector(vx, vy, w, h);

    comets.push({
      x: start.x,
      y: start.y,
      vx, vy,
      width: CONFIG.tailWidth * (0.8 + Math.random() * 0.6),
      length: CONFIG.tailLength * (0.8 + Math.random() * 0.6),
      hue: 200 + Math.random() * 40, // голубовато-лазурные
      sat: 100,
      light: 85
    });
  }

  // ===== Рендер =====
  function renderFrame(ts) {
    // 1) Очищаем главный холст полностью (без «вуали»)
    ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);

    // 2) «Подстарить» слой хвостов — мягко стираем его через destination-out
    tailCtx.globalCompositeOperation = "destination-out";
    tailCtx.fillStyle = `rgba(0,0,0,${CONFIG.trail.fade})`;
    tailCtx.fillRect(0, 0, tailCanvas.width, tailCanvas.height);
    tailCtx.globalCompositeOperation = "source-over";

    // 3) Фоновые звёзды на главный холст
    ctx.globalCompositeOperation = "lighter";
    ctx.drawImage(bgCanvas, 0, 0);
    ctx.globalCompositeOperation = "source-over";

    // 4) Спавн
    if (!lastSpawn) lastSpawn = ts;
    if (ts - lastSpawn > CONFIG.spawnEveryMs) {
      spawnComet();
      lastSpawn = ts;
    }

    // 5) Кометы: хвост рисуем на tailCtx, «голову» — на ctx
    for (let i = comets.length - 1; i >= 0; i--) {
      const c = comets[i];

      c.x += c.vx;
      c.y += c.vy;

      const speedLen = Math.hypot(c.vx, c.vy) || 1;
      const tx = c.x - (c.vx / speedLen) * c.length;
      const ty = c.y - (c.vy / speedLen) * c.length;

      // хвост (на tailCtx)
      const grad = tailCtx.createLinearGradient(c.x, c.y, tx, ty);
      grad.addColorStop(0, `hsla(${c.hue}, ${c.sat}%, ${c.light}%, 0.9)`);
      grad.addColorStop(1, `hsla(${c.hue}, ${c.sat}%, ${c.light}%, 0)`);
      tailCtx.lineWidth = c.width;
      tailCtx.lineCap = "round";
      tailCtx.strokeStyle = grad;
      tailCtx.lineWidth = c.width * 0.9;
      tailCtx.beginPath();
      tailCtx.moveTo(c.x, c.y);
      tailCtx.lineTo(tx, ty);
      tailCtx.stroke();

      // голова (на ctx)
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.shadowColor = `hsla(${c.hue}, ${c.sat}%, ${c.light}%, 0.8)`;
      ctx.shadowBlur = 12;
      ctx.fillStyle = `hsla(${c.hue}, ${c.sat}%, ${c.light}%, 0.95)`;
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.width * 1.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      const out = c.x < -c.length - 60 || c.x > canvas.clientWidth + c.length + 60 ||
                  c.y < -c.length - 60 || c.y > canvas.clientHeight + c.length + 60;
      if (out) comets.splice(i, 1);
    }

    // 6) Подмешиваем хвосты на главный холст с лёгким блюром
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.filter = `blur(${CONFIG.trail.blur}px)`;
    ctx.drawImage(tailCanvas, 0, 0);
    ctx.filter = "none";
    ctx.restore();

    requestAnimationFrame(renderFrame);
  }

  // первый кадр
  ctx.fillStyle = "rgba(0,0,0,1)";
  ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
  requestAnimationFrame(renderFrame);

  // reduce motion
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  function onMotionChange() {
    canvas.style.display = media.matches ? "none" : "block";
  }
  media.addEventListener?.("change", onMotionChange);
  onMotionChange();
});
