// Stream ambient audio from YouTube. Playback remains opt-in, but the muted
// player is prepared early so Chrome can honor the user's first click reliably.
const Sound = (function () {
  "use strict";
  const LIVESTREAM_ID = "Thtj8Ht7Z_c";
  let player = null;
  let playerReady = false;
  let muted = true;
  let desiredMuted = true;
  let volume = 70;
  let apiPromise = null;

  function updateBtn(message) {
    const btn = document.getElementById("sound-btn");
    if (!btn) return;
    btn.textContent = message || (!playerReady ? "Loading audio…" : (muted ? "Sound off" : "Sound on"));
    btn.setAttribute("aria-label", muted ? "Turn sound on" : "Turn sound off");
    btn.setAttribute("aria-pressed", String(!muted));
  }

  function loadAPI() {
    if (window.YT && window.YT.Player) return Promise.resolve();
    if (apiPromise) return apiPromise;
    apiPromise = new Promise(function (resolve, reject) {
      const previousReady = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = function () {
        if (typeof previousReady === "function") previousReady();
        resolve();
      };
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      script.onerror = function () { reject(new Error("YouTube audio failed to load")); };
      document.head.appendChild(script);
    });
    return apiPromise;
  }

  function applyState() {
    if (!playerReady || !player) return;
    try {
      player.setVolume(volume);
      if (desiredMuted) {
        player.mute();
      } else {
        player.playVideo();
        player.unMute();
      }
      muted = desiredMuted;
      updateBtn();
    } catch (error) {
      updateBtn("Sound unavailable");
    }
  }

  function ensurePlayer() {
    if (player) return Promise.resolve(player);
    return loadAPI().then(function () {
      return new Promise(function (resolve, reject) {
        player = new window.YT.Player("yt-audio", {
          width: 1,
          height: 1,
          videoId: LIVESTREAM_ID,
          playerVars: {
            autoplay: 1,
            mute: 1,
            controls: 0,
            disablekb: 1,
            fs: 0,
            rel: 0,
            iv_load_policy: 3,
            playsinline: 1,
            origin: window.location.origin,
          },
          events: {
            onReady: function (event) {
              playerReady = true;
              const button = document.getElementById("sound-btn");
              if (button) button.disabled = false;
              event.target.mute();
              event.target.playVideo();
              applyState();
              resolve(player);
            },
            onError: function () {
              playerReady = false;
              const button = document.getElementById("sound-btn");
              if (button) button.disabled = true;
              updateBtn("Sound unavailable");
              reject(new Error("YouTube audio is unavailable"));
            },
          },
        });
      });
    });
  }

  function setMute(value) {
    desiredMuted = Boolean(value);
    muted = desiredMuted;
    updateBtn();
    return ensurePlayer().then(function () {
      applyState();
      return muted;
    }).catch(function () {
      muted = true;
      desiredMuted = true;
      updateBtn("Sound unavailable");
      return muted;
    });
  }

  function toggleMute() { return setMute(!desiredMuted); }
  function isMuted() { return muted; }
  function start() {
    return ensurePlayer().then(applyState).catch(function () {
      updateBtn("Sound unavailable");
    });
  }

  const btn = document.getElementById("sound-btn");
  if (btn) {
    btn.addEventListener("click", function () {
      updateBtn("Loading…");
      toggleMute();
    });
  }

  const slider = document.getElementById("volume-slider");
  if (slider) {
    volume = Math.max(0, Math.min(100, Number(slider.value) || 70));
    slider.addEventListener("input", function () {
      volume = Math.max(0, Math.min(100, Number(slider.value)));
      if (playerReady) player.setVolume(volume);
    });
  }

  // Muted autoplay is permitted by Chrome and readies the player before use.
  loadAPI().then(ensurePlayer).catch(function () {});
  updateBtn();

  window.Sound = { start, setMute, toggleMute, isMuted, updateBtn };
  return window.Sound;
})();
