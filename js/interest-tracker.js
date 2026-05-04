// Behavioral interest tracker. Listens to gallery:open/close/photo events,
// maintains a per-model interest score in localStorage, and dispatches
// `interest:trigger` when the score crosses CONFIG.TRIGGER_THRESHOLD.
// See docs/superpowers/specs/2026-05-04-interest-popup-design.md.

(function () {
  'use strict';

  const STORAGE_KEY = 'gp_interest_v1';
  const SESSION_KEY = 'gp_interest_shown_session';
  const DAY_MS = 24 * 60 * 60 * 1000;

  const CONFIG = {
    TRIGGER_THRESHOLD: 10,
    DISMISS_PAUSE_DAYS: 7,
    IDLE_AFTER_MS: 15000,
    WEIGHTS: {
      secondActive: 0.2,
      photoView: 1.5,
      secondOpen: 3,
      nthOpen: 5,
      lastPhoto: 2
    },
    CAPS: {
      secondsPerOpen: 8,
      photosPerOpen: 6
    }
  };

  function emptyState() {
    return {
      scores: {},
      opens: {},
      photosViewed: {},
      lastPhotoAwarded: {},
      triggered: {},
      dismissed: {},
      submitted: {}
    };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return emptyState();
      return Object.assign(emptyState(), JSON.parse(raw));
    } catch (e) {
      return emptyState();
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      // localStorage unavailable (private mode, quota): keep going in-memory.
    }
  }

  let state = loadState();

  // Per-open accumulators (reset on every gallery:open)
  let currentId = null;
  let currentName = '';
  let openSecondsAccrued = 0;
  let openPhotoBalanceAccrued = 0;

  // Activity detection
  let lastActivity = Date.now();
  let activityTimer = null;

  function bumpActivity() { lastActivity = Date.now(); }

  function isActiveNow() {
    if (document.visibilityState !== 'visible') return false;
    if (typeof document.hasFocus === 'function' && !document.hasFocus()) return false;
    if (Date.now() - lastActivity > CONFIG.IDLE_AFTER_MS) return false;
    return true;
  }

  function startActivityTimer() {
    if (activityTimer) return;
    activityTimer = setInterval(activityTick, 1000);
  }

  function stopActivityTimer() {
    if (activityTimer) {
      clearInterval(activityTimer);
      activityTimer = null;
    }
  }

  function activityTick() {
    if (!currentId) return;
    if (!isActiveNow()) return;
    if (openSecondsAccrued >= CONFIG.CAPS.secondsPerOpen) return;
    const remaining = CONFIG.CAPS.secondsPerOpen - openSecondsAccrued;
    const inc = Math.min(CONFIG.WEIGHTS.secondActive, remaining);
    addScore(currentId, inc);
    openSecondsAccrued += inc;
    saveState();
    maybeTrigger(currentId, currentName);
  }

  function addScore(id, delta) {
    state.scores[id] = (state.scores[id] || 0) + delta;
  }

  function maybeTrigger(id, name) {
    if (!id) return;
    if (state.submitted[id]) return;
    const dismissedAt = state.dismissed[id];
    if (dismissedAt && Date.now() - dismissedAt < CONFIG.DISMISS_PAUSE_DAYS * DAY_MS) return;
    if ((state.scores[id] || 0) < CONFIG.TRIGGER_THRESHOLD) return;
    try {
      if (sessionStorage.getItem(SESSION_KEY) === '1') return;
      sessionStorage.setItem(SESSION_KEY, '1');
    } catch (e) {
      // sessionStorage unavailable; treat as "not shown yet" — let it fire.
    }
    state.triggered[id] = Date.now();
    saveState();
    document.dispatchEvent(new CustomEvent('interest:trigger', {
      detail: { id: id, name: name }
    }));
  }

  document.addEventListener('gallery:open', function (e) {
    const detail = e.detail || {};
    const id = detail.id;
    if (!id) return;
    currentId = id;
    currentName = detail.name || '';
    openSecondsAccrued = 0;
    openPhotoBalanceAccrued = 0;
    lastActivity = Date.now();

    state.opens[id] = (state.opens[id] || 0) + 1;
    if (state.opens[id] === 2) {
      addScore(id, CONFIG.WEIGHTS.secondOpen);
    } else if (state.opens[id] >= 3) {
      addScore(id, CONFIG.WEIGHTS.nthOpen);
    }
    saveState();
    startActivityTimer();
    maybeTrigger(id, currentName);
  });

  document.addEventListener('gallery:close', function () {
    stopActivityTimer();
    currentId = null;
    currentName = '';
    openSecondsAccrued = 0;
    openPhotoBalanceAccrued = 0;
  });

  document.addEventListener('gallery:photo', function (e) {
    const detail = e.detail || {};
    const id = detail.id;
    if (!id || id !== currentId) return;
    const url = detail.url;
    const index = detail.index;
    const total = detail.total;

    if (url) {
      const seen = state.photosViewed[id] || [];
      if (seen.indexOf(url) === -1) {
        seen.push(url);
        state.photosViewed[id] = seen;
        if (openPhotoBalanceAccrued < CONFIG.CAPS.photosPerOpen) {
          const remaining = CONFIG.CAPS.photosPerOpen - openPhotoBalanceAccrued;
          const inc = Math.min(CONFIG.WEIGHTS.photoView, remaining);
          addScore(id, inc);
          openPhotoBalanceAccrued += inc;
        }
      }
    }

    if (typeof index === 'number' && typeof total === 'number' && total > 0 && index === total - 1) {
      if (!state.lastPhotoAwarded[id]) {
        addScore(id, CONFIG.WEIGHTS.lastPhoto);
        state.lastPhotoAwarded[id] = Date.now();
      }
    }

    saveState();
    maybeTrigger(id, currentName);
  });

  ['mousemove', 'keydown', 'touchmove', 'scroll', 'click'].forEach(function (ev) {
    document.addEventListener(ev, bumpActivity, { passive: true });
  });

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') bumpActivity();
  });

  window.InterestTracker = {
    markDismissed: function (id) {
      if (!id) return;
      state.dismissed[id] = Date.now();
      saveState();
    },
    markSubmitted: function (id) {
      if (!id) return;
      state.submitted[id] = Date.now();
      saveState();
    },
    getSnapshot: function (id) {
      return {
        score: state.scores[id] || 0,
        opens: state.opens[id] || 0,
        photosViewed: (state.photosViewed[id] || []).length,
        activeSeconds: openSecondsAccrued > 0
          ? Math.round(openSecondsAccrued / CONFIG.WEIGHTS.secondActive)
          : 0,
        triggeredAt: state.triggered[id] || null
      };
    },
    _state: function () { return state; },
    _config: CONFIG,
    _reset: function () {
      state = emptyState();
      saveState();
      try { sessionStorage.removeItem(SESSION_KEY); } catch (e) {}
    }
  };
})();
