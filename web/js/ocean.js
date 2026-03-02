// Ocean: waves (analytic + Gerstner), Fresnel/sun reflection, foam. Uses oceanMath, oceanDataLoader, oceanRenderer.
const Ocean = (function () {
  function draw(ctx, time, width, height, options) {
    if (
      typeof OceanMath !== "undefined" &&
      typeof OceanDataLoader !== "undefined" &&
      typeof OceanRenderer !== "undefined" &&
      OceanRenderer.draw
    ) {
      OceanRenderer.draw(ctx, time, width, height, options);
      return;
    }
    // Fallback: minimal draw if new modules not loaded
    const horizonY =
      typeof Sky !== "undefined" && Sky.getHorizonY ? Sky.getHorizonY(height) : height * 0.55;
    const shoreY = height * 0.88;
    const grad = ctx.createLinearGradient(0, horizonY, 0, height);
    grad.addColorStop(0, "#2E5E7C");
    grad.addColorStop(1, "#7BB8CE");
    ctx.fillStyle = grad;
    ctx.fillRect(0, horizonY, width, height - horizonY);
  }

  return { draw };
})();
