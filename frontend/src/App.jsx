import React, { useState, useEffect, useCallback } from "react";
import CameraCapture from "./components/CameraCapture";
import ShareCard from "./components/ShareCard";
import { socialStyles, PeopleSearch, UserProfileView, FollowersSheet, FollowingSheet, FollowRequestsSheet } from "./components/Social";
import { getMe, updateMe, getJournal, deleteEntry, exploreFeed, followingFeed, login, register } from "./services/api";
import { useAuthStore } from "./store/authStore";

const MILESTONE_DAYS = [7, 14, 30, 45, 90, 180, 365];

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=DM+Sans:wght@300;400;500;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #0f0e0c;
    --surface: #161512;
    --border: #252320;
    --accent: #d4a96a;
    --accent-light: #f0d5a8;
    --text: #e8e3da;
    --muted: #7a7060;
    --danger: #c0392b;
  }
  body { background: var(--bg); color: var(--text); font-family: 'DM Sans', sans-serif; min-height: 100vh; }
  h1,h2,h3 { font-family: 'Cormorant Garamond', serif; }

  /* AUTH */
  .auth-wrap { min-height:100vh; display:flex; align-items:center; justify-content:center; padding:24px; background:radial-gradient(ellipse at 30% 20%, #1e1a14, var(--bg) 60%); }
  .auth-card { width:100%; max-width:380px; background:var(--surface); border:1px solid var(--border); border-radius:24px; padding:40px 32px; }
  .auth-logo { font-family:'Cormorant Garamond',serif; font-size:32px; color:var(--accent-light); text-align:center; margin-bottom:8px; }
  .auth-sub { text-align:center; color:var(--muted); font-size:13px; margin-bottom:32px; }
  .auth-input { width:100%; background:#0f0e0c; border:1px solid var(--border); color:var(--text); border-radius:12px; padding:13px 16px; font-size:14px; outline:none; margin-bottom:12px; }
  .auth-input:focus { border-color:var(--accent); }
  .auth-btn { width:100%; background:var(--accent); color:#0f0e0c; border:none; border-radius:12px; padding:14px; font-size:15px; font-weight:600; cursor:pointer; }
  .auth-toggle { text-align:center; margin-top:16px; color:var(--muted); font-size:13px; }
  .auth-toggle span { color:var(--accent); cursor:pointer; }

  /* APP SHELL */
  .shell { display:flex; flex-direction:column; min-height:100vh; max-width:480px; margin:0 auto; }
  .top-bar { padding:20px 20px 0; display:flex; align-items:center; justify-content:space-between; }
  .app-logo { font-family:'Cormorant Garamond',serif; font-size:22px; color:var(--accent-light); }
  .avatar-btn { width:36px; height:36px; border-radius:50%; background:var(--surface); border:2px solid var(--border); cursor:pointer; overflow:hidden; display:flex; align-items:center; justify-content:center; color:var(--muted); font-size:16px; }

  /* CONTENT */
  .content { flex:1; overflow-y:auto; padding:16px 20px 100px; }

  /* BOTTOM NAV */
  .bottom-nav { position:fixed; bottom:0; left:50%; transform:translateX(-50%); width:100%; max-width:480px; background:var(--surface); border-top:1px solid var(--border); display:flex; align-items:center; padding:8px 0 24px; }
  .nav-item { flex:1; display:flex; flex-direction:column; align-items:center; gap:3px; padding:8px 0; cursor:pointer; }
  .nav-icon { font-size:22px; }
  .nav-label { font-size:10px; color:var(--muted); }
  .nav-item.active .nav-icon { filter:sepia(1) saturate(3) hue-rotate(5deg); }
  .nav-item.active .nav-label { color:var(--accent); }
  .cam-fab { width:52px; height:52px; background:var(--accent); border-radius:50%; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:24px; box-shadow:0 4px 20px rgba(212,169,106,.35); flex-shrink:0; }

  /* JOURNAL TAB */
  .day-hero { text-align:center; padding:24px 0 16px; }
  .day-number { font-family:'Cormorant Garamond',serif; font-size:72px; color:var(--accent); line-height:1; }
  .day-label { color:var(--muted); font-size:14px; margin-top:4px; }
  .streak-row { display:flex; justify-content:center; gap:24px; margin:16px 0; }
  .streak-stat { text-align:center; }
  .streak-num { font-size:24px; font-weight:600; color:var(--text); }
  .streak-lbl { color:var(--muted); font-size:11px; }
  .milestone-bar { background:var(--surface); border:1px solid var(--border); border-radius:16px; padding:14px 16px; margin-bottom:16px; }
  .milestone-title { font-size:12px; color:var(--muted); text-transform:uppercase; letter-spacing:1px; margin-bottom:8px; }
  .progress-track { background:var(--border); border-radius:99px; height:6px; }
  .progress-fill { background:linear-gradient(90deg,var(--accent),var(--accent-light)); height:100%; border-radius:99px; transition:width .5s ease; }
  .photo-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:2px; }
  .photo-cell { position:relative; aspect-ratio:1; overflow:hidden; cursor:pointer; }
  .photo-cell img { width:100%; height:100%; object-fit:cover; transition:transform .2s; }
  .photo-cell:hover img { transform:scale(1.04); }
  .photo-delete-btn { position:absolute; top:4px; right:4px; width:26px; height:26px; border:none; border-radius:50%; background:rgba(0,0,0,.6); color:#fff; font-size:13px; line-height:26px; padding:0; cursor:pointer; }
  .photo-delete-btn:disabled { opacity:.4; }
  .photo-day-badge { position:absolute; bottom:0; left:0; right:0; background:linear-gradient(transparent,rgba(0,0,0,.7)); padding:12px 6px 6px; font-size:10px; font-weight:700; color:var(--accent-light); }
  .empty-state { text-align:center; padding:60px 20px; color:var(--muted); }
  .empty-icon { font-size:48px; margin-bottom:16px; opacity:.4; }
  .empty-text { font-size:15px; }

  /* EXPLORE TAB */
  .search-bar { background:var(--surface); border:1px solid var(--border); border-radius:14px; padding:11px 14px; color:var(--text); font-size:14px; width:100%; outline:none; margin-bottom:12px; }
  .filter-pills { display:flex; gap:8px; overflow-x:auto; padding-bottom:8px; margin-bottom:12px; }
  .filter-pill { background:var(--surface); border:1px solid var(--border); color:var(--muted); border-radius:20px; padding:6px 14px; font-size:12px; cursor:pointer; white-space:nowrap; flex-shrink:0; }
  .filter-pill.active { background:var(--accent); color:#0f0e0c; border-color:var(--accent); font-weight:600; }
  .explore-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
  .explore-card { background:var(--surface); border:1px solid var(--border); border-radius:16px; overflow:hidden; cursor:pointer; }
  .explore-img { width:100%; aspect-ratio:1; object-fit:cover; }
  .explore-meta { padding:10px; }
  .explore-user { color:var(--accent-light); font-size:12px; font-weight:600; }
  .explore-day { color:var(--muted); font-size:11px; }
  .explore-products { display:flex; flex-wrap:wrap; gap:4px; margin-top:6px; }
  .exp-tag { background:var(--bg); color:var(--muted); font-size:9px; padding:2px 6px; border-radius:8px; }

  /* PROFILE TAB */
  .profile-header { text-align:center; padding:24px 0 20px; }
  .profile-avatar { width:80px; height:80px; border-radius:50%; background:var(--surface); border:3px solid var(--accent); margin:0 auto 12px; display:flex; align-items:center; justify-content:center; font-size:32px; overflow:hidden; }
  .profile-name { font-family:'Cormorant Garamond',serif; font-size:26px; color:var(--text); }
  .profile-username { color:var(--muted); font-size:13px; margin-top:2px; }
  .profile-stats { display:flex; justify-content:center; gap:32px; margin:20px 0; }
  .profile-stat { text-align:center; }
  .profile-stat-num { font-size:22px; font-weight:600; color:var(--accent-light); }
  .profile-stat-lbl { color:var(--muted); font-size:11px; }
  .milestone-chips { display:flex; flex-wrap:wrap; gap:8px; justify-content:center; margin:16px 0; }
  .milestone-chip { background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:6px 12px; font-size:12px; color:var(--muted); }
  .milestone-chip.done { background:var(--accent); color:#0f0e0c; border-color:var(--accent); font-weight:600; }
  .share-btn-row { display:flex; justify-content:center; margin:16px 0; }
  .share-trigger-btn { background:var(--accent); color:#0f0e0c; border:none; border-radius:14px; padding:12px 28px; font-size:14px; font-weight:700; cursor:pointer; }
  .logout-btn { width:100%; background:transparent; border:1px solid var(--border); color:var(--muted); border-radius:12px; padding:12px; font-size:14px; cursor:pointer; margin-top:16px; }

  /* GENERIC */
  .section-title { font-family:'Cormorant Garamond',serif; font-size:22px; color:var(--text); margin-bottom:16px; }
  .spin { display:inline-block; width:20px; height:20px; border:2px solid var(--border); border-top-color:var(--accent); border-radius:50%; animation:spin .7s linear infinite; }
  @keyframes spin { to { transform:rotate(360deg); } }
`;

// ── AUTH SCREEN ────────────────────────────────────────────────────────────────

function AuthScreen() {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ username: "", email: "", password: "", display_name: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();

  const submit = async () => {
    setLoading(true); setError("");
    try {
      const res = mode === "login"
        ? await login({ email: form.email, password: form.password })
        : await register(form);
      setAuth(res.data.access_token, { id: res.data.user_id, username: res.data.username });
    } catch (e) {
      setError(e.response?.data?.detail || "Something went wrong.");
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo">✦ Glow Journal</div>
        <div className="auth-sub">Track your skin. Share your journey.</div>
        {mode === "register" && (
          <>
            <input className="auth-input" placeholder="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
            <input className="auth-input" placeholder="Display name (optional)" value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} />
          </>
        )}
        <input className="auth-input" type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input className="auth-input" type="password" placeholder="Password (min 8 chars)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        {error && <p style={{ color: "#e74c3c", fontSize: 13, marginBottom: 10 }}>{error}</p>}
        <button className="auth-btn" onClick={submit} disabled={loading}>
          {loading ? "…" : mode === "login" ? "Sign In" : "Create Account"}
        </button>
        <div className="auth-toggle">
          {mode === "login" ? <>No account? <span onClick={() => setMode("register")}>Sign up</span></> : <>Have an account? <span onClick={() => setMode("login")}>Sign in</span></>}
        </div>
      </div>
    </div>
  );
}

// ── JOURNAL TAB ────────────────────────────────────────────────────────────────

function JournalTab({ profile, onRefresh, onDeleted }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    getJournal(0, 60).then((r) => setEntries(r.data)).finally(() => setLoading(false));
  }, [onRefresh]);

  const handleDelete = async (entry) => {
    if (!window.confirm(`Delete your Day ${entry.day_number} photo? This can't be undone.`)) return;
    setDeletingId(entry.id);
    try {
      await deleteEntry(entry.id);
      setEntries((prev) => prev.filter((x) => x.id !== entry.id));
      onDeleted?.();
    } catch {
      alert("Couldn't delete the photo. Try again.");
    } finally {
      setDeletingId(null);
    }
  };

  const currentDay = profile?.current_day || 0;
  const nextMilestone = MILESTONE_DAYS.find((d) => d > currentDay);
  const progress = nextMilestone ? Math.min(100, (currentDay / nextMilestone) * 100) : 100;

  return (
    <div>
      <div className="day-hero">
        <div className="day-number">{currentDay || 1}</div>
        <div className="day-label">days into your journey</div>
      </div>

      <div className="streak-row">
        <div className="streak-stat"><div className="streak-num">{entries.length}</div><div className="streak-lbl">Photos</div></div>
        <div className="streak-stat"><div className="streak-num">{profile?.milestones_achieved?.length || 0}</div><div className="streak-lbl">Milestones</div></div>
      </div>

      {nextMilestone && (
        <div className="milestone-bar">
          <div className="milestone-title">Next milestone — Day {nextMilestone}</div>
          <div className="progress-track"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
          <div style={{ color: "var(--muted)", fontSize: 11, marginTop: 6 }}>{nextMilestone - currentDay} days to go</div>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: 40 }}><div className="spin" /></div>
      ) : entries.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📸</div>
          <div className="empty-text">Tap the camera button below to capture your first photo.</div>
        </div>
      ) : (
        <div className="photo-grid">
          {entries.map((e) => (
            <div key={e.id} className="photo-cell">
              <img src={e.thumbnail_url} alt={`Day ${e.day_number}`} />
              <div className="photo-day-badge">Day {e.day_number}</div>
              <button className="photo-delete-btn" aria-label={`Delete Day ${e.day_number} photo`} disabled={deletingId === e.id} onClick={() => handleDelete(e)}>✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── EXPLORE TAB ────────────────────────────────────────────────────────────────

const CONCERNS = ["All", "acne", "hyperpigmentation", "hydration", "anti-aging", "redness", "pores"];

const EXPLORE_MODES = [
  { id: "discover", label: "Discover" },
  { id: "following", label: "Following" },
  { id: "people", label: "People" },
];

function EntryGrid({ entries, loading, emptyText, onOpenUser }) {
  if (loading) return <div style={{ textAlign: "center", padding: 40 }}><div className="spin" /></div>;
  if (entries.length === 0) return <div className="empty-state"><div className="empty-icon">🔍</div><div className="empty-text">{emptyText}</div></div>;
  return (
    <div className="explore-grid">
      {entries.map((e) => (
        <div key={e.entry_id} className="explore-card" onClick={() => onOpenUser(e.username)}>
          <img className="explore-img" src={e.thumbnail_url} alt="" />
          <div className="explore-meta">
            <div className="explore-user">@{e.username}</div>
            <div className="explore-day">Day {e.day_number}</div>
            <div className="explore-products">
              {e.products.slice(0, 2).map((p) => <span key={p.id} className="exp-tag">{p.name}</span>)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function DiscoverFeed({ onOpenUser }) {
  const [query, setQuery] = useState("");
  const [concern, setConcern] = useState("All");
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await exploreFeed(query || undefined, concern === "All" ? undefined : concern);
      setEntries(r.data);
    } finally { setLoading(false); }
  }, [query, concern]);

  useEffect(() => { const t = setTimeout(load, 400); return () => clearTimeout(t); }, [load]);

  return (
    <>
      <input className="search-bar" placeholder="Search by product, e.g. Glow Recipe toner…" value={query} onChange={(e) => setQuery(e.target.value)} />
      <div className="filter-pills">
        {CONCERNS.map((c) => (
          <div key={c} className={`filter-pill ${concern === c ? "active" : ""}`} onClick={() => setConcern(c)}>{c}</div>
        ))}
      </div>
      <EntryGrid entries={entries} loading={loading} emptyText="No public journeys found." onOpenUser={onOpenUser} />
    </>
  );
}

function FollowingFeed({ onOpenUser }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    followingFeed().then((r) => setEntries(r.data)).catch(() => setEntries([])).finally(() => setLoading(false));
  }, []);
  return <EntryGrid entries={entries} loading={loading} emptyText="Follow people to see their journeys here. Find them under People." onOpenUser={onOpenUser} />;
}

function ExploreTab({ onOpenUser }) {
  const [mode, setMode] = useState("discover");
  return (
    <div>
      <h2 className="section-title">Explore</h2>
      <div className="filter-pills">
        {EXPLORE_MODES.map((m) => (
          <div key={m.id} className={`filter-pill ${mode === m.id ? "active" : ""}`} onClick={() => setMode(m.id)}>{m.label}</div>
        ))}
      </div>
      {mode === "discover" && <DiscoverFeed onOpenUser={onOpenUser} />}
      {mode === "following" && <FollowingFeed onOpenUser={onOpenUser} />}
      {mode === "people" && <PeopleSearch onOpenUser={onOpenUser} />}
    </div>
  );
}

// ── PROFILE TAB ────────────────────────────────────────────────────────────────

function ProfileTab({ profile, onShare, onProfileChange, onOpenUser }) {
  const { logout } = useAuthStore();
  const [sheet, setSheet] = useState(null); // "followers" | "following" | "requests"
  const [savingPrivacy, setSavingPrivacy] = useState(false);
  if (!profile) return <div style={{ textAlign: "center", padding: 40 }}><div className="spin" /></div>;

  const refresh = () => getMe().then((r) => onProfileChange(r.data)).catch(() => {});
  const openFromSheet = (u) => { setSheet(null); onOpenUser(u); };

  const togglePrivacy = async () => {
    const goingPublic = !profile.is_profile_public;
    if (goingPublic && profile.pending_requests_count > 0 &&
        !window.confirm(`Making your account public will approve ${profile.pending_requests_count} pending follow request(s). Continue?`)) return;
    setSavingPrivacy(true);
    try {
      const r = await updateMe({ is_profile_public: goingPublic });
      onProfileChange(r.data);
    } catch {
      alert("Couldn't update privacy. Try again.");
    } finally { setSavingPrivacy(false); }
  };

  return (
    <div>
      <div className="profile-header">
        <div className="profile-avatar">{profile.avatar_url ? <img src={profile.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "🌿"}</div>
        <div className="profile-name">{profile.display_name}</div>
        <div className="profile-username">@{profile.username}{!profile.is_profile_public && " 🔒"}</div>
        {profile.bio && <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 8 }}>{profile.bio}</p>}
      </div>

      <div className="profile-stats">
        <div className="profile-stat"><div className="profile-stat-num">{profile.total_entries}</div><div className="profile-stat-lbl">Photos</div></div>
        <div className="profile-stat stat-click" onClick={() => setSheet("followers")}><div className="profile-stat-num">{profile.followers_count}</div><div className="profile-stat-lbl">Followers</div></div>
        <div className="profile-stat stat-click" onClick={() => setSheet("following")}><div className="profile-stat-num">{profile.following_count}</div><div className="profile-stat-lbl">Following</div></div>
      </div>

      <div className="setting-row" onClick={savingPrivacy ? undefined : togglePrivacy}>
        <div>
          <div className="setting-label">Private account</div>
          <div className="setting-sub">{profile.is_profile_public
            ? "Anyone can see your journey and follow you."
            : "Only followers you approve can see your journey."}</div>
        </div>
        <div className={`switch ${profile.is_profile_public ? "" : "on"}`} />
      </div>

      {(!profile.is_profile_public || profile.pending_requests_count > 0) && (
        <div className="setting-row" onClick={() => setSheet("requests")}>
          <div className="setting-label">Follow requests</div>
          {profile.pending_requests_count > 0
            ? <span className="req-badge">{profile.pending_requests_count}</span>
            : <span style={{ color: "var(--muted)" }}>›</span>}
        </div>
      )}

      {sheet === "followers" && <FollowersSheet username={profile.username} isMine onClose={() => setSheet(null)} onOpenUser={openFromSheet} onChanged={refresh} />}
      {sheet === "following" && <FollowingSheet username={profile.username} onClose={() => setSheet(null)} onOpenUser={openFromSheet} onChanged={refresh} />}
      {sheet === "requests" && <FollowRequestsSheet onClose={() => { setSheet(null); refresh(); }} onOpenUser={openFromSheet} onChanged={refresh} />}

      <div style={{ height: 16 }} />

      <div style={{ marginBottom: 16 }}>
        <div style={{ color: "var(--muted)", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Milestones</div>
        <div className="milestone-chips">
          {MILESTONE_DAYS.map((d) => (
            <span key={d} className={`milestone-chip ${profile.milestones_achieved?.includes(d) ? "done" : ""}`}>
              {profile.milestones_achieved?.includes(d) ? "✓ " : ""}Day {d}
            </span>
          ))}
        </div>
      </div>

      <div className="share-btn-row">
        <button className="share-trigger-btn" onClick={onShare}>🔗 Share My Progress</button>
      </div>

      <button className="logout-btn" onClick={logout}>Sign Out</button>
    </div>
  );
}

// ── ROOT APP ──────────────────────────────────────────────────────────────────

export default function App() {
  const { token } = useAuthStore();
  const [tab, setTab] = useState("journal");
  const [profile, setProfile] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [journalKey, setJournalKey] = useState(0);
  const [viewingUser, setViewingUser] = useState(null);

  useEffect(() => {
    if (token) getMe().then((r) => setProfile(r.data)).catch(() => {});
  }, [token, journalKey]);

  if (!token) return <><style>{css + socialStyles}</style><AuthScreen /></>;

  // Tapping your own name anywhere goes to your Profile tab instead of the public view
  const openUser = (username) => {
    if (username === profile?.username) { setViewingUser(null); setTab("profile"); }
    else setViewingUser(username);
  };
  const closeUser = () => {
    setViewingUser(null);
    getMe().then((r) => setProfile(r.data)).catch(() => {}); // following count may have changed
  };

  const navItems = [
    { id: "journal", icon: "📔", label: "Journey" },
    { id: "explore", icon: "🔍", label: "Explore" },
    { id: "profile", icon: "👤", label: "Profile" },
  ];

  return (
    <>
      <style>{css + socialStyles}</style>
      <div className="shell">
        <div className="top-bar">
          <div className="app-logo">✦ Glow Journal</div>
          <div className="avatar-btn">🌿</div>
        </div>

        <div className="content">
          {tab === "journal" && <JournalTab profile={profile} onRefresh={journalKey} onDeleted={() => getMe().then((r) => setProfile(r.data)).catch(() => {})} />}
          {tab === "explore" && <ExploreTab onOpenUser={openUser} />}
          {tab === "profile" && <ProfileTab profile={profile} onShare={() => setShowShare(true)} onProfileChange={setProfile} onOpenUser={openUser} />}
        </div>

        {/* BOTTOM NAV */}
        <div className="bottom-nav">
          {navItems.slice(0, 2).map((n) => (
            <div key={n.id} className={`nav-item ${tab === n.id ? "active" : ""}`} onClick={() => setTab(n.id)}>
              <span className="nav-icon">{n.icon}</span>
              <span className="nav-label">{n.label}</span>
            </div>
          ))}
          <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
            <button className="cam-fab" onClick={() => setShowCamera(true)}>📸</button>
          </div>
          {navItems.slice(2).map((n) => (
            <div key={n.id} className={`nav-item ${tab === n.id ? "active" : ""}`} onClick={() => setTab(n.id)}>
              <span className="nav-icon">{n.icon}</span>
              <span className="nav-label">{n.label}</span>
            </div>
          ))}
        </div>

        {/* MODALS */}
        {showCamera && (
          <CameraCapture
            currentDay={profile?.current_day || 1}
            onClose={() => setShowCamera(false)}
            onDone={() => { setShowCamera(false); setJournalKey((k) => k + 1); setTab("journal"); }}
          />
        )}
        {showShare && <ShareCard onClose={() => setShowShare(false)} />}
        {viewingUser && <UserProfileView username={viewingUser} onClose={closeUser} onOpenUser={openUser} />}
      </div>
    </>
  );
}
