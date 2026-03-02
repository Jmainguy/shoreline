// Seagulls: flight, landing, standing, takeoff. Procedural timing per bird.
const Seagulls = (function () {
  const horizonRatio = 0.55;
  const CYCLE = 52;
  const FLY_END = 28;   // then landing
  const LAND_END = 31;  // then standing
  const STAND_END = 39; // then takeoff
  const TAKEOFF_END = 42;

  function makeBird(options) {
    const {
      startY = 0.22,
      speed = 55,
      phase = 0,
      flapSpeed = 8,
      flapPhase = 0,
      bobAmplitude = 6,
      bobFreq = 1.5,
      size = 1,
      perchNormX = 0.25, // 0–1
    } = options || {};
    return {
      startY,
      speed,
      phase,
      flapSpeed,
      flapPhase,
      bobAmplitude,
      bobFreq,
      size,
      perchNormX,
    };
  }

  const birds = [
    makeBird({ startY: 0.22, speed: 55, phase: 0, perchNormX: 0.22, size: 1 }),
    makeBird({ startY: 0.32, speed: 48, phase: 7, perchNormX: 0.65, size: 0.85 }),
    makeBird({ startY: 0.28, speed: 52, phase: 14, perchNormX: 0.48, size: 0.9 }),
  ];

  function flightPos(bird, time, width, height) {
    const horizonY = height * horizonRatio;
    const x = ((time * bird.speed + bird.phase * 120) % (width + 80)) - 40;
    const yBase = horizonY * bird.startY;
    const bob = Math.sin(time * bird.bobFreq + bird.phase * 2) * bird.bobAmplitude;
    const y = yBase + bob;
    return { x, y };
  }

  function getPerch(bird, width, height) {
    const shoreY = height * 0.88;
    return {
      x: width * bird.perchNormX,
      y: shoreY + 8,
    };
  }

  function getState(bird, time) {
    const t = (time + bird.phase) % CYCLE;
    if (t < FLY_END) return { state: 'flying' };
    if (t < LAND_END) return { state: 'landing', progress: (t - FLY_END) / (LAND_END - FLY_END) };
    if (t < STAND_END) return { state: 'standing' };
    if (t < TAKEOFF_END) return { state: 'takeoff', progress: (t - STAND_END) / (TAKEOFF_END - STAND_END) };
    return { state: 'flying' };
  }

  function drawBird(ctx, x, y, time, bird, wingsFolded) {
    const s = bird.size * 8;
    const flap = wingsFolded ? 0 : Math.sin(time * bird.flapSpeed + bird.flapPhase) * 0.4;
    const wingAngle = flap * Math.PI * 0.4;
    ctx.save();
    ctx.translate(x, y);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
    ctx.strokeStyle = 'rgba(200, 200, 200, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.6, s * 1.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    if (wingsFolded) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-s * 0.5, s * 0.2);
      ctx.lineTo(s * 0.5, s * 0.2);
      ctx.stroke();
    } else {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-s * 0.3, 0);
      ctx.quadraticCurveTo(-s * 1.2 - Math.sin(wingAngle) * s * 0.5, -s * 0.3, -s * 1.5, -s * 0.2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(s * 0.3, 0);
      ctx.quadraticCurveTo(s * 1.2 + Math.sin(wingAngle) * s * 0.5, -s * 0.3, s * 1.5, -s * 0.2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function draw(ctx, time, width, height, options) {
    options = options || {};
    const hourOfDay = options.hourOfDay != null ? options.hourOfDay : 12;
    const dayStr = typeof Utils !== "undefined" && Utils.dayStrength ? Utils.dayStrength(hourOfDay) : 1;
    if (dayStr <= 0.002) return;

    const lowMotion = options.reducedMotion;
    const horizonY = height * horizonRatio;
    const list = lowMotion ? birds.slice(0, 1) : birds;

    ctx.save();
    ctx.globalAlpha = dayStr;

    list.forEach((bird) => {
      const st = getState(bird, time);
      const perch = getPerch(bird, width, height);

      let x, y;
      let wingsFolded = false;

      if (st.state === 'flying') {
        const p = flightPos(bird, time, width, height);
        x = p.x;
        y = p.y;
      } else if (st.state === 'landing') {
        // Lerp from *current* flight position so we leave the path smoothly (no snap)
        const startPos = flightPos(bird, time, width, height);
        const t = st.progress;
        const ease = t * t * (3 - 2 * t);
        x = startPos.x + (perch.x - startPos.x) * ease;
        y = startPos.y + (perch.y - startPos.y) * ease;
        if (t > 0.7) wingsFolded = true;
      } else if (st.state === 'standing') {
        x = perch.x;
        y = perch.y;
        wingsFolded = true;
      } else {
        // takeoff: lerp toward *current* flight position so we join the path smoothly (no snap)
        const endPos = flightPos(bird, time, width, height);
        const t = st.progress;
        const ease = t * t * (3 - 2 * t);
        x = perch.x + (endPos.x - perch.x) * ease;
        y = perch.y + (endPos.y - perch.y) * ease;
        if (t < 0.3) wingsFolded = true;
      }

      if (x >= -30 && x <= width + 30 && y >= -20 && y <= height + 20) {
        drawBird(ctx, x, y, time, bird, wingsFolded);
      }
    });

    ctx.restore();
  }

  return { draw, makeBird };
})();
