// Happy Blocks — when running as the iOS/Android app (Capacitor): status bar, haptics, Android back
// button, and share links that point at the public web address. In a browser this does nothing.
const Native = (() => {
  const C = window.Capacitor;
  const app = !!(C && C.isNativePlatform && C.isNativePlatform());
  const P = (app && C.Plugins) || {};
  const WEB = 'https://unblock-it-913f7.web.app/';
  // Live updates: the newest game files, published by the GitHub build (see APPS.md).
  const UPDATE = 'https://github.com/woleywa/Unblock-it/releases/download/app-web/update.json';
  const quiet = pr => pr && pr.catch && pr.catch(() => {});
  if (app) {
    document.documentElement.classList.add('native');
    if (P.CapacitorUpdater) {
      // This copy of the game started fine: keep it (otherwise the app rolls back to the last good one).
      quiet(P.CapacitorUpdater.notifyAppReady());
      setTimeout(checkForUpdate, 3000);
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
  // A newer game on GitHub? Download it quietly; it's used from the next time the app opens.
  async function checkForUpdate() {
    try {
      const U = P.CapacitorUpdater;
      const mine = await (await fetch('version.json', { cache: 'no-store' })).json();
      const res = await C.Plugins.CapacitorHttp.get({ url: `${UPDATE}?t=${Date.now()}` });
      const u = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
      if (!u || !(u.build > mine.build)) return;
      const info = P.App ? await P.App.getInfo() : { build: '1' };
      if ((+info.build || 1) < u.minNative) return;   // needs a newer app from the store
      const version = String(u.build);
      const have = ((await U.list()).bundles || []).find(b => b.version === version && b.status !== 'error');
      const bundle = have || await U.download({ url: u.url, version });
      await U.next({ id: bundle.id });
    } catch (e) { console.warn('update check failed', e); }
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
  };
})();
