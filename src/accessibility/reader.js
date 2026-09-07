/* Accessibility helpers kept separate from gameplay. */
(function (global) {
  "use strict";
  global.GeonAccessibility = {
    announce(message) {
      const live = document.getElementById("globalLiveRegion");
      if (live) { live.textContent = ""; requestAnimationFrame(() => { live.textContent = String(message || ""); }); }
    }
  };
})(window);
