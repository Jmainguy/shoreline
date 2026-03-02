// Draw order: sky → sand → ocean → birds
const Scene = (function () {
  function draw(ctx, time, width, height, options) {
    options = options || {};
    if (typeof Sky !== 'undefined' && Sky.draw) Sky.draw(ctx, time, width, height, options);
    if (typeof Sand !== 'undefined' && Sand.draw) Sand.draw(ctx, time, width, height, options);
    if (typeof Ocean !== 'undefined' && Ocean.draw) Ocean.draw(ctx, time, width, height, options);
    if (typeof Seagulls !== 'undefined' && Seagulls.draw) Seagulls.draw(ctx, time, width, height, options);
  }
  return { draw };
})();
