import React, { useState, useEffect, useCallback } from "react";
import {
  getUserProfile, getUserEntries, followUser, unfollowUser, searchUsers,
  getFollowers, getFollowing, getFollowRequests, acceptFollowRequest,
  declineFollowRequest, removeFollower,
} from "../services/api";

export const socialStyles = `
  /* OVERLAYS */
  .soc-overlay { position:fixed; inset:0; background:var(--bg); z-index:900; overflow-y:auto; }
  .soc-sheet-bg { position:fixed; inset:0; background:rgba(0,0,0,.6); z-index:950; display:flex; align-items:flex-end; justify-content:center; }
  .soc-sheet { width:100%; max-width:480px; max-height:75vh; background:var(--surface); border-radius:20px 20px 0 0; border:1px solid var(--border); display:flex; flex-direction:column; }
  .soc-inner { max-width:480px; margin:0 auto; padding:16px 20px 60px; }
  .soc-head { display:flex; align-items:center; justify-content:space-between; padding:16px 20px; border-bottom:1px solid var(--border); }
  .soc-head-title { font-weight:600; font-size:15px; }
  .soc-close { background:var(--surface); border:1px solid var(--border); color:var(--text); width:34px; height:34px; border-radius:50%; font-size:16px; cursor:pointer; }
  .soc-list { overflow-y:auto; padding:8px 20px 24px; }

  /* PEOPLE ROWS */
  .person-row { display:flex; align-items:center; gap:12px; padding:10px 0; border-bottom:1px solid var(--border); }
  .person-row:last-child { border-bottom:none; }
  .person-avatar { width:42px; height:42px; border-radius:50%; background:var(--bg); border:1px solid var(--border); display:flex; align-items:center; justify-content:center; overflow:hidden; flex-shrink:0; cursor:pointer; }
  .person-avatar img { width:100%; height:100%; object-fit:cover; }
  .person-info { flex:1; min-width:0; cursor:pointer; }
  .person-name { font-size:14px; font-weight:600; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .person-handle { font-size:12px; color:var(--muted); }
  .person-actions { display:flex; gap:6px; }

  /* BUTTONS */
  .follow-btn { border-radius:10px; padding:7px 16px; font-size:13px; font-weight:600; cursor:pointer; border:1px solid var(--accent); background:var(--accent); color:#0f0e0c; white-space:nowrap; }
  .follow-btn.secondary { background:transparent; color:var(--text); border-color:var(--border); }
  .follow-btn.wide { width:100%; padding:11px; font-size:14px; }
  .follow-btn:disabled { opacity:.5; }

  /* OTHER USER PROFILE */
  .stat-click { cursor:pointer; }
  .private-box { text-align:center; padding:40px 20px; border-top:1px solid var(--border); margin-top:20px; color:var(--muted); }
  .private-icon { font-size:40px; margin-bottom:12px; }
  .private-title { color:var(--text); font-weight:600; margin-bottom:4px; }

  /* SETTINGS ROW */
  .setting-row { display:flex; align-items:center; justify-content:space-between; background:var(--surface); border:1px solid var(--border); border-radius:14px; padding:14px 16px; margin-top:12px; cursor:pointer; }
  .setting-label { font-size:14px; }
  .setting-sub { font-size:11px; color:var(--muted); margin-top:2px; }
  .switch { width:44px; height:26px; border-radius:13px; background:var(--border); position:relative; transition:background .2s; flex-shrink:0; }
  .switch::after { content:''; position:absolute; top:3px; left:3px; width:20px; height:20px; border-radius:50%; background:#fff; transition:left .2s; }
  .switch.on { background:var(--accent); }
  .switch.on::after { left:21px; }
  .req-badge { background:var(--danger); color:#fff; border-radius:10px; font-size:11px; font-weight:700; padding:2px 8px; }
`;

const Spinner = () => <div style={{ textAlign: "center", padding: 30 }}><div className="spin" /></div>;

function Avatar({ url, onClick }) {
  return <div className="person-avatar" onClick={onClick}>{url ? <img src={url} alt="" /> : "🌿"}</div>;
}

// ── Follow button: Follow / Requested / Following ────────────────────────────

export function FollowButton({ username, status, wide, onChange }) {
  const [busy, setBusy] = useState(false);
  if (status === "self") return null;

  const click = async () => {
    if (status === "following" && !window.confirm(`Unfollow @${username}?`)) return;
    setBusy(true);
    try {
      const r = status === "none" ? await followUser(username) : await unfollowUser(username);
      onChange?.(r.data.status);
    } catch {
      alert("Something went wrong. Try again.");
    } finally { setBusy(false); }
  };

  const label = status === "following" ? "Following" : status === "requested" ? "Requested" : "Follow";
  return (
    <button className={`follow-btn ${status !== "none" ? "secondary" : ""} ${wide ? "wide" : ""}`} disabled={busy} onClick={click}>
      {label}
    </button>
  );
}

// ── A row in any people list ─────────────────────────────────────────────────

function PersonRow({ person, onOpenUser, children }) {
  const open = () => onOpenUser(person.username);
  return (
    <div className="person-row">
      <Avatar url={person.avatar_url} onClick={open} />
      <div className="person-info" onClick={open}>
        <div className="person-name">{person.display_name}{!person.is_profile_public && " 🔒"}</div>
        <div className="person-handle">@{person.username}</div>
      </div>
      <div className="person-actions">{children}</div>
    </div>
  );
}

// ── Bottom sheet listing people (followers, following, requests) ─────────────

function PeopleSheet({ title, load, onClose, emptyText, renderActions }) {
  const [people, setPeople] = useState(null);
  const [error, setError] = useState("");

  const reload = useCallback(() => {
    load().then((r) => setPeople(r.data)).catch((e) => setError(e.response?.data?.detail || "Couldn't load."));
  }, [load]);
  useEffect(reload, [reload]);

  const drop = (username) => setPeople((prev) => prev.filter((p) => p.username !== username));

  return (
    <div className="soc-sheet-bg" onClick={onClose}>
      <div className="soc-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="soc-head">
          <div className="soc-head-title">{title}</div>
          <button className="soc-close" onClick={onClose}>✕</button>
        </div>
        <div className="soc-list">
          {error ? <div className="empty-state">{error}</div>
            : people === null ? <Spinner />
            : people.length === 0 ? <div className="empty-state"><div className="empty-text">{emptyText}</div></div>
            : people.map((p) => renderActions(p, drop))}
        </div>
      </div>
    </div>
  );
}

export function FollowersSheet({ username, isMine, onClose, onOpenUser, onChanged }) {
  const load = useCallback(() => getFollowers(username), [username]);
  return (
    <PeopleSheet title="Followers" load={load} onClose={onClose} emptyText="No followers yet."
      renderActions={(p, drop) => (
        <PersonRow key={p.username} person={p} onOpenUser={onOpenUser}>
          {isMine ? (
            <button className="follow-btn secondary" onClick={async () => {
              if (!window.confirm(`Remove @${p.username} from your followers?`)) return;
              await removeFollower(p.username).catch(() => {});
              drop(p.username); onChanged?.();
            }}>Remove</button>
          ) : <FollowButton username={p.username} status={p.follow_status} />}
        </PersonRow>
      )}
    />
  );
}

export function FollowingSheet({ username, onClose, onOpenUser, onChanged }) {
  const load = useCallback(() => getFollowing(username), [username]);
  return (
    <PeopleSheet title="Following" load={load} onClose={onClose} emptyText="Not following anyone yet."
      renderActions={(p) => (
        <PersonRow key={p.username} person={p} onOpenUser={onOpenUser}>
          <FollowButton username={p.username} status={p.follow_status} onChange={onChanged} />
        </PersonRow>
      )}
    />
  );
}

export function FollowRequestsSheet({ onClose, onOpenUser, onChanged }) {
  const load = useCallback(() => getFollowRequests(), []);
  const act = async (fn, username, drop) => {
    await fn(username).catch(() => {});
    drop(username); onChanged?.();
  };
  return (
    <PeopleSheet title="Follow requests" load={load} onClose={onClose} emptyText="No pending requests."
      renderActions={(p, drop) => (
        <PersonRow key={p.username} person={p} onOpenUser={onOpenUser}>
          <button className="follow-btn" onClick={() => act(acceptFollowRequest, p.username, drop)}>Confirm</button>
          <button className="follow-btn secondary" onClick={() => act(declineFollowRequest, p.username, drop)}>Delete</button>
        </PersonRow>
      )}
    />
  );
}

// ── Search people by username ────────────────────────────────────────────────

export function PeopleSearch({ onOpenUser }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const term = q.trim().replace(/^@/, "");
    if (!term) { setResults([]); return; }
    setLoading(true);
    const t = setTimeout(() => {
      searchUsers(term).then((r) => setResults(r.data)).catch(() => setResults([])).finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const setStatus = (username, status) =>
    setResults((prev) => prev.map((p) => (p.username === username ? { ...p, follow_status: status } : p)));

  return (
    <div>
      <input className="search-bar" placeholder="Search by username…" value={q} onChange={(e) => setQ(e.target.value)} autoCapitalize="none" autoCorrect="off" />
      {loading ? <Spinner />
        : q.trim() && results.length === 0 ? <div className="empty-state"><div className="empty-text">No users found.</div></div>
        : results.map((p) => (
          <PersonRow key={p.username} person={p} onOpenUser={onOpenUser}>
            <FollowButton username={p.username} status={p.follow_status} onChange={(s) => setStatus(p.username, s)} />
          </PersonRow>
        ))}
    </div>
  );
}

// ── Someone else's profile (full screen) ─────────────────────────────────────

export function UserProfileView({ username, onClose, onOpenUser }) {
  const [profile, setProfile] = useState(null);
  const [entries, setEntries] = useState([]);
  const [error, setError] = useState("");
  const [sheet, setSheet] = useState(null); // "followers" | "following"

  const load = useCallback(async () => {
    try {
      const p = (await getUserProfile(username)).data;
      setProfile(p);
      setEntries(p.can_view ? (await getUserEntries(username, 0, 60)).data : []);
    } catch (e) {
      setError(e.response?.status === 404 ? "User not found." : "Couldn't load this profile.");
    }
  }, [username]);

  useEffect(() => { setProfile(null); setError(""); setSheet(null); load(); }, [load]);

  const openFromSheet = (u) => { setSheet(null); onOpenUser(u); };

  return (
    <div className="soc-overlay">
      <div className="soc-inner">
        <button className="soc-close" onClick={onClose} aria-label="Back">←</button>
        {error ? <div className="empty-state">{error}</div> : !profile ? <Spinner /> : (
          <>
            <div className="profile-header">
              <div className="profile-avatar">{profile.avatar_url ? <img src={profile.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "🌿"}</div>
              <div className="profile-name">{profile.display_name}</div>
              <div className="profile-username">@{profile.username}{!profile.is_profile_public && " 🔒"}</div>
              {profile.bio && <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 8 }}>{profile.bio}</p>}
            </div>

            <div className="profile-stats">
              <div className="profile-stat"><div className="profile-stat-num">{profile.total_entries}</div><div className="profile-stat-lbl">Photos</div></div>
              <div className={`profile-stat ${profile.can_view ? "stat-click" : ""}`} onClick={() => profile.can_view && setSheet("followers")}>
                <div className="profile-stat-num">{profile.followers_count}</div><div className="profile-stat-lbl">Followers</div>
              </div>
              <div className={`profile-stat ${profile.can_view ? "stat-click" : ""}`} onClick={() => profile.can_view && setSheet("following")}>
                <div className="profile-stat-num">{profile.following_count}</div><div className="profile-stat-lbl">Following</div>
              </div>
            </div>

            <FollowButton wide username={profile.username} status={profile.follow_status} onChange={load} />

            {!profile.can_view ? (
              <div className="private-box">
                <div className="private-icon">🔒</div>
                <div className="private-title">This account is private</div>
                <div>Follow this account to see their journey.</div>
              </div>
            ) : entries.length === 0 ? (
              <div className="empty-state"><div className="empty-text">No public photos yet.</div></div>
            ) : (
              <div className="photo-grid" style={{ marginTop: 20 }}>
                {entries.map((e) => (
                  <div key={e.id} className="photo-cell">
                    <img src={e.thumbnail_url} alt={`Day ${e.day_number}`} />
                    <div className="photo-day-badge">Day {e.day_number}</div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      {sheet === "followers" && <FollowersSheet username={username} onClose={() => setSheet(null)} onOpenUser={openFromSheet} />}
      {sheet === "following" && <FollowingSheet username={username} onClose={() => setSheet(null)} onOpenUser={openFromSheet} />}
    </div>
  );
}
