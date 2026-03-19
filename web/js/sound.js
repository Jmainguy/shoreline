// Lofi ocean wave audio — served from embedded binary, loops seamlessly.
const Sound = (function () {
  "use strict";

  let audio = null;
  let muted = true;
  let volume = 70; // 0–100

  function getAudio() {
    if (audio) return audio;
    audio = new Audio();
    audio.loop = true;
    audio.preload = "auto";

    // OGG Opus preferred (smaller); MP3 as fallback for Safari
    const src = document.createElement("source");
    src.type = "audio/ogg; codecs=opus";
    src.src = "/data/waves.ogg";
    audio.appendChild(src);

    const src2 = document.createElement("source");
    src2.type = "audio/mpeg";
    src2.src = "/data/waves.mp3";
    audio.appendChild(src2);

    audio.volume = volume / 100;
    audio.muted = true;
    return audio;
  }

  function applyVolume() {
    if (audio) audio.volume = volume / 100;
  }

  function updateBtn() {
    const btn = document.getElementById("sound-btn");
    if (btn) {
      btn.textContent = muted ? "Sound off" : "Sound on";
      btn.setAttribute("aria-label", muted ? "Turn sound on" : "Turn sound off");
    }
  }

  function setMute(m) {
    muted = m;
    const a = getAudio();
    a.muted = muted;
    if (!muted) {
      applyVolume();
      a.play().catch(() => {});
    }
    updateBtn();
  }

  function toggleMute() {
    muted = !muted;
    setMute(muted);
    return muted;
  }

  function isMuted() {
    return muted;
  }

  function start() {
    const a = getAudio();
    a.play().catch(() => {});
    setMute(muted);
  }

  const btn = document.getElementById("sound-btn");
  if (btn) {
    btn.addEventListener("click", function () {
      start();
      toggleMute();
    });
  }

  const slider = document.getElementById("volume-slider");
  if (slider) {
    volume = Math.max(0, Math.min(100, Number(slider.value) || 70));
    slider.value = volume;
    slider.addEventListener("input", function () {
      volume = Math.max(0, Math.min(100, Number(slider.value)));
      applyVolume();
    });
  }

  window.Sound = { start, setMute, toggleMute, isMuted, updateBtn };
  return { start, setMute, toggleMute, isMuted, updateBtn };
})();
