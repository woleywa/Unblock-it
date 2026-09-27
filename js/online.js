// Happy Blocks — online: nickname sign-in (Firebase anonymous auth) and leaderboards (Firestore).
// The game works without this; window.Online appears once Firebase has loaded.
//
// Data (see firestore.rules):
//   names/{nickname lowercased}   { uid, name, created }               — one owner per nickname
//   players/{uid}                 { name, stars, moves, levels, score, best, updated }
//                                  score = stars × 100000 − moves (one field, so it sorts on its own)
//   levels/{level}/runs/{uid}     { name, moves, updated }              — each player's best per level
//   players/{uid}.team            the code of the player's team (optional)
//   teams/{code}                  { name, by, members, stars, created } — stars = members' stars added up
//   challenges/{code}             { by, byName, team, teamName, created, start, window, playMin, levels,
//                                   players, joined, seed }             — window/playMin in minutes, 0 = no limit
//   saves/{uid}                   { stars, moves, friends, updated } — private: progress + friend list
//   help/{id}                     { from, fromName, level, par, to: [uids], created } — "help me with this level"
//   help/{id}/answers/{uid}       { name, moves, steps: [{ p, r, c, g }], created } — a friend's solution
//   challenges/{code}/entries/{uid} { name, team, teamName, started, updated, stars, moves, solved, score, runs }
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {
  initializeAuth, indexedDBLocalPersistence, browserLocalPersistence, inMemoryPersistence, signInAnonymously, onAuthStateChanged, EmailAuthProvider, linkWithCredential,
  signInWithEmailAndPassword, sendPasswordResetEmail, signOut, reauthenticateWithCredential, deleteUser,
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
// Firestore Lite: plain one-off requests, no live stream (nothing for a cache or a sleeping phone
// to hold open), and a much smaller download.
import {
  getFirestore, doc, getDoc, writeBatch, setDoc, collection, query, orderBy, limit, getDocs,
  where, getCount, serverTimestamp, increment, updateDoc, Timestamp, arrayUnion, arrayRemove, documentId, deleteDoc,
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore-lite.js';

const firebaseConfig = {
  apiKey: 'AIzaSyAgZBn0sOd4E34DuygOHt1KhslHIsUz1eA',
  authDomain: 'unblock-it-913f7.firebaseapp.com',
  projectId: 'unblock-it-913f7',
  storageBucket: 'unblock-it-913f7.firebasestorage.app',
  messagingSenderId: '715328819949',
  appId: '1:715328819949:web:b4602d68680498210072e4',
};

const app = initializeApp(firebaseConfig);
// initializeAuth, not getAuth: getAuth also loads Google's pop-up/redirect helper (an iframe from the
// auth domain), which never finishes inside the iOS app's web view — sign-in then hangs forever. We only
// use guest and email/password sign-in, which don't need it.
const auth = initializeAuth(app, { persistence: [indexedDBLocalPersistence, browserLocalPersistence, inMemoryPersistence] });
const db = getFirestore(app);

// Letters of any language, numbers, emoji, spaces and punctuation; counted as the characters you see.
const chars = t => (window.Intl && Intl.Segmenter ? [...new Intl.Segmenter().segment(t)] : [...t]).length;
const okText = (t, min, max) => chars(t) >= min && chars(t) <= max && !/[\/\u0000-\u001f\u007f]/.test(t) && !/^__.*__$/.test(t);
let uid = null, me = null; // me = this player's doc (or null before a nickname is chosen)

// Everyone starts signed in anonymously (a guest account on this device). Adding an email and password
// keeps the same account; signing in with one on another device switches to that account, and the
// game hears 'online-user' to reload what belongs to it.
let account = null, canHint = false, canDev = false, save = null, loading = Promise.resolve(), resolveReady, started = false;
const ready = new Promise(r => { resolveReady = r; });
onAuthStateChanged(auth, user => {
  if (!user) { signInAnonymously(auth).catch(e => { console.warn('sign-in failed', e); resolveReady(false); }); return; }
  uid = user.uid;
  account = user.isAnonymous ? null : user.email;
  me = null; myTeam = null; save = null; canHint = false; canDev = false;
  loading = (async () => {
    try {
      // Hints and developer mode: registered players on the lists in config/hints and config/dev only.
      // The developer flag is also kept in localStorage for pages without online.js (the privacy page).
      const setDev = on => { try { localStorage.setItem('unblock_dev', on ? '1' : '0'); } catch (e) {} };
      if (user.isAnonymous) setDev(false);
      else Promise.all([getDoc(doc(db, 'config', 'hints')), getDoc(doc(db, 'config', 'dev'))]).then(([h, d]) => {
        if (uid !== user.uid) return;
        canHint = h.exists() && (h.data().uids || []).includes(user.uid);
        canDev = d.exists() && (d.data().uids || []).includes(user.uid);
        setDev(canDev);
        window.dispatchEvent(new Event('online-hints'));
      }).catch(e => console.warn(e));
      const [p, v] = await Promise.all([getDoc(doc(db, 'players', uid)), getDoc(doc(db, 'saves', uid))]);
      me = p.exists() ? p.data() : null;
      save = v.exists() ? v.data() : null;
      await loadMyTeam();
    } catch (e) { console.warn(e); }
  })();
  loading.then(() => {
    resolveReady(true);
    if (started) window.dispatchEvent(new Event('online-user'));
    started = true;
  });
});
const settledAs = test => new Promise(r => { const chk = () => (uid && test(uid) ? loading.then(r) : setTimeout(chk, 50)); chk(); });

// ── Account (email + password) ────────────────────────────────
const AUTH_ERR = {
  'auth/email-already-in-use': 'That email already has an account — sign in instead',
  'auth/credential-already-in-use': 'That email already has an account — sign in instead',
  'auth/invalid-email': 'That doesn’t look like an email address',
  'auth/missing-email': 'Type your email address',
  'auth/weak-password': 'Use at least 6 characters for the password',
  'auth/missing-password': 'Type a password',
  'auth/invalid-credential': 'Wrong email or password', 'auth/wrong-password': 'Wrong email or password', 'auth/user-not-found': 'Wrong email or password',
  'auth/too-many-requests': 'Too many tries — wait a minute and try again',
  'auth/network-request-failed': 'Couldn’t reach the server — check your connection',
};
const authCall = async fn => { try { return await fn(); } catch (e) { throw Object.assign(new Error(AUTH_ERR[e.code] || e.message), { code: e.code }); } };
async function createAccount(email, pw) {
  await ready;
  await authCall(() => linkWithCredential(auth.currentUser, EmailAuthProvider.credential(email.trim(), pw)));
  account = auth.currentUser.email;
}
async function signIn(email, pw) {
  await ready;
  const res = await authCall(() => signInWithEmailAndPassword(auth, email.trim(), pw));
  await settledAs(u => u === res.user.uid);
}
async function signOutNow() {
  await ready;
  const old = uid;
  await signOut(auth);
  await settledAs(u => u !== old);
}
// Delete the account and what's stored for it: leaves the team, removes the nickname, the player's
// totals, the private save and their best run on every level; then the login itself.
async function deleteAccount(pw, levelCount) {
  await ready;
  const user = auth.currentUser;
  if (!user) throw new Error('No account to delete');
  // Registered: confirm with the password (Firebase also needs a recent sign-in to delete).
  if (!user.isAnonymous) await authCall(() => reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, pw)));
  if (me && me.team) await moveTo(null, { stars: me.stars, moves: me.moves, levels: me.levels }, false);
  const b = writeBatch(db);
  for (let i = 0; i < levelCount; i++) b.delete(doc(db, 'levels', String(i), 'runs', uid));
  if (me) { b.delete(doc(db, 'players', uid)); b.delete(doc(db, 'names', me.name.toLowerCase())); }
  b.delete(doc(db, 'saves', uid));
  await b.commit();
  const old = uid;
  await authCall(() => deleteUser(user));
  await settledAs(u => u !== old);
}
const resetPassword = email => authCall(() => sendPasswordResetEmail(auth, email.trim()));

// ── Private save: progress and friends ─────────────────────────
async function getSave() { await ready; await loading; return { stars: {}, moves: {}, friends: [], ...(save || {}) }; }
async function putSave(progress) {
  await ready;
  const data = { stars: progress.stars, moves: progress.moves, updated: serverTimestamp() };
  await setDoc(doc(db, 'saves', uid), data, { merge: true });
  save = { ...(save || {}), ...data };
}
async function addFriendId(f) {
  await ready;
  if (f === uid) throw new Error('That’s you!');
  const p = await getDoc(doc(db, 'players', f));
  if (!p.exists()) throw new Error('No player with that link');
  await setDoc(doc(db, 'saves', uid), { friends: arrayUnion(f), updated: serverTimestamp() }, { merge: true });
  save = { ...(save || {}), friends: [...new Set([...((save && save.friends) || []), f])] };
  return p.data().name;
}
async function addFriend(raw) {
  const name = clean(raw);
  const s = await getDoc(doc(db, 'names', name.toLowerCase()));
  if (!s.exists()) throw new Error(`No player called “${name}”`);
  await addFriendId(s.data().uid);
  return s.data().name;
}
async function getFriendName(f) {
  const p = await getDoc(doc(db, 'players', f));
  return p.exists() ? p.data().name : null;
}
async function removeFriend(f) {
  await ready;
  await setDoc(doc(db, 'saves', uid), { friends: arrayRemove(f), updated: serverTimestamp() }, { merge: true });
  save = { ...(save || {}), friends: ((save && save.friends) || []).filter(x => x !== f) };
}
// ── Help requests ──────────────────────────────────────────────
// Ask friends (by uid) for help with a level; anyone with the id (a shared link) may answer too.
const newHelpId = () => newCode() + newCode();
async function askHelp(level, par, to, id = newHelpId()) {
  await ready;
  if (!me) throw new Error('Pick a nickname first');
  await setDoc(doc(db, 'help', id), { from: uid, fromName: me.name, level, par, to: to.slice(0, 20), created: serverTimestamp() });
  return id;
}
async function getHelp(id) {
  await ready;
  const s = await getDoc(doc(db, 'help', id));
  return s.exists() ? { id, ...s.data(), created: ms(s.data().created) } : null;
}
const FORTNIGHT = 14 * 86400e3;
// Requests from friends to me (newest first, last two weeks).
async function incomingHelp() {
  await ready;
  const snap = await getDocs(query(collection(db, 'help'), where('to', 'array-contains', uid), limit(30)));
  return snap.docs.map(d => ({ id: d.id, ...d.data(), created: ms(d.data().created) }))
    .filter(h => h.from !== uid && Date.now() - h.created < FORTNIGHT).sort((a, b) => b.created - a.created);
}
// My own requests, each with the solutions friends sent.
async function myHelp() {
  await ready;
  const snap = await getDocs(query(collection(db, 'help'), where('from', '==', uid), limit(20)));
  const reqs = snap.docs.map(d => ({ id: d.id, ...d.data(), created: ms(d.data().created) }))
    .filter(h => Date.now() - h.created < FORTNIGHT).sort((a, b) => b.created - a.created).slice(0, 8);
  await Promise.all(reqs.map(async h => {
    const a = await getDocs(collection(db, 'help', h.id, 'answers'));
    h.answers = a.docs.map(d => ({ uid: d.id, ...d.data() })).sort((x, y) => x.moves - y.moves);
  }));
  return reqs;
}
// Send my solution (only if it's my first or a better one). Returns true when sent.
async function answerHelp(id, steps, totals) {
  await ready;
  if (!me) throw new Error('Pick a nickname first');
  const ref = doc(db, 'help', id, 'answers', uid);
  const old = await getDoc(ref);
  if (old.exists() && old.data().moves <= steps.length) return false;
  await setDoc(ref, { name: me.name, moves: steps.length, steps, created: serverTimestamp() });
  if (!old.exists()) { me.helped = (me.helped || 0) + 1; await retry(() => writePlayer(me.name, totals)); }
  return true;
}
async function closeHelp(id) { await ready; await deleteDoc(doc(db, 'help', id)); }

// You and your friends, best first.
async function friendsBoard() {
  await ready; await loading;
  const ids = [uid, ...((save && save.friends) || [])];
  const rows = [];
  for (let i = 0; i < ids.length; i += 30) {
    const snap = await getDocs(query(collection(db, 'players'), where(documentId(), 'in', ids.slice(i, i + 30))));
    snap.docs.forEach(d => rows.push({ uid: d.id, ...d.data(), mine: d.id === uid }));
  }
  return rows.sort((a, b) => b.score - a.score);
}

// Every call gives up after a while instead of hanging (e.g. a flaky connection).
const timed = (p, ms = 12000) => Promise.race([p, new Promise((_, no) => setTimeout(() => no(Object.assign(new Error('timeout'), { code: 'timeout' })), ms))]);

const clean = n => (n || '').normalize('NFC').trim().replace(/\s+/g, ' ');

// A player's doc from their totals; keeps their team.
const playerData = (name, totals, team) => {
  const d = { name, ...totals, score: totals.stars * 100000 - totals.moves, updated: serverTimestamp() };
  if (me && me.helped) d.helped = me.helped;   // how many friends they've helped
  if (team) d.team = team;
  return d;
};
// Write the player doc; the team's total moves by the same number of stars (the rules insist).
async function writePlayer(name, totals, b = writeBatch(db)) {
  const data = playerData(name, totals, me && me.team);
  b.set(doc(db, 'players', uid), data);
  const gain = totals.stars - ((me && me.stars) || 0);
  if (me && me.team && gain) b.update(doc(db, 'teams', me.team), { stars: increment(gain) });
  await b.commit();
  me = { ...data, team: me && me.team };
}
// Our copy of the player doc can be out of date (e.g. another tab); re-read and try once more.
async function retry(fn) {
  try { return await fn(); } catch (e) {
    if (e.code !== 'permission-denied') throw e;
    const s = await getDoc(doc(db, 'players', uid));
    me = s.exists() ? s.data() : null;
    return fn();
  }
}

async function setName(raw, totals) {
  await ready;
  const name = clean(raw);
  if (!okText(name, 2, 16)) throw new Error('Use 2–16 characters (emoji welcome), no /');
  const key = name.toLowerCase();
  const taken = await getDoc(doc(db, 'names', key));
  if (taken.exists() && taken.data().uid !== uid) throw new Error('That name is taken — try another');
  await retry(() => {
    const b = writeBatch(db);
    if (!taken.exists()) b.set(doc(db, 'names', key), { uid, name, created: serverTimestamp() });
    // Changing names frees the old one.
    if (me && me.name && me.name.toLowerCase() !== key) b.delete(doc(db, 'names', me.name.toLowerCase()));
    return writePlayer(name, totals, b);
  });
  return name;
}

// Save totals and, if better, this level's run.
async function submit(level, moves, totals) {
  await ready;
  if (!me) return;
  await retry(() => writePlayer(me.name, totals));
  if (level == null) return;
  const runRef = doc(db, 'levels', String(level), 'runs', uid);
  const old = await getDoc(runRef);
  if (!old.exists() || moves < old.data().moves || old.data().name !== me.name)
    await setDoc(runRef, { name: me.name, moves: old.exists() ? Math.min(moves, old.data().moves) : moves, updated: serverTimestamp() });
}

// ── Teams ──────────────────────────────────────────────────────
const CODE_ABC = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const newCode = () => Array.from(crypto.getRandomValues(new Uint8Array(6)), x => CODE_ABC[x % CODE_ABC.length]).join('');
const normCode = c => (c || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
let myTeam = null; // { code, name, members, stars }

async function getTeam(code) {
  code = normCode(code);
  if (code.length !== 6) return null;
  const s = await getDoc(doc(db, 'teams', code));
  return s.exists() ? { code, ...s.data() } : null;
}
async function loadMyTeam() { myTeam = me && me.team ? await getTeam(me.team) : null; return myTeam; }

// Leaving the old team (if any) goes in the same batch as joining the new one.
function leaveIn(b) {
  if (me && me.team) b.update(doc(db, 'teams', me.team), { members: increment(-1), stars: increment(-(me.stars || 0)) });
}
async function moveTo(team, totals, create) {
  if (!me) throw new Error('Pick a nickname first');
  const b = writeBatch(db);
  leaveIn(b);
  if (create) b.set(doc(db, 'teams', team.code), { name: team.name, by: uid, members: 1, stars: totals.stars, created: serverTimestamp() });
  else if (team) b.update(doc(db, 'teams', team.code), { members: increment(1), stars: increment(totals.stars) });
  const data = playerData(me.name, totals, team && team.code);
  b.set(doc(db, 'players', uid), data);
  await b.commit();
  me = data;
  return loadMyTeam();
}
async function createTeam(raw, totals) {
  await ready;
  const name = clean(raw);
  if (!okText(name, 2, 20)) throw new Error('Use 2–20 characters (emoji welcome), no /');
  return retry(() => moveTo({ code: newCode(), name }, totals, true));
}
async function renameTeam(raw) {
  await ready;
  const name = clean(raw);
  if (!okText(name, 2, 20)) throw new Error('Use 2–20 characters (emoji welcome), no /');
  if (!me || !me.team) throw new Error('You’re not in a team');
  await updateDoc(doc(db, 'teams', me.team), { name });
  return loadMyTeam();
}
async function joinTeam(code, totals) {
  await ready;
  const t = await getTeam(code);
  if (!t) throw new Error('No team with that code');
  if (me.team === t.code) return loadMyTeam();
  if (t.members >= 20) throw new Error('That team is full (20 players)');
  return retry(() => moveTo(t, totals, false));
}
async function leaveTeam(totals) { await ready; return retry(() => moveTo(null, totals, false)); }

async function teamMembers(code) {
  const snap = await getDocs(query(collection(db, 'players'), where('team', '==', code), limit(20)));
  return snap.docs.map(d => ({ uid: d.id, ...d.data(), mine: d.id === uid })).sort((a, b) => b.score - a.score);
}
async function topTeams(n = 50) {
  const snap = await getDocs(query(collection(db, 'teams'), orderBy('stars', 'desc'), limit(n)));
  return snap.docs.map(d => ({ code: d.id, ...d.data(), mine: d.id === (me && me.team) })).filter(t => t.members > 0);
}
async function myTeamRank() {
  if (!myTeam) return null;
  const c = await getCount(query(collection(db, 'teams'), where('stars', '>', myTeam.stars)));
  return c.data().count + 1;
}

// ── Challenges ─────────────────────────────────────────────────
// The server's clock decides; skew = server time − this device's time (learnt from our own writes).
let skew = 0;
try { skew = +localStorage.getItem('unblock_skew') || 0; } catch (e) {}
const learnSkew = (serverMs, before, after) => {
  skew = Math.round(serverMs - (before + after) / 2);
  try { localStorage.setItem('unblock_skew', String(skew)); } catch (e) {}
};
const ms = t => (t && t.toMillis ? t.toMillis() : t);
const chOut = (code, d) => ({ code, ...d, start: ms(d.start), created: ms(d.created) });

async function createChallenge({ startIn, window: win, playMin, levels, players }) {
  await ready;
  if (me.team) await loadMyTeam();
  const code = newCode();
  const data = {
    by: uid, byName: me.name, team: (me.team && myTeam && myTeam.code) || null, teamName: (me.team && myTeam && myTeam.name) || null,
    created: serverTimestamp(), start: startIn ? Timestamp.fromMillis(Date.now() + skew + startIn * 60000) : serverTimestamp(),
    window: win, playMin, levels, players, joined: 0, seed: Math.floor(Math.random() * 2147483647),
  };
  const t0 = Date.now();
  await setDoc(doc(db, 'challenges', code), data);
  const t1 = Date.now();
  const c = await getChallenge(code);
  learnSkew(c.created, t0, t1);
  return c;
}
async function getChallenge(code) {
  code = normCode(code);
  if (code.length !== 6) return null;
  const s = await getDoc(doc(db, 'challenges', code));
  return s.exists() ? chOut(code, s.data()) : null;
}
async function entries(code) {
  const snap = await getDocs(query(collection(db, 'challenges', code, 'entries'), orderBy('score', 'desc'), limit(20)));
  return snap.docs.map(d => ({ uid: d.id, ...d.data(), started: ms(d.data().started), mine: d.id === uid }));
}
async function myEntry(code) {
  await ready;
  const s = await getDoc(doc(db, 'challenges', code, 'entries', uid));
  return s.exists() ? { ...s.data(), started: ms(s.data().started) } : null;
}
async function joinChallenge(code) {
  await ready;
  if (me.team) await loadMyTeam();
  const team = me.team && myTeam ? myTeam : null;
  const b = writeBatch(db);
  b.set(doc(db, 'challenges', code, 'entries', uid), {
    name: me.name, team: team ? team.code : null, teamName: team ? team.name : null,
    started: serverTimestamp(), updated: serverTimestamp(), stars: 0, moves: 0, solved: 0, score: 0, runs: {},
  });
  b.update(doc(db, 'challenges', code), { joined: increment(1) });
  const t0 = Date.now();
  await b.commit();
  const t1 = Date.now();
  const e = await myEntry(code);
  learnSkew(e.started, t0, t1);
  return e;
}
// runs = { position: best moves }; stars and moves are the totals over them.
async function saveEntry(code, runs, stars, moves) {
  await ready;
  await updateDoc(doc(db, 'challenges', code, 'entries', uid), {
    runs, stars, moves, solved: Object.keys(runs).length, score: stars * 100000 - moves, updated: serverTimestamp(),
  });
}
async function teamChallenges(team) {
  const snap = await getDocs(query(collection(db, 'challenges'), where('team', '==', team), limit(40)));
  return snap.docs.map(d => chOut(d.id, d.data()));
}

async function top(n = 50) {
  await ready;
  const snap = await getDocs(query(collection(db, 'players'), orderBy('score', 'desc'), limit(n)));
  return snap.docs.map(d => ({ uid: d.id, ...d.data(), mine: d.id === uid }));
}

async function myRank() {
  await ready;
  if (!me) return null;
  const c = await getCount(query(collection(db, 'players'), where('score', '>', me.score)));
  return c.data().count + 1;
}

async function levelTop(level, n = 3) {
  await ready;
  const snap = await getDocs(query(collection(db, 'levels', String(level), 'runs'), orderBy('moves'), limit(n)));
  return snap.docs.map(d => ({ ...d.data(), mine: d.id === uid }));
}

window.Online = {
  ready: timed(ready, 15000).catch(() => false),
  setName: (n, t) => timed(setName(n, t)), submit: (l, m, t) => timed(submit(l, m, t)),
  top: n => timed(top(n)), myRank: () => timed(myRank()), levelTop: (l, n) => timed(levelTop(l, n)),
  getTeam: c => timed(getTeam(c)), createTeam: (n, t) => timed(createTeam(n, t)), joinTeam: (c, t) => timed(joinTeam(c, t)),
  leaveTeam: t => timed(leaveTeam(t)), renameTeam: n => timed(renameTeam(n)), teamMembers: c => timed(teamMembers(c)), topTeams: n => timed(topTeams(n)),
  myTeamRank: () => timed(myTeamRank()), refreshTeam: () => timed(loadMyTeam()),
  createChallenge: o => timed(createChallenge(o)), getChallenge: c => timed(getChallenge(c)), entries: c => timed(entries(c)),
  myEntry: c => timed(myEntry(c)), joinChallenge: c => timed(joinChallenge(c)), saveEntry: (c, r, s, m) => timed(saveEntry(c, r, s, m)),
  teamChallenges: t => timed(teamChallenges(t)), normCode,
  now: () => Date.now() + skew,
  createAccount: (e, p) => timed(createAccount(e, p)), signIn: (e, p) => timed(signIn(e, p)), signOut: () => timed(signOutNow()),
  resetPassword: e => timed(resetPassword(e)), deleteAccount: (p, n) => timed(deleteAccount(p, n), 30000),
  getSave: () => timed(getSave()), putSave: p => timed(putSave(p)),
  addFriend: n => timed(addFriend(n)), addFriendId: f => timed(addFriendId(f)), removeFriend: f => timed(removeFriend(f)), getFriendName: f => timed(getFriendName(f)),
  friendsBoard: () => timed(friendsBoard()),
  newHelpId, askHelp: (l, p, t, id) => timed(askHelp(l, p, t, id)), getHelp: id => timed(getHelp(id)), incomingHelp: () => timed(incomingHelp()),
  myHelp: () => timed(myHelp()), answerHelp: (id, s, t) => timed(answerHelp(id, s, t)), closeHelp: id => timed(closeHelp(id)),
  get account() { return account; },
  get canHint() { return canHint; },
  get canDev() { return canDev; },
  get uid() { return uid; },
  get friends() { return (save && save.friends) || []; },
  get name() { return me && me.name; },
  get team() { return myTeam; },
};
window.dispatchEvent(new Event('online-ready'));
