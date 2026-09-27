// Unblock It — online: nickname sign-in (Firebase anonymous auth) and leaderboards (Firestore).
// The game works without this; window.Online appears once Firebase has loaded.
//
// Data (see firestore.rules):
//   names/{nickname lowercased}   { uid, name, created }               — one owner per nickname
//   players/{uid}                 { name, stars, moves, levels, score, best, updated }
//                                  score = stars × 100000 − moves (one field, so it sorts on its own)
//   levels/{level}/runs/{uid}     { name, moves, updated }              — each player's best per level
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {
  getFirestore, doc, getDoc, writeBatch, setDoc, collection, query, orderBy, limit, getDocs,
  where, getCountFromServer, serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'AIzaSyAgZBn0sOd4E34DuygOHt1KhslHIsUz1eA',
  authDomain: 'unblock-it-913f7.firebaseapp.com',
  projectId: 'unblock-it-913f7',
  storageBucket: 'unblock-it-913f7.firebasestorage.app',
  messagingSenderId: '715328819949',
  appId: '1:715328819949:web:b4602d68680498210072e4',
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const NAME_RE = /^[A-Za-z0-9 _.-]{3,16}$/;
let uid = null, me = null; // me = this player's doc (or null before a nickname is chosen)

// Signed in anonymously as soon as possible; the device keeps the account.
const ready = new Promise(resolve => {
  onAuthStateChanged(auth, async user => {
    if (!user) { signInAnonymously(auth).catch(e => { console.warn('sign-in failed', e); resolve(false); }); return; }
    uid = user.uid;
    try { const s = await getDoc(doc(db, 'players', uid)); me = s.exists() ? s.data() : null; } catch (e) { console.warn(e); }
    resolve(true);
  });
});

const clean = n => (n || '').trim().replace(/\s+/g, ' ');

async function setName(raw, totals) {
  await ready;
  const name = clean(raw);
  if (!NAME_RE.test(name)) throw new Error('Use 3–16 letters, numbers, spaces, _ . or -');
  const key = name.toLowerCase();
  const taken = await getDoc(doc(db, 'names', key));
  if (taken.exists() && taken.data().uid !== uid) throw new Error('That name is taken — try another');
  const b = writeBatch(db);
  if (!taken.exists()) b.set(doc(db, 'names', key), { uid, name, created: serverTimestamp() });
  // Changing names frees the old one.
  if (me && me.name && me.name.toLowerCase() !== key) b.delete(doc(db, 'names', me.name.toLowerCase()));
  const data = { name, ...totals, score: totals.stars * 100000 - totals.moves, updated: serverTimestamp() };
  b.set(doc(db, 'players', uid), data);
  await b.commit();
  me = data;
  return name;
}

// Save totals and, if better, this level's run.
async function submit(level, moves, totals) {
  await ready;
  if (!me) return;
  const data = { name: me.name, ...totals, score: totals.stars * 100000 - totals.moves, updated: serverTimestamp() };
  await setDoc(doc(db, 'players', uid), data);
  me = data;
  if (level == null) return;
  const runRef = doc(db, 'levels', String(level), 'runs', uid);
  const old = await getDoc(runRef);
  if (!old.exists() || moves < old.data().moves || old.data().name !== me.name)
    await setDoc(runRef, { name: me.name, moves: old.exists() ? Math.min(moves, old.data().moves) : moves, updated: serverTimestamp() });
}

async function top(n = 50) {
  await ready;
  const snap = await getDocs(query(collection(db, 'players'), orderBy('score', 'desc'), limit(n)));
  return snap.docs.map(d => ({ uid: d.id, ...d.data(), mine: d.id === uid }));
}

async function myRank() {
  await ready;
  if (!me) return null;
  const c = await getCountFromServer(query(collection(db, 'players'), where('score', '>', me.score)));
  return c.data().count + 1;
}

async function levelTop(level, n = 3) {
  await ready;
  const snap = await getDocs(query(collection(db, 'levels', String(level), 'runs'), orderBy('moves'), limit(n)));
  return snap.docs.map(d => ({ ...d.data(), mine: d.id === uid }));
}

window.Online = { ready, setName, submit, top, myRank, levelTop, get name() { return me && me.name; } };
window.dispatchEvent(new Event('online-ready'));
