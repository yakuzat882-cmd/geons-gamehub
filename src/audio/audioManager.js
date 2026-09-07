/* Single-owner audio controller. */
(function (global) {
  "use strict";
  const ids = {
    motto: "mottoMusic", home: "homeMusic", game: "gameMusic", victory: "victoryMusic",
    click: "clickSound", correct: "correctSound", wrong: "wrongSound"
  };
  const volumes = { motto: .45, home: .45, game: .45, victory: .55 };
  class AudioManager {
    constructor() { this.musicEnabled = true; this.soundEnabled = true; this.activeMusic = null; }
    el(name) { return document.getElementById(ids[name] || name); }
    stopAllMusic() {
      ["motto","home","game","victory"].forEach(name => {
        const audio = this.el(name);
        if (audio) { audio.pause(); audio.currentTime = 0; }
      });
      this.activeMusic = null;
    }
    playMusic(name) {
      if (!this.musicEnabled) return false;
      const audio = this.el(name);
      if (!audio) return false;
      ["motto","home","game","victory"].forEach(other => {
        if (other !== name) {
          const el = this.el(other);
          if (el) el.pause();
        }
      });
      audio.volume = volumes[name] ?? .45;
      this.activeMusic = name;
      const promise = audio.play();
      if (promise?.catch) promise.catch(() => { /* autoplay is expected to be blocked until gesture */ });
      return true;
    }
    stopMusic(name) {
      const audio = this.el(name);
      if (audio) { audio.pause(); audio.currentTime = 0; }
      if (this.activeMusic === name) this.activeMusic = null;
    }
    playSound(name) {
      if (!this.soundEnabled) return false;
      const audio = this.el(name);
      if (!audio) return false;
      audio.currentTime = 0;
      const promise = audio.play();
      if (promise?.catch) promise.catch(() => {});
      return true;
    }
    setMusicEnabled(enabled) { this.musicEnabled = Boolean(enabled); if (!enabled) this.stopAllMusic(); }
    setSoundEnabled(enabled) { this.soundEnabled = Boolean(enabled); }
  }
  global.audioManager = new AudioManager();
})(window);
