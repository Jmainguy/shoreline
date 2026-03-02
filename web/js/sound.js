// Stream audio from YouTube livestream (always-on). No procedural audio.
const Sound = (function () {
  "use strict";

  const LIVESTREAM_ID = "Thtj8Ht7Z_c";
  let player = null;
  let muted = true;
  let apiReady = false;
  let volume = 70; // 0–100

  function applyVolume() {
    if (player && player.setVolume) {
      try {
        player.setVolume(volume);
      } catch (e) {}
    }
  }

  function updateBtn() {
    const btn = document.getElementById("sound-btn");
    if (btn) {
      btn.textContent = muted ? "Sound off" : "Sound on";
      btn.setAttribute("aria-label", muted ? "Turn sound on" : "Turn sound off");
    }
  }

  function ensurePlayer(callback) {
    if (player) {
      if (callback) callback();
      return;
    }
    const container = document.getElementById("yt-audio");
    if (!container) {
      if (callback) callback();
      return;
    }
    if (!apiReady) {
      if (callback) setTimeout(function () { ensurePlayer(callback); }, 100);
      return;
    }
    player = new window.YT.Player("yt-audio", {
      width: 1,
      height: 1,
      videoId: LIVESTREAM_ID,
      playerVars: {
        autoplay: 1,
        mute: 1,
        loop: 0,
        controls: 0,
        disablekb: 1,
        fs: 0,
        modestbranding: 1,
        rel: 0,
        showinfo: 0,
        iv_load_policy: 3,
        playsinline: 1,
      },
      events: {
        onReady: function () {
          if (player && player.mute) player.mute();
          if (callback) callback();
        },
      },
    });
  }

  function setMute(m) {
    muted = m;
    if (!player || !player.mute || !player.unMute) return;
    try {
      if (muted) player.mute();
      else {
        applyVolume();
        player.unMute();
      }
    } catch (e) {}
    updateBtn();
  }

  function toggleMute() {
    muted = !muted;
    ensurePlayer(function () {
      setMute(muted);
    });
    return muted;
  }

  function isMuted() {
    return muted;
  }

  function start() {
    ensurePlayer(function () {
      if (player && player.playVideo) player.playVideo();
      setMute(muted);
    });
  }

  window.onYouTubeIframeAPIReady = function () {
    apiReady = true;
  };

  const btn = document.getElementById("sound-btn");
  if (btn) {
    btn.addEventListener("click", function () {
      ensurePlayer(function () {
        start();
        toggleMute();
      });
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

  document.addEventListener("click", function once() {
    ensurePlayer(function () {});
    document.removeEventListener("click", once);
  }, { once: true });
  document.addEventListener("keydown", function once() {
    ensurePlayer(function () {});
    document.removeEventListener("keydown", once);
  }, { once: true });

  window.Sound = {
    start,
    setMute,
    toggleMute,
    isMuted,
    updateBtn,
  };
  return { start, setMute, toggleMute, isMuted, updateBtn };
})();
