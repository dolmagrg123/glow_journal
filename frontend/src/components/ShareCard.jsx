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
  const cardRef = useRef(null);

  useEffect(() => {
    getMyProducts(dayFrom, dayTo).then((r) => setAvailableProducts(r.data)).catch(() => {});
  }, [dayFrom, dayTo]);

  const build = async () => {
    setLoading(true);
    try {
      const r = await buildShareCard({ day_from: dayFrom, day_to: dayTo, product_ids: selectedProductIds, caption });
      setCard(r.data);
    } finally { setLoading(false); }
  };

  const downloadCard = async () => {
    if (!cardRef.current) return;
    const canvas = await html2canvas(cardRef.current, { scale: 2, backgroundColor: "#0d0d0d" });
    const link = document.createElement("a");
    link.download = `skincare_day${dayFrom}-${dayTo}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const shareNative = async (platform) => {
    const url = card?.share_url || window.location.href;
    const text = `${caption || "My skincare journey"} — Day ${dayFrom} to Day ${dayTo} 🌿`;
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

        {/* CARD PREVIEW */}
        {card && (
          <>
            <div ref={cardRef} style={s.card}>
              {/* header */}
              <div style={s.cardHeader}>
                <div>
                  <div style={s.cardHandle}>@{card.username}</div>
                  <div style={s.cardName}>{card.display_name}</div>
                </div>
                <div style={s.cardBadge}>Day {card.day_from} → {card.day_to}</div>
              </div>

              {/* photo strip */}
              <div style={s.photoStrip}>
                {card.photos.slice(0, 5).map((p, i) => (
                  <div key={i} style={s.photoCell}>
                    <img src={p.thumbnail_url} alt="" style={s.stripImg} />
                    <div style={s.stripDay}>Day {p.day_number}</div>
                  </div>
                ))}
              </div>

              {/* stats */}
              <div style={s.statsRow}>
                <div style={s.stat}><span style={s.statNum}>{card.total_days_tracked}</span><span style={s.statLbl}>Photos</span></div>
                <div style={s.stat}><span style={s.statNum}>{card.day_to - card.day_from + 1}</span><span style={s.statLbl}>Day streak</span></div>
                <div style={s.stat}><span style={s.statNum}>{card.products.length}</span><span style={s.statLbl}>Products</span></div>
              </div>

              {/* products */}
              {card.products.length > 0 && (
                <div style={s.productPills}>
                  {card.products.slice(0, 6).map((p) => (
                    <span key={p.id} style={s.pill}>{p.name}</span>
                  ))}
                </div>
              )}

              {card.caption && <p style={s.cardCaption}>"{card.caption}"</p>}
              <div style={s.cardFooter}>skincaretracker.app/{card.username}</div>
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
  card: { background: "#0d0d0d", borderRadius: 20, padding: 20, border: "1px solid #222", marginBottom: 16 },
  cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  cardHandle: { color: "#888", fontSize: 12 },
  cardName: { color: "#fff", fontSize: 18, fontWeight: 700, fontFamily: "'DM Serif Display',serif" },
  cardBadge: { background: "#ffd2a3", color: "#1a1a1a", borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 700 },
  photoStrip: { display: "flex", gap: 4, marginBottom: 16 },
  photoCell: { flex: 1, position: "relative" },
  stripImg: { width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: 8 },
  stripDay: { position: "absolute", bottom: 4, left: 4, background: "rgba(0,0,0,.7)", color: "#ffd2a3", fontSize: 9, fontWeight: 700, padding: "2px 5px", borderRadius: 6 },
  statsRow: { display: "flex", justifyContent: "space-around", marginBottom: 14, paddingBottom: 14, borderBottom: "1px solid #222" },
  stat: { display: "flex", flexDirection: "column", alignItems: "center", gap: 2 },
  statNum: { color: "#ffd2a3", fontSize: 22, fontWeight: 700 },
  statLbl: { color: "#666", fontSize: 11 },
  productPills: { display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 },
  pill: { background: "#1e1e1e", color: "#ccc", fontSize: 10, padding: "3px 8px", borderRadius: 10, border: "1px solid #333" },
  cardCaption: { color: "#bbb", fontSize: 13, fontStyle: "italic", margin: "0 0 12px" },
  cardFooter: { color: "#444", fontSize: 10, textAlign: "center" },
  shareRow: { display: "flex", flexWrap: "wrap", gap: 8 },
  shareBtn: { flex: "1 1 calc(50% - 4px)", color: "#fff", border: "none", borderRadius: 12, padding: "11px 8px", fontSize: 13, fontWeight: 600, cursor: "pointer" },
};
