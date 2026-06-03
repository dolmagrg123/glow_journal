import axios from "axios";

// In dev: uses the proxy in package.json (localhost:8000)
// In iPhone dev: uses REACT_APP_API_URL (your laptop's IP)
// In prod: uses REACT_APP_API_URL (your deployed backend URL)
const BASE_URL = process.env.REACT_APP_API_URL
  ? `${process.env.REACT_APP_API_URL}/api/v1`
  : "/api/v1";

const API = axios.create({ baseURL: BASE_URL });

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Auth ──────────────────────────────────────────────────────────────────────
export const register = (data) => API.post("/auth/register", data);
export const login    = (data) => API.post("/auth/login", data);

// ── Photos ────────────────────────────────────────────────────────────────────
export const capturePhoto    = (file) => { const fd = new FormData(); fd.append("file", file); return API.post("/photos/capture", fd); };
export const listTempPhotos  = ()     => API.get("/photos/temp");
export const deleteTempPhoto = (id)   => API.delete(`/photos/temp/${id}`);
export const confirmPhotos   = (photos) => API.post("/photos/confirm", { photos });
export const getJournal      = (skip = 0, limit = 60) => API.get("/photos/journal", { params: { skip, limit } });
export const deleteEntry     = (id)   => API.delete(`/photos/${id}`);

// ── Products ──────────────────────────────────────────────────────────────────
export const searchProducts = (q)    => API.get("/products/search", { params: { q } });
export const createProduct  = (data) => API.post("/products/", data);

// ── Users ─────────────────────────────────────────────────────────────────────
export const getMe          = ()         => API.get("/users/me");
export const updateMe       = (data)     => API.patch("/users/me", data);
export const getUserProfile = (username) => API.get(`/users/${username}`);
export const getUserEntries = (username, skip = 0, limit = 40) => API.get(`/users/${username}/entries`, { params: { skip, limit } });
export const followUser     = (username) => API.post(`/users/${username}/follow`);
export const unfollowUser   = (username) => API.delete(`/users/${username}/follow`);

// ── Explore ───────────────────────────────────────────────────────────────────
export const exploreFeed = (product, concern, skip = 0, limit = 24) =>
  API.get("/explore/feed", { params: { product, concern, skip, limit } });

// ── Share ─────────────────────────────────────────────────────────────────────
export const buildShareCard = (data)           => API.post("/share/card", data);
export const getMyProducts  = (dayFrom, dayTo) => API.get("/share/my-products", { params: { day_from: dayFrom, day_to: dayTo } });
