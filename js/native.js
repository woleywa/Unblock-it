// Happy Blocks — when running as the iOS/Android app (Capacitor): status bar, haptics, Android back
// button, and share links that point at the public web address. In a browser this does nothing.
const Native = (() => {
  const C = window.Capacitor;
  const app = !!(C && C.isNativePlatform && C.isNativePlatform());
  const P = (app && C.Plugins) || {};
  const WEB = 'https://woleywa.github.io/Unblock-it/';
  const quiet = pr => pr && pr.catch && pr.catch(() => {});
  if (app) {
    document.documentElement.classList.add('native');
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
