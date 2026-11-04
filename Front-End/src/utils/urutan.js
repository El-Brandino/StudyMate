// Utilitas pengurutan daftar untuk halaman siswa
// (pengumuman, tugas, dan ujian).

/** Pilihan urutan: Terdekat (default), Terlama, dan Abjad. */
export const URUTAN_OPTIONS = [
  { nilai: "terdekat", label: "Terdekat" },
  { nilai: "terlama", label: "Terlama" },
  { nilai: "abjad", label: "Abjad (A–Z)" },
];

/**
 * Ubah sebuah tanggal menjadi milidetik.
 * Tanggal kosong/tidak valid mengembalikan Infinity supaya selalu
 * berada di urutan paling akhir.
 */
export function waktuTanggal(value) {
  if (!value) return Number.POSITIVE_INFINITY;

  const waktu = new Date(value).getTime();

  return Number.isNaN(waktu) ? Number.POSITIVE_INFINITY : waktu;
}

/**
 * Pembanding untuk Array.prototype.sort.
 *
 * @param {object} a          item pertama
 * @param {object} b          item kedua
 * @param {string} urutan     "terdekat" | "terlama" | "abjad"
 * @param {(item) => number} ambilWaktu  waktu acuan tiap item dalam ms
 * @param {number} arahTerdekat arah untuk "terdekat": 1 = tanggal paling
 *   awal dulu (tugas/ujian), -1 = tanggal paling baru dulu (pengumuman)
 */
export function bandingkanUrutan(a, b, urutan, ambilWaktu, arahTerdekat = 1) {
  if (urutan === "abjad") {
    return String(a?.title ?? "").localeCompare(String(b?.title ?? ""), "id", {
      sensitivity: "base",
    });
  }

  const waktuA = ambilWaktu(a);
  const waktuB = ambilWaktu(b);

  // Item tanpa tanggal selalu ditaruh di akhir.
  if (!Number.isFinite(waktuA) && !Number.isFinite(waktuB)) return 0;
  if (!Number.isFinite(waktuA)) return 1;
  if (!Number.isFinite(waktuB)) return -1;
  if (waktuA === waktuB) return 0;

  const arah = (urutan === "terlama" ? -1 : 1) * arahTerdekat;

  return (waktuA - waktuB) * arah;
}

