// Happy Blocks — when running as the iOS/Android app (Capacitor): status bar, haptics, Android back
// button, and share links that point at the public web address. In a browser this does nothing.
const Native = (() => {
  const C = window.Capacitor;
  const app = !!(C && C.isNativePlatform && C.isNativePlatform());
  const P = (app && C.Plugins) || {};
  const WEB = 'https://happyblocks-game.web.app/';
  // Live updates: the newest game files, published by the GitHub build (see APPS.md).
  const UPDATE = 'https://github.com/woleywa/Unblock-it/releases/download/app-web/update.json';
  const quiet = pr => pr && pr.catch && pr.catch(() => {});
  if (app) {
    document.documentElement.classList.add('native');
    if (P.CapacitorUpdater) {
      // This copy of the game started fine: keep it (otherwise the app rolls back to the last good one).
      quiet(P.CapacitorUpdater.notifyAppReady());
      setTimeout(() => checkForUpdate().catch(() => {}), 3000);
      // Coming back to the app (people rarely close it fully) also checks.
      if (P.App) P.App.addListener('appStateChange', s => { if (s.isActive && !ready) checkForUpdate().catch(() => {}); });
    }
    // Light text on the dark sky.
    if (P.StatusBar) {
      quiet(P.StatusBar.setStyle({ style: 'DARK' }));
      if (C.getPlatform() === 'android') { quiet(P.StatusBar.setOverlaysWebView({ overlay: false })); quiet(P.StatusBar.setBackgroundColor({ color: '#2a1f73' })); }
    }
    // Android back: close a card, else the screen's own back button, else leave the app.
    if (P.App) P.App.addListener('backButton', () => {
      for (const [card, btn] of [['acct', 'acct-close'], ['name-modal', 'name-cancel'], ['new-ch', 'new-ch-cancel'], ['timeup', 'timeup-ok']])
        if (!document.getElementById(card).hidden) { document.getElementById(btn).click(); return; }
      const screen = document.querySelector('.screen:not([hidden])');
      const back = screen && screen.querySelector('.bar .icon');
      if (screen && screen.id !== 'home' && back) back.click(); else quiet(P.App.exitApp());
    });
  }
  // A newer game on GitHub? Download it quietly; it's used from the next time the app opens (or right
  // away with now = true). What happened is kept in localStorage so the privacy page can show it.
  const LOG = 'unblock_update';
  let ready = null; // a downloaded update waiting to be switched to
  const note = o => { const v = { at: Date.now(), ...o }; try { localStorage.setItem(LOG, JSON.stringify(v)); } catch (e) {} return v; };
  // GitHub serves the file as a generic download, so the native HTTP call may hand it back base64-encoded.
  const readJson = d => {
    if (d && typeof d === 'object') return d;
    try { return JSON.parse(d); } catch (e) { return JSON.parse(atob(String(d).replace(/\s/g, ''))); }
  };
  async function checkForUpdate(now) {
    const U = P.CapacitorUpdater;
    if (!app || !U) return note({ state: 'Not the app' });
    let mine = { build: '?' };
    try {
      mine = await (await fetch('version.json', { cache: 'no-store' })).json();
      const res = await C.Plugins.CapacitorHttp.get({ url: `${UPDATE}?t=${Date.now()}`, responseType: 'text' });
      if (res.status && res.status >= 400) throw new Error(`update file: HTTP ${res.status}`);
      const u = readJson(res.data);
      if (!u || !(u.build > mine.build)) return note({ mine: mine.build, latest: u && u.build, state: 'Up to date' });
      const info = P.App ? await P.App.getInfo() : { build: '1' };
      if ((+info.build || 1) < u.minNative) return note({ mine: mine.build, latest: u.build, state: 'Needs a newer app from the store' });
      const version = String(u.build);
      const have = ((await U.list()).bundles || []).find(b => b.version === version && b.status !== 'error');
      const bundle = have || await U.download({ url: u.url, version, checksum: u.checksum || '' });
      if (now) { note({ mine: mine.build, latest: u.build, state: 'Restarting with the new version…' }); await U.set({ id: bundle.id }); return; }
      await U.next({ id: bundle.id });
      ready = bundle.id;
      window.dispatchEvent(new CustomEvent('update-ready', { detail: { build: u.build } }));
      return note({ mine: mine.build, latest: u.build, state: 'Downloaded — used next time the app opens' });
    } catch (e) {
      console.warn('update check failed', e);
      return note({ mine: mine.build, state: 'Failed: ' + (e && e.message || e) });
    }
  }

  return {
    app,
    // A little tap in the hand when a block goes out.
    buzz() {
      if (app && P.Haptics) quiet(P.Haptics.impact({ style: 'LIGHT' }));
      else if (navigator.vibrate) navigator.vibrate(12);
    },
    // The address to put in invite links (the app's own address only works inside the app).
    webBase: () => app ? WEB : location.origin + location.pathname,
    checkForUpdate,
    // Switch to the downloaded update now (reloads the game).
    applyUpdate: () => ready && P.CapacitorUpdater ? quiet(P.CapacitorUpdater.set({ id: ready })) : null,
    lastUpdateCheck: () => { try { return JSON.parse(localStorage.getItem(LOG) || 'null'); } catch (e) { return null; } },
  };
})();
