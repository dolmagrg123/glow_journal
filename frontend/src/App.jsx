import React, { useState, useEffect, useCallback } from "react";
import CameraCapture from "./components/CameraCapture";
import ShareCard from "./components/ShareCard";
import { getMe, getJournal, exploreFeed, searchProducts, login, register } from "./services/api";
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

function JournalTab({ profile, onRefresh }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getJournal(0, 60).then((r) => setEntries(r.data)).finally(() => setLoading(false));
  }, [onRefresh]);

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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── EXPLORE TAB ────────────────────────────────────────────────────────────────

const CONCERNS = ["All", "acne", "hyperpigmentation", "hydration", "anti-aging", "redness", "pores"];

function ExploreTab() {
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
    <div>
      <h2 className="section-title">Explore</h2>
      <input className="search-bar" placeholder="Search by product, e.g. Glow Recipe toner…" value={query} onChange={(e) => setQuery(e.target.value)} />
      <div className="filter-pills">
        {CONCERNS.map((c) => (
          <div key={c} className={`filter-pill ${concern === c ? "active" : ""}`} onClick={() => setConcern(c)}>{c}</div>
        ))}
      </div>
      {loading ? (
        <div style={{ textAlign: "center", padding: 40 }}><div className="spin" /></div>
      ) : entries.length === 0 ? (
        <div className="empty-state"><div className="empty-icon">🔍</div><div className="empty-text">No public journeys found.</div></div>
      ) : (
        <div className="explore-grid">
          {entries.map((e) => (
            <div key={e.entry_id} className="explore-card">
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
      )}
    </div>
  );
}

// ── PROFILE TAB ────────────────────────────────────────────────────────────────

function ProfileTab({ profile, onShare }) {
  const { logout } = useAuthStore();
  if (!profile) return <div style={{ textAlign: "center", padding: 40 }}><div className="spin" /></div>;

  return (
    <div>
      <div className="profile-header">
        <div className="profile-avatar">{profile.avatar_url ? <img src={profile.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "🌿"}</div>
        <div className="profile-name">{profile.display_name}</div>
        <div className="profile-username">@{profile.username}</div>
        {profile.bio && <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 8 }}>{profile.bio}</p>}
      </div>

      <div className="profile-stats">
        <div className="profile-stat"><div className="profile-stat-num">{profile.total_entries}</div><div className="profile-stat-lbl">Photos</div></div>
        <div className="profile-stat"><div className="profile-stat-num">{profile.current_day}</div><div className="profile-stat-lbl">Days</div></div>
        <div className="profile-stat"><div className="profile-stat-num">{profile.milestones_achieved?.length || 0}</div><div className="profile-stat-lbl">Milestones</div></div>
      </div>

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

  useEffect(() => {
    if (token) getMe().then((r) => setProfile(r.data)).catch(() => {});
  }, [token, journalKey]);

  if (!token) return <><style>{css}</style><AuthScreen /></>;

  const navItems = [
    { id: "journal", icon: "📔", label: "Journey" },
    { id: "explore", icon: "🔍", label: "Explore" },
    { id: "profile", icon: "👤", label: "Profile" },
  ];

  return (
    <>
      <style>{css}</style>
      <div className="shell">
        <div className="top-bar">
          <div className="app-logo">✦ Glow Journal</div>
          <div className="avatar-btn">🌿</div>
        </div>

        <div className="content">
          {tab === "journal" && <JournalTab profile={profile} onRefresh={journalKey} />}
          {tab === "explore" && <ExploreTab />}
          {tab === "profile" && <ProfileTab profile={profile} onShare={() => setShowShare(true)} />}
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
      </div>
    </>
  );
}
