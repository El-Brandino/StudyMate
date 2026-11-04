const STORAGE_BASE_URL =
  import.meta.env.VITE_STORAGE_BASE_URL ??
  "http://localhost/StudyMate-Proj/Back-End/public/storage";

/**
 * Ubah path file dari backend (mis. "tugas/xyz.pdf") menjadi URL publik.
 * Path absolut (http/https) akan dikembalikan apa adanya.
 */
export default function storageUrl(path) {
  if (!path) return null;

  if (/^https?:\/\//i.test(path)) return path;

  return `${STORAGE_BASE_URL}/${String(path).replace(/^\/+/, "")}`;
}
