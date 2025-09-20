// classfav.js (with Anonymous Auth + down-toggle for public sets + auto-injected CSS)

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js";
import { getFirestore, collection, query, where, orderBy, limit, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";
import {
  getStorage, ref as storageRef, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.3/firebase-storage.js";
import {
  getAuth, onAuthStateChanged, signInAnonymously
} from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCndfcWksvEBhzJDiQmJj_zSRI6FSVNUC0",
  authDomain: "flipcards-7adab.firebaseapp.com",
  projectId: "flipcards-7adab",
  storageBucket: "flipcards-7adab.firebasestorage.app",
  messagingSenderId: "836765717736",
  appId: "1:836765717736:web:ff749a40245798307b655d",
  measurementId: "G-M26MWQZBJ0"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

const BADGES = { verified: "verified.svg", first: "first.png" };

/* ---------------------- Small utilities ---------------------- */
function escapeHtml(s = "") {
  return String(s).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" }[c]));
}

function setLoading(el, isLoading) {
  if (!el) return;
  if (isLoading) el.innerHTML = `<div class="class-favorite-card"><div class="creator-name">Loading…</div></div>`;
}

function toSafeId(email = "") {
  return String(email).toLowerCase().replace(/[^a-z0-9]+/g, "_");
}

function getSetTitle(d, id) {
  return d?.title || d?.name || d?.setName || d?.subject || `Untitled (${String(id).slice(0,6)})`;
}

/* ---------------------- Username / badge ---------------------- */
async function fetchUsername(email) {
  try {
    const snap = await getDoc(doc(db, "usernames", email));
    if (snap.exists() && snap.data()?.username) return snap.data().username;
  } catch (err) { console.warn(`[classfav] username lookup failed for ${email}:`, err); }
  return email && email.includes("@") ? email.split("@")[0] : (email || "user");
}

async function fetchRoleBadge(email) {
  try {
    const snap = await getDoc(doc(db, "approved_emails", email));
    if (snap.exists()) {
      const roleRaw = String(snap.data()?.role || "").toLowerCase();
      if (roleRaw.includes("verified")) return { src: BADGES.verified, alt: "verified" };
      if (roleRaw.includes("first")) return { src: BADGES.first, alt: "first" };
    }
  } catch (err) { console.warn(`[classfav] role lookup failed for ${email}:`, err); }
  return null;
}

/* ---------------------- Public set check ---------------------- */
function isPublicSet(d) {
  const visibility = String(d?.privacy || d?.visibility || "").toLowerCase();
  const access = String(d?.access || "").toLowerCase();
  if (d?.deleted === true || d?.isRemoved === true) return false;
  if (String(d?.status || "").toLowerCase() === "archived") return false;
  return d?.public === true || d?.isPublic === true || visibility === "public" || access === "public";
}

/* ---------------------- Avatars ---------------------- */
const avatarCache = new Map();
async function fetchAvatarUrl(email) {
  const key = String(email || "");
  if (!key) return null;
  if (avatarCache.has(key)) return avatarCache.get(key);

  console.log(`[classfav] Trying avatar for email: "${key}"`);
  const path = `avatars/${key}`;
  console.log(`[classfav] Storage path: ${path}`);

  try {
    const url = await getDownloadURL(storageRef(storage, path));
    console.log(`[classfav] Avatar found for ${key}: ${url}`);
    avatarCache.set(key, url);
    return url;
  } catch (err) {
    console.warn(`[classfav] Avatar fetch failed for ${key} at ${path}`, err.code || err);
    avatarCache.set(key, null);
    return null;
  }
}

function initialsFromName(name = "") {
  const parts = String(name).trim().split(/\s+/).slice(0, 2);
  const initials = parts.map(p => p[0]?.toUpperCase() || "").join("");
  return initials || "U";
}

const AVATAR_STYLE = `
  width:28px;height:28px;border-radius:9999px;object-fit:cover;flex:0 0 28px;display:inline-block;margin-right:8px;border:1px solid rgba(255,255,255,.2);
`;
const AVATAR_FALLBACK_STYLE = `
  width:28px;height:28px;border-radius:9999px;background:rgba(255,255,255,.1);color:#fff;font-weight:700;font-size:12px;display:inline-flex;align-items:center;justify-content:center;flex:0 0 28px;margin-right:8px;border:1px solid rgba(255,255,255,.2);
`;

/* ---------------------- Fetch sets by user ---------------------- */
async function fetchPublicSetsByUser(email) {
  const q = query(collection(db, "flashcard_sets"), where("user", "==", email));
  const snap = await getDocs(q);
  const sets = [];
  snap.forEach(docSnap => {
    const data = docSnap.data();
    if (isPublicSet(data)) {
      sets.push({
        id: docSnap.id,
        title: getSetTitle(data, docSnap.id),
        likes: Number(data?.likeCount || 0)
      });
    }
  });
  // A→Z by title, then by likes desc if same title
  sets.sort((a, b) => a.title.localeCompare(b.title) || b.likes - a.likes);
  return sets;
}


/* ---------------------- Inject CSS (no edit to lobby.css needed) ---------------------- */
function ensureStyles() {
  if (document.getElementById("cf-slide-styles")) return;
  const style = document.createElement("style");
  style.id = "cf-slide-styles";
style.textContent = `
  .cf-top{display:flex;align-items:center;justify-content:space-between;gap:8px;}
  .cf-toggle{appearance:none;border:1px solid #2a2a2a;background:#202020;color:#fff;font-family:inherit;font-size:12px;line-height:1;border-radius:8px;padding:6px 8px;cursor:pointer;transition:transform .15s ease, background .2s ease, border-color .2s ease}
  .cf-toggle:hover{background:#262626;border-color:#444}
  .cf-toggle[aria-expanded="true"]{transform:rotate(180deg)}
  .cf-sets {
  overflow-y: auto;
  max-height: 0;
  transition: max-height .28s ease;
  margin-top: 10px;
  border-top: 1px dashed #333;
  padding-top: 10px;
      position: relative;   /* ensure positioning context */
    z-index: 9999;         /* make it always on top */
    background: #1a1a1a;   /* optional: give it a background so it doesn’t blend */
}
.cf-sets.open {
  max-height: 200px; /* Enough height for ~5 items */
}
.cf-sets-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: 1fr;
  gap: 6px;
  font-size: 13px;
  color: #eaeaea;
}

  .cf-sets-list{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:1fr;gap:6px;font-size:13px;color:#eaeaea}
  .cf-set-item{
    display:flex;align-items:center;justify-content:space-between;
    gap:10px;padding:6px 8px;border:1px solid #242424;border-radius:8px;background:#1a1a1a;
  }
  .cf-set-title{min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;background: transparent; color: white;}
  .cf-set-likes{flex:0 0 auto;font-size:12px;color:#ddd;opacity:.9;font-variant-numeric:tabular-nums;background: transparent}
  .cf-empty,.cf-error{font-size:12px;color:#bbb}
`;

  document.head.appendChild(style);
}

/* ---------------------- Main loader ---------------------- */
async function loadTopCreators() {
  const listEl = document.querySelector(".class-favorite-list");
  if (!listEl) { console.warn("[classfav] .class-favorite-list not found"); return; }
  setLoading(listEl, true);
  ensureStyles();

  try {
    const q = query(collection(db, "flashcard_sets"), orderBy("likeCount", "desc"), limit(50));
    const snap = await getDocs(q);

    const likeTotals = {};
    const publicSetCounts = {};

    snap.forEach(docSnap => {
      const d = docSnap.data();
      const email = (d?.user ?? "Unknown").toString().trim();
      console.log(`[classfav] Found set by user email: "${email}"`);
      const likes = Number(d?.likeCount || 0);
      likeTotals[email] = (likeTotals[email] || 0) + likes;
      if (isPublicSet(d)) publicSetCounts[email] = (publicSetCounts[email] || 0) + 1;
    });

    console.log("[classfav] Aggregated likeTotals:", likeTotals);
    console.log("[classfav] Aggregated publicSetCounts:", publicSetCounts);

    const top = Object.entries(likeTotals).sort((a, b) => b[1] - a[1]).slice(0, 3);
    console.log("[classfav] Top creators:", top);

    const items = [];
    // inside loadTopCreators(), when building `items`
for (const [email, likes] of top) {
  const [displayName, badge, avatarUrl, userSets] = await Promise.all([
    fetchUsername(email),
    fetchRoleBadge(email),
    fetchAvatarUrl(email),
    fetchPublicSetsByUser(email) // ← full per-user list
  ]);
  items.push({
    email,
    name: displayName,
    likes,
    badge,
    sets: userSets.length,      // ← accurate count
    avatarUrl
  });
}


    console.log("[classfav] Final items to render:", items);

    if (items.length === 0) {
      listEl.innerHTML = `
        <div class="class-favorite-card">
          <div class="creator-name">No creators yet</div>
          <div class="creator-meta">Be the first to like a set</div>
        </div>`;
      return;
    }

    // Render cards with a top-right ▼ toggle and a hidden slide panel
    listEl.innerHTML = items.map(({ email, name, likes, badge, sets, avatarUrl }) => {
  const initials = initialsFromName(name);
  const avatarHTML = avatarUrl
    ? `<img class="cf-avatar" src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(name)}">`
    : `<span class="cf-avatar-fallback" aria-hidden="true">${escapeHtml(initials)}</span>`;
  const safeId = toSafeId(email);
  return `
  <div class="class-favorite-card">
    <div class="cf-top">
      <div class="cf-creator-info">
        ${avatarHTML}
        <div class="cf-creator-details">
          <span class="cf-name">${escapeHtml(name)}</span>
          ${badge ? `<img class="role-badge22" src="${escapeHtml(badge.src)}" alt="${escapeHtml(badge.alt)}">` : ""}
        </div>
      </div>

      <div class="cf-creator-stats">
        <div class="cf-stat">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
          <span>${Number(likes).toLocaleString()}</span>
        </div>
        <div class="cf-stat">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
          <span>${Number(sets).toLocaleString()}</span>
        </div>
      </div>
      
      <button class="cf-toggle" data-email="${escapeHtml(email)}" aria-expanded="false" title="Show public sets">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
      </button>
    </div>

    <div class="cf-sets" id="sets-${escapeHtml(safeId)}" hidden>
      <div class="cf-sets-inner">Loading…</div>
    </div>
  </div>`;
}).join("");

    // Delegated click handler for the ▼ toggle
    if (!listEl._cfBound) {
      listEl.addEventListener("click", async (e) => {
        const btn = e.target.closest(".cf-toggle");
        if (!btn) return;

        const email = btn.dataset.email;
        const safeId = toSafeId(email);
        const panel = document.getElementById(`sets-${safeId}`);
        if (!panel) return;

        // Fetch once, then cache in DOM dataset
        if (!panel.dataset.loaded) {
          try {
            const sets = await fetchPublicSetsByUser(email);
            panel.querySelector(".cf-sets-inner").innerHTML = sets.length
  ? `<ul class="cf-sets-list">${sets.map(s => `<li class="cf-set-item" title="${escapeHtml(s.title)}">
        <span class="cf-set-title">${escapeHtml(s.title)}</span>
        <span class="cf-set-likes"><span aria-hidden="true">❤️</span> ${s.likes.toLocaleString()}</span>
      </li>`).join("")}</ul>`
  : `<div class="cf-empty">No public sets yet.</div>`;

            panel.dataset.loaded = "1";
          } catch (err) {
            panel.querySelector(".cf-sets-inner").innerHTML = `<div class="cf-error">Couldn’t load sets.</div>`;
          }
        }

        // Slide toggle
        const willOpen = panel.hasAttribute("hidden");
        if (willOpen) {
          panel.removeAttribute("hidden");
          requestAnimationFrame(() => panel.classList.add("open"));
        } else {
          panel.classList.remove("open");
          panel.addEventListener("transitionend", () => panel.setAttribute("hidden", ""), { once: true });
        }
        btn.setAttribute("aria-expanded", String(willOpen));
      });
      listEl._cfBound = true;
    }

  } catch (err) {
    console.error("[classfav] Error loading creators:", err);
    const listEl2 = document.querySelector(".class-favorite-list");
    if (listEl2) {
      listEl2.innerHTML = `
        <div class="class-favorite-card">
          <div class="creator-name">Error loading creators</div>
          <div class="creator-meta">${escapeHtml(err?.message || String(err))}</div>
        </div>`;
    }
  }
}

/* ----- Ensure we’re authenticated (anon is fine) before loading ----- */
function start() {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      try {
        console.log("[classfav] No auth user, signing in anonymously…");
        await signInAnonymously(auth);
        console.log("[classfav] Anonymous sign-in OK");
      } catch (e) {
        console.error("[classfav] Anonymous sign-in failed:", e);
      }
    } else {
      console.log("[classfav] Auth user present:", user.uid, "anon:", user.isAnonymous);
    }
    // Whether anon sign-in succeeded or a user already existed, try to load
    loadTopCreators();
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start);
} else {
  start();
}
