(function () {
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  let startTime = null;

  function reducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
  }

  function tick() {
    if (startTime === null) startTime = performance.now();
    const time = (performance.now() - startTime) / 1000;
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const CYCLE_SECONDS = 15 * 60; // 15 min real == 24 hours
    const dayProgress = (time % CYCLE_SECONDS) / CYCLE_SECONDS;
    const hourOfDay = dayProgress * 24;
    const options = {
      reducedMotion: reducedMotion(),
      dayProgress,
      hourOfDay,
    };
    if (typeof Scene !== 'undefined' && Scene.draw) {
      Scene.draw(ctx, time, w, h, options);
    }

    requestAnimationFrame(tick);
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'f' || e.key === 'F') {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(function () {});
      } else {
        document.exitFullscreen().catch(function () {});
      }
    }
    var hint = document.getElementById('hint');
    if (hint && !hint.classList.contains('hidden')) hint.classList.add('hidden');
  });
  setTimeout(function () {
    var hint = document.getElementById('hint');
    if (hint) hint.classList.add('hidden');
  }, 6000);

  window.addEventListener('resize', resize);
  resize();

  // Start animation only after crater data is settled so craters don't pop in when fetch completes
  var craterLoad = typeof MoonCratersData !== 'undefined' && MoonCratersData.load
    ? MoonCratersData.load('/data/lunar-craters.json').catch(function () {})
    : Promise.resolve();
  craterLoad.then(function () {
    if (startTime === null) {
      var params = new URLSearchParams(window.location.search);
      var cycleSec = 15 * 60;
      if (params.has('day')) {
        startTime = performance.now() - 0.5 * cycleSec * 1000;
      } else if (params.has('night')) {
        startTime = performance.now() - (22 / 24) * cycleSec * 1000;
      } else if (params.has('sunrise')) {
        startTime = performance.now() - (5.7 / 24) * cycleSec * 1000;
      } else if (params.get('sunset') !== null) {
        startTime = performance.now() - (17.25 / 24) * cycleSec * 1000;
      } else {
        startTime = performance.now();
      }
    }
    requestAnimationFrame(tick);
  });
})();
