// Unblock It — online: nickname sign-in (Firebase anonymous auth) and leaderboards (Firestore).
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
//   challenges/{code}/entries/{uid} { name, team, teamName, started, updated, stars, moves, solved, score, runs }
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
// Firestore Lite: plain one-off requests, no live stream (nothing for a cache or a sleeping phone
// to hold open), and a much smaller download.
import {
  getFirestore, doc, getDoc, writeBatch, setDoc, collection, query, orderBy, limit, getDocs,
  where, getCount, serverTimestamp, increment, updateDoc, Timestamp,
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
const auth = getAuth(app);
const db = getFirestore(app);

const NAME_RE = /^[A-Za-z0-9 _.-]{3,16}$/;
let uid = null, me = null; // me = this player's doc (or null before a nickname is chosen)

// Signed in anonymously as soon as possible; the device keeps the account.
const ready = new Promise(resolve => {
  onAuthStateChanged(auth, async user => {
    if (!user) { signInAnonymously(auth).catch(e => { console.warn('sign-in failed', e); resolve(false); }); return; }
    uid = user.uid;
    try {
      const s = await getDoc(doc(db, 'players', uid));
      me = s.exists() ? s.data() : null;
      await loadMyTeam();
    } catch (e) { console.warn(e); }
    resolve(true);
  });
});

// Every call gives up after a while instead of hanging (e.g. a flaky connection).
const timed = (p, ms = 12000) => Promise.race([p, new Promise((_, no) => setTimeout(() => no(Object.assign(new Error('timeout'), { code: 'timeout' })), ms))]);

const clean = n => (n || '').trim().replace(/\s+/g, ' ');

// A player's doc from their totals; keeps their team.
const playerData = (name, totals, team) => {
  const d = { name, ...totals, score: totals.stars * 100000 - totals.moves, updated: serverTimestamp() };
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
  if (!NAME_RE.test(name)) throw new Error('Use 3–16 letters, numbers, spaces, _ . or -');
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
const TEAM_RE = /^[A-Za-z0-9 _.!-]{3,20}$/;
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
  if (!TEAM_RE.test(name)) throw new Error('Use 3–20 letters, numbers, spaces, _ . ! or -');
  return retry(() => moveTo({ code: newCode(), name }, totals, true));
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
  if (me.team && !myTeam) await loadMyTeam();
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
  if (me.team && !myTeam) await loadMyTeam();
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
  leaveTeam: t => timed(leaveTeam(t)), teamMembers: c => timed(teamMembers(c)), topTeams: n => timed(topTeams(n)),
  myTeamRank: () => timed(myTeamRank()), refreshTeam: () => timed(loadMyTeam()),
  createChallenge: o => timed(createChallenge(o)), getChallenge: c => timed(getChallenge(c)), entries: c => timed(entries(c)),
  myEntry: c => timed(myEntry(c)), joinChallenge: c => timed(joinChallenge(c)), saveEntry: (c, r, s, m) => timed(saveEntry(c, r, s, m)),
  teamChallenges: t => timed(teamChallenges(t)), normCode,
  now: () => Date.now() + skew,
  get name() { return me && me.name; },
  get team() { return myTeam; },
};
window.dispatchEvent(new Event('online-ready'));
