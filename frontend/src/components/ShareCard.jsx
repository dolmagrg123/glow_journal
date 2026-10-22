import React, { useState, useEffect, useRef } from "react";
import { buildShareCard, getMyProducts } from "../services/api";
import html2canvas from "html2canvas";

export default function ShareCard({ onClose }) {
  const [dayFrom, setDayFrom] = useState(1);
  const [dayTo, setDayTo] = useState(30);
  const [availableProducts, setAvailableProducts] = useState([]);
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [caption, setCaption] = useState("");
  const [card, setCard] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const cardRef = useRef(null);

  useEffect(() => {
    getMyProducts(dayFrom, dayTo).then((r) => setAvailableProducts(r.data)).catch(() => {});
  }, [dayFrom, dayTo]);

  const build = async () => {
    setLoading(true); setError("");
    try {
      const r = await buildShareCard({ day_from: dayFrom, day_to: dayTo, product_ids: selectedProductIds, caption });
      setCard(r.data);
    } catch (e) {
      setCard(null);
      setError(e.response?.data?.detail || "Couldn't build the card. Try again.");
    } finally { setLoading(false); }
  };

  const downloadCard = async () => {
    if (!cardRef.current) return;
    // useCORS lets html2canvas draw photos served from the backend's address
    const canvas = await html2canvas(cardRef.current, { scale: 2, backgroundColor: "#0d0d0d", useCORS: true });
    const link = document.createElement("a");
    link.download = `skincare_day${dayFrom}-${dayTo}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const shareNative = async (platform) => {
    const url = card?.share_url || window.location.href;
    const text = `${caption || "My skincare journey"}: ${card?.progress_days} day progress 🌿`;
    const links = {
      instagram: `https://www.instagram.com/`,
      tiktok: `https://www.tiktok.com/`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
    };
    if (platform === "instagram" || platform === "tiktok") {
      await downloadCard();
      window.open(links[platform], "_blank");
    } else {
      window.open(links[platform], "_blank");
    }
  };

  const toggleProduct = (id) => {
    setSelectedProductIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  return (
    <div style={s.overlay}>
      <div style={s.panel}>
        <div style={s.header}>
          <span style={s.title}>Share Progress</span>
          <button style={s.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* DAY RANGE */}
        <div style={s.section}>
          <div style={s.sectionLabel}>Day Range</div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div style={s.dayBox}>
              <label style={s.dayLabel}>From</label>
              <input style={s.dayInput} type="number" min={1} value={dayFrom} onChange={(e) => setDayFrom(+e.target.value)} />
            </div>
            <div style={{ color: "#555", fontSize: 20 }}>→</div>
            <div style={s.dayBox}>
              <label style={s.dayLabel}>To</label>
              <input style={s.dayInput} type="number" min={dayFrom} value={dayTo} onChange={(e) => setDayTo(+e.target.value)} />
            </div>
          </div>
        </div>

        {/* PRODUCTS */}
        {availableProducts.length > 0 && (
          <div style={s.section}>
            <div style={s.sectionLabel}>Feature Products ({availableProducts.length} logged)</div>
            <div style={s.productList}>
              {availableProducts.map((p) => (
                <label key={p.id} style={s.productRow}>
                  <input
                    type="checkbox"
                    checked={selectedProductIds.includes(p.id)}
                    onChange={() => toggleProduct(p.id)}
                    style={{ accentColor: "#ffd2a3" }}
                  />
                  <span style={{ color: "#ddd", fontSize: 13 }}>{p.name}</span>
                  <span style={{ color: "#666", fontSize: 11, marginLeft: "auto" }}>{p.brand}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* CAPTION */}
        <div style={s.section}>
          <div style={s.sectionLabel}>Caption</div>
          <textarea
            style={s.captionInput}
            placeholder="My skin journey so far…"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={2}
          />
        </div>

        <button style={s.buildBtn} onClick={build} disabled={loading}>
          {loading ? "Building card…" : "Preview Card"}
        </button>
        {error && <p style={s.error}>{error}</p>}

        {/* CARD PREVIEW: before / after with "N Day Progress" headline */}
        {card && (
          <>
            <div ref={cardRef} style={s.card}>
              <div style={s.cardTop}>
                <div style={s.cardHandle}>@{card.username}</div>
                <div style={s.cardBrand}>✦ Glow Journal</div>
              </div>

              <div style={s.headline}>
                <span style={s.headlineNum}>{card.progress_days}</span>
                <span style={s.headlineText}>Day<br />Progress</span>
              </div>
              <div style={s.headlineRule} />

              <div style={s.beforeAfter}>
                {[["Before", card.before_photo], ["After", card.after_photo]].map(([label, p]) => (
                  <div key={label} style={s.baCell}>
                    <img src={p.thumbnail_url} alt={`${label}, day ${p.day_number}`} crossOrigin="anonymous" style={s.baImg} />
                    <div style={s.baLabel}>
                      <span style={s.baTitle}>{label}</span>
                      <span style={s.baDay}>Day {p.day_number}</span>
                    </div>
                  </div>
                ))}
              </div>

              {card.products.length > 0 && (
                <>
                  <div style={s.routineLabel}>My routine</div>
                  <div style={s.productPills}>
                    {card.products.slice(0, 6).map((p) => (
                      <span key={p.id} style={s.pill}>{p.brand} · {p.name}</span>
                    ))}
                  </div>
                </>
              )}

              {card.caption && <p style={s.cardCaption}>“{card.caption}”</p>}
              <div style={s.cardFooter}>{card.display_name} · Day {card.before_photo.day_number} → Day {card.after_photo.day_number}</div>
            </div>

            {/* share buttons */}
            <div style={s.shareRow}>
              {[
                { id: "instagram", label: "Instagram", color: "#e1306c" },
                { id: "tiktok", label: "TikTok", color: "#010101" },
                { id: "facebook", label: "Facebook", color: "#1877f2" },
                { id: "twitter", label: "Twitter", color: "#1da1f2" },
              ].map((pl) => (
                <button key={pl.id} style={{ ...s.shareBtn, background: pl.color }} onClick={() => shareNative(pl.id)}>
                  {pl.label}
                </button>
              ))}
              <button style={{ ...s.shareBtn, background: "#333" }} onClick={downloadCard}>⬇ Save</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const s = {
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,.8)", zIndex: 900, display: "flex", alignItems: "flex-end", justifyContent: "center" },
  panel: { background: "#111", borderRadius: "24px 24px 0 0", padding: "24px 20px 40px", width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  title: { color: "#fff", fontSize: 18, fontWeight: 700, fontFamily: "'DM Serif Display',serif" },
  closeBtn: { background: "#222", border: "none", color: "#fff", width: 32, height: 32, borderRadius: "50%", cursor: "pointer" },
  section: { marginBottom: 16 },
  sectionLabel: { color: "#888", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 },
  dayBox: { display: "flex", flexDirection: "column", gap: 4 },
  dayLabel: { color: "#666", fontSize: 11 },
  dayInput: { background: "#1e1e1e", border: "1px solid #333", color: "#fff", borderRadius: 10, padding: "8px 12px", width: 80, fontSize: 16, textAlign: "center" },
  productList: { display: "flex", flexDirection: "column", gap: 4, maxHeight: 150, overflowY: "auto" },
  productRow: { display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 8, cursor: "pointer" },
  captionInput: { width: "100%", background: "#1e1e1e", border: "1px solid #333", color: "#fff", borderRadius: 10, padding: "10px 14px", fontSize: 14, resize: "none", boxSizing: "border-box" },
  buildBtn: { width: "100%", background: "linear-gradient(135deg,#ffd2a3,#ffb366)", color: "#1a1a1a", border: "none", borderRadius: 14, padding: "14px", fontSize: 15, fontWeight: 700, cursor: "pointer", marginBottom: 20 },
  error: { color: "#e74c3c", fontSize: 13, margin: "-8px 0 16px", textAlign: "center" },
  card: { background: "radial-gradient(ellipse at 20% 0%, #2a2116 0%, #0d0d0d 60%)", borderRadius: 24, padding: "22px 20px 18px", border: "1px solid #2a2520", marginBottom: 16 },
  cardTop: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 },
  cardHandle: { color: "#9a8f7f", fontSize: 12, letterSpacing: .5 },
  cardBrand: { color: "#d4a96a", fontSize: 12, fontFamily: "'Cormorant Garamond',serif", letterSpacing: 1 },
  headline: { display: "flex", alignItems: "center", justifyContent: "center", gap: 12 },
  headlineNum: { fontFamily: "'Cormorant Garamond',serif", fontSize: 76, lineHeight: 1, fontWeight: 600, color: "#f0d5a8" },
  headlineText: { fontFamily: "'Cormorant Garamond',serif", fontSize: 26, lineHeight: 1.05, fontStyle: "italic", color: "#e8e3da", textAlign: "left" },
  headlineRule: { width: 48, height: 2, background: "linear-gradient(90deg,#d4a96a,#f0d5a8)", borderRadius: 2, margin: "14px auto 18px" },
  beforeAfter: { display: "flex", gap: 8, marginBottom: 16 },
  baCell: { flex: 1, position: "relative", borderRadius: 14, overflow: "hidden", border: "1px solid #2a2520" },
  baImg: { width: "100%", aspectRatio: "3 / 4", objectFit: "cover", display: "block" },
  baLabel: { position: "absolute", left: 0, right: 0, bottom: 0, padding: "18px 10px 8px", background: "linear-gradient(transparent, rgba(0,0,0,.8))", display: "flex", justifyContent: "space-between", alignItems: "baseline" },
  baTitle: { color: "#fff", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5 },
  baDay: { color: "#f0d5a8", fontSize: 12, fontFamily: "'Cormorant Garamond',serif", fontStyle: "italic" },
  routineLabel: { color: "#7a7060", fontSize: 10, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 6, textAlign: "center" },
  productPills: { display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 6, marginBottom: 12 },
  pill: { background: "rgba(255,255,255,.04)", color: "#ccc", fontSize: 10, padding: "3px 9px", borderRadius: 10, border: "1px solid #2f2a24" },
  cardCaption: { color: "#cfc6b8", fontSize: 15, fontStyle: "italic", fontFamily: "'Cormorant Garamond',serif", textAlign: "center", margin: "4px 0 12px" },
  cardFooter: { color: "#5a5248", fontSize: 10, textAlign: "center", letterSpacing: .5 },
  shareRow: { display: "flex", flexWrap: "wrap", gap: 8 },
  shareBtn: { flex: "1 1 calc(50% - 4px)", color: "#fff", border: "none", borderRadius: 12, padding: "11px 8px", fontSize: 13, fontWeight: 600, cursor: "pointer" },
};
