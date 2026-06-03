import React, { useRef, useState, useCallback, useEffect } from "react";
import { capturePhoto, listTempPhotos, deleteTempPhoto, confirmPhotos, searchProducts } from "../services/api";

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600&display=swap');

  .cam-overlay { position:fixed; inset:0; background:#0a0a0a; z-index:1000; display:flex; flex-direction:column; font-family:'DM Sans',sans-serif; }
  .cam-header { display:flex; align-items:center; justify-content:space-between; padding:16px 20px; }
  .cam-title { color:#fff; font-size:18px; font-weight:600; }
  .cam-close { background:rgba(255,255,255,.12); border:none; color:#fff; width:36px; height:36px; border-radius:50%; font-size:20px; cursor:pointer; display:flex; align-items:center; justify-content:center; }
  
  /* VIEWFINDER */
  .cam-viewfinder { flex:1; position:relative; overflow:hidden; }
  .cam-video { width:100%; height:100%; object-fit:cover; }
  .cam-guide { position:absolute; inset:40px; border:2px solid rgba(255,210,163,.4); border-radius:20px; pointer-events:none; }
  .cam-guide::before,.cam-guide::after { content:''; position:absolute; width:24px; height:24px; border-color:rgba(255,210,163,.9); border-style:solid; }
  .cam-guide::before { top:-2px; left:-2px; border-width:3px 0 0 3px; border-radius:4px 0 0 0; }
  .cam-guide::after { bottom:-2px; right:-2px; border-width:0 3px 3px 0; border-radius:0 0 4px 0; }
  .day-badge { position:absolute; top:20px; left:50%; transform:translateX(-50%); background:rgba(0,0,0,.55); backdrop-filter:blur(8px); color:#ffd2a3; font-size:13px; font-weight:600; padding:6px 16px; border-radius:20px; letter-spacing:.5px; }
  
  /* CONTROLS */
  .cam-controls { padding:24px 20px 40px; display:flex; align-items:center; justify-content:space-between; }
  .cam-gallery-strip { display:flex; gap:8px; overflow-x:auto; max-width:160px; }
  .cam-thumb { width:44px; height:44px; border-radius:10px; object-fit:cover; border:2px solid transparent; cursor:pointer; flex-shrink:0; }
  .cam-thumb.selected { border-color:#ffd2a3; }
  .shutter-btn { width:72px; height:72px; border-radius:50%; background:#fff; border:4px solid rgba(255,255,255,.3); cursor:pointer; transition:transform .1s; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
  .shutter-btn:active { transform:scale(.9); }
  .shutter-inner { width:56px; height:56px; border-radius:50%; background:#fff; }
  .cam-flip-btn { background:rgba(255,255,255,.12); border:none; color:#fff; width:44px; height:44px; border-radius:50%; font-size:22px; cursor:pointer; }
  
  /* REVIEW SCREEN */
  .review-screen { position:fixed; inset:0; background:#0a0a0a; z-index:1001; display:flex; flex-direction:column; font-family:'DM Sans',sans-serif; }
  .review-header { display:flex; align-items:center; justify-content:space-between; padding:16px 20px; }
  .review-title { color:#fff; font-size:18px; font-weight:600; }
  .review-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:3px; padding:0 3px; overflow-y:auto; flex:1; }
  .review-cell { position:relative; aspect-ratio:1; }
  .review-cell img { width:100%; height:100%; object-fit:cover; }
  .review-cell .del-btn { position:absolute; top:6px; right:6px; background:rgba(0,0,0,.7); border:none; color:#fff; width:28px; height:28px; border-radius:50%; font-size:16px; cursor:pointer; display:flex; align-items:center; justify-content:center; }
  .day-tag { position:absolute; bottom:6px; left:6px; background:#ffd2a3; color:#1a1a1a; font-size:10px; font-weight:700; padding:2px 8px; border-radius:10px; }
  
  /* PRODUCT PICKER */
  .product-section { background:#151515; padding:16px 20px; border-top:1px solid #222; }
  .product-section h4 { color:#aaa; font-size:12px; text-transform:uppercase; letter-spacing:1px; margin:0 0 10px; }
  .product-search-input { width:100%; background:#222; border:1px solid #333; color:#fff; border-radius:10px; padding:9px 14px; font-size:14px; outline:none; box-sizing:border-box; }
  .product-search-input::placeholder { color:#555; }
  .product-results { margin-top:8px; max-height:120px; overflow-y:auto; }
  .product-result-item { padding:8px 12px; color:#ddd; font-size:13px; cursor:pointer; border-radius:8px; display:flex; justify-content:space-between; }
  .product-result-item:hover { background:#222; }
  .product-result-item .brand { color:#888; font-size:11px; }
  .product-tags { display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; }
  .product-tag { background:#ffd2a3; color:#1a1a1a; font-size:11px; font-weight:600; padding:4px 10px; border-radius:12px; display:flex; align-items:center; gap:4px; }
  .product-tag button { background:none; border:none; cursor:pointer; font-size:14px; padding:0; line-height:1; color:#1a1a1a; }

  /* CTA */
  .confirm-bar { padding:12px 20px 32px; display:flex; gap:10px; }
  .btn-retake { flex:1; background:#222; color:#fff; border:none; border-radius:14px; padding:14px; font-size:15px; font-weight:600; cursor:pointer; }
  .btn-upload { flex:2; background:linear-gradient(135deg,#ffd2a3,#ffb366); color:#1a1a1a; border:none; border-radius:14px; padding:14px; font-size:15px; font-weight:700; cursor:pointer; }
  .btn-upload:disabled { opacity:.5; cursor:default; }
  .loading-ring { display:inline-block; width:18px; height:18px; border:3px solid rgba(0,0,0,.2); border-top-color:#1a1a1a; border-radius:50%; animation:spin .7s linear infinite; vertical-align:middle; margin-right:6px; }
  @keyframes spin { to { transform:rotate(360deg); } }
`;

export default function CameraCapture({ currentDay, onDone, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [facingMode, setFacingMode] = useState("user");
  const [phase, setPhase] = useState("camera"); // camera | review
  const [stagedPhotos, setStagedPhotos] = useState([]); // [{tempId, thumbnailUrl, previewUrl}]
  const [uploading, setUploading] = useState(false);
  const [productQuery, setProductQuery] = useState("");
  const [productResults, setProductResults] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [notes, setNotes] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [searching, setSearching] = useState(false);

  // Start camera
  const startCamera = useCallback(async () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      alert("Camera access denied. Please allow camera permissions.");
    }
  }, [facingMode]);

  useEffect(() => {
    startCamera();
    return () => streamRef.current?.getTracks().forEach((t) => t.stop());
  }, [startCamera]);

  // Load existing temp photos
  useEffect(() => {
    listTempPhotos().then((r) =>
      setStagedPhotos(
        r.data.map((p) => ({ tempId: p.id, thumbnailUrl: p.thumbnail_url, previewUrl: p.preview_url }))
      )
    ).catch(() => {});
  }, []);

  const takePhoto = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    canvas.toBlob(async (blob) => {
      const file = new File([blob], `photo_${Date.now()}.jpg`, { type: "image/jpeg" });
      try {
        const res = await capturePhoto(file);
        setStagedPhotos((prev) => [
          ...prev,
          { tempId: res.data.temp_id, thumbnailUrl: res.data.thumbnail_url, previewUrl: res.data.preview_url },
        ]);
      } catch { alert("Failed to stage photo. Try again."); }
    }, "image/jpeg", 0.92);
  };

  const removePhoto = async (tempId) => {
    await deleteTempPhoto(tempId).catch(() => {});
    setStagedPhotos((prev) => prev.filter((p) => p.tempId !== tempId));
  };

  // Product search
  useEffect(() => {
    if (!productQuery.trim()) { setProductResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const r = await searchProducts(productQuery);
        setProductResults(r.data);
      } finally { setSearching(false); }
    }, 400);
    return () => clearTimeout(t);
  }, [productQuery]);

  const addProduct = (p) => {
    if (!selectedProducts.find((x) => x.id === p.id)) {
      setSelectedProducts((prev) => [...prev, p]);
    }
    setProductQuery("");
    setProductResults([]);
  };

  const removeProduct = (id) => setSelectedProducts((prev) => prev.filter((p) => p.id !== id));

  const handleConfirm = async () => {
    if (!stagedPhotos.length) return;
    setUploading(true);
    try {
      await confirmPhotos(
        stagedPhotos.map((p) => ({
          temp_id: p.tempId,
          notes,
          is_public: isPublic,
          product_ids: selectedProducts.map((x) => x.id),
        }))
      );
      onDone?.();
    } catch { alert("Upload failed. Try again."); }
    finally { setUploading(false); }
  };

  return (
    <>
      <style>{styles}</style>
      {phase === "camera" && (
        <div className="cam-overlay">
          <div className="cam-header">
            <button className="cam-close" onClick={onClose}>✕</button>
            <span className="cam-title">Capture</span>
            <button
              className="cam-close"
              onClick={() => setFacingMode((m) => m === "user" ? "environment" : "user")}
            >⟳</button>
          </div>

          <div className="cam-viewfinder">
            <video ref={videoRef} className="cam-video" autoPlay playsInline muted />
            <canvas ref={canvasRef} style={{ display: "none" }} />
            <div className="cam-guide" />
            <div className="day-badge">Day {currentDay}</div>
          </div>

          <div className="cam-controls">
            <div className="cam-gallery-strip">
              {stagedPhotos.slice(-3).map((p) => (
                <img key={p.tempId} src={p.thumbnailUrl} className="cam-thumb" alt="" />
              ))}
            </div>
            <button className="shutter-btn" onClick={takePhoto}>
              <div className="shutter-inner" />
            </button>
            <button
              className="cam-close"
              style={{ width: 44, height: 44, fontSize: 15, background: stagedPhotos.length ? "#ffd2a3" : "rgba(255,255,255,.12)", color: stagedPhotos.length ? "#1a1a1a" : "#fff" }}
              onClick={() => stagedPhotos.length && setPhase("review")}
            >
              {stagedPhotos.length > 0 ? `${stagedPhotos.length} ✓` : "·"}
            </button>
          </div>
        </div>
      )}

      {phase === "review" && (
        <div className="review-screen">
          <div className="review-header">
            <button className="cam-close" style={{ background: "#222" }} onClick={() => setPhase("camera")}>←</button>
            <span className="review-title">Review ({stagedPhotos.length})</span>
            <label style={{ color: "#ffd2a3", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
              <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
              Public
            </label>
          </div>

          <div className="review-grid">
            {stagedPhotos.map((p) => (
              <div key={p.tempId} className="review-cell">
                <img src={p.previewUrl} alt="" />
                <span className="day-tag">Day {currentDay}</span>
                <button className="del-btn" onClick={() => removePhoto(p.tempId)}>✕</button>
              </div>
            ))}
          </div>

          <div className="product-section">
            <h4>Products used today</h4>
            <input
              className="product-search-input"
              placeholder={searching ? "Searching…" : "Search Glow Recipe, CeraVe…"}
              value={productQuery}
              onChange={(e) => setProductQuery(e.target.value)}
            />
            {productResults.length > 0 && (
              <div className="product-results">
                {productResults.map((p) => (
                  <div key={p.id} className="product-result-item" onClick={() => addProduct(p)}>
                    <span>{p.name}</span>
                    <span className="brand">{p.brand}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="product-tags">
              {selectedProducts.map((p) => (
                <span key={p.id} className="product-tag">
                  {p.name} <button onClick={() => removeProduct(p.id)}>×</button>
                </span>
              ))}
            </div>
          </div>

          <div className="confirm-bar">
            <button className="btn-retake" onClick={() => setPhase("camera")}>Add more</button>
            <button className="btn-upload" onClick={handleConfirm} disabled={uploading || !stagedPhotos.length}>
              {uploading && <span className="loading-ring" />}
              {uploading ? "Uploading…" : `Upload ${stagedPhotos.length} photo${stagedPhotos.length !== 1 ? "s" : ""}`}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
