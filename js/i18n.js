// Happy Blocks — languages. The game is written in English; other languages are dictionaries keyed by
// the English text (js/i18n-de.js, js/i18n-story-de.js). Text that reaches the page is translated as
// it appears (a MutationObserver), so most code needs no changes. T(s) is for text that never reaches
// the page as-is (share messages, story lines typed letter by letter). RX rules cover text with
// numbers or names in it ("12 moves · par 9").
const LANGS = { en: '🇬🇧 English', de: '🇩🇪 Deutsch' };
const DE = {}, DE_RX = [];
let LANG = 'en';
try { LANG = localStorage.getItem('unblock_lang') || ((navigator.language || '').toLowerCase().startsWith('de') ? 'de' : 'en'); } catch (e) {}
if (!LANGS[LANG]) LANG = 'en';
document.documentElement.lang = LANG;

function T(s) {
  if (LANG === 'en' || typeof s !== 'string') return s;
  const k = s.trim();
  if (!k) return s;
  let r = DE[k];
  if (r == null) for (const [re, to] of DE_RX) if (re.test(k)) { r = k.replace(re, typeof to === 'function' ? to : (...m) => to.replace(/\$(\d)/g, (_, i) => T(m[i] ?? ''))); break; }
  return r == null ? s : s.replace(k, r);
}
function setLang(l) { try { localStorage.setItem('unblock_lang', l); } catch (e) {} location.reload(); }

(() => {
  if (LANG === 'en') return;
  const ATTRS = ['placeholder', 'aria-label', 'title'];
  const skip = el => el.closest('svg, [translate="no"], script, style');
  function tr(n) {
    if (n.nodeType === 3) {
      if (!n.parentElement || skip(n.parentElement)) return;
      const t = T(n.data); if (t !== n.data) n.data = t;
    } else if (n.nodeType === 1) {
      if (skip(n)) return;
      for (const a of ATTRS) { const v = n.getAttribute(a); if (v) { const t = T(v); if (t !== v) n.setAttribute(a, t); } }
      for (const c of n.childNodes) tr(c);
    }
  }
  const go = () => {
    document.title = T(document.title);
    tr(document.body);
    new MutationObserver(ms => { for (const m of ms) if (m.type === 'childList') m.addedNodes.forEach(tr); else tr(m.target); })
      .observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  };
  // After every script has run, so the dictionaries (loaded after this file) are there.
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
})();
