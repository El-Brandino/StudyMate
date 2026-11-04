// Utilitas bersama halaman jadwal ujian (guru & siswa).

/**
 * Ambil bagian tanggal "YYYY-MM-DD" dari exam_date.
 * API bisa mengirim "2026-11-10" maupun ISO
 * "2026-11-10T00:00:00.000000Z".
 */
export function getExamDatePart(value) {
  const text = String(value ?? "").trim();
  const match = text.match(/^(\d{4}-\d{2}-\d{2})/);

  return match ? match[1] : "";
}

/**
 * Waktu mulai ujian dalam milidetik (local time).
 * Mengembalikan Infinity bila tanggalnya tidak ada / tidak valid,
 * supaya jadwal tanpa tanggal selalu berada di urutan paling akhir.
 */
export function getExamDateTime(ujian) {
  const datePart = getExamDatePart(ujian?.exam_date);

  if (!datePart) return Number.POSITIVE_INFINITY;

  const timePart = String(ujian.start_time || "00:00").slice(0, 5);
  const parsed = new Date(`${datePart}T${timePart}:00`);

  return Number.isNaN(parsed.getTime()) ? Number.POSITIVE_INFINITY : parsed.getTime();
}

/** Format tanggal ujian, mis. "10 November 2026". */
export function formatExamDate(value) {
  const datePart = getExamDatePart(value);

  if (!datePart) return "-";

  return new Date(`${datePart}T00:00:00`).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Format jam mulai, mis. "08:00". */
export function formatExamTime(value) {
  if (!value) return "-";

  return String(value).slice(0, 5);
}

/** Status jadwal: "Akan datang" | "Sedang berlangsung" | "Selesai". */
export function getExamStatus(ujian) {
  const waktuMulai = getExamDateTime(ujian);

  if (!Number.isFinite(waktuMulai)) return "Jadwal belum tersedia";

  const sekarang = Date.now();
  const waktuSelesai = waktuMulai + Number(ujian.duration ?? 0) * 60000;

  if (sekarang < waktuMulai) return "Akan datang";
  if (sekarang <= waktuSelesai) return "Sedang berlangsung";

  return "Selesai";
}

/**
 * Kelas CSS badge status:
 * "upcoming" | "ongoing" | "completed" | "unavailable".
 */
export function getExamStatusClass(ujian) {
  const status = getExamStatus(ujian);

  if (status === "Akan datang") return "upcoming";
  if (status === "Sedang berlangsung") return "ongoing";
  if (status === "Selesai") return "completed";

  return "unavailable";
}

/** True bila ujian dimulai dalam 5 hari ke depan. */
export function isExamWithinFiveDays(ujian) {
  const waktuMulai = getExamDateTime(ujian);

  if (!Number.isFinite(waktuMulai)) return false;

  const selisih = waktuMulai - Date.now();

  return selisih >= 0 && selisih <= 5 * 24 * 60 * 60 * 1000;
}

/** Daftar kelas tujuan, mis. "XI RPL Kelas 1, XI RPL Kelas 2". */
export function formatExamClasses(daftarKelas) {
  const daftar = Array.isArray(daftarKelas) ? daftarKelas : [];

  return (
    daftar
      .map((kelas) =>
        [
          kelas.grade,
          kelas.major?.name ?? kelas.major_name,
          `Kelas ${kelas.class_number}`,
        ]
          .filter(Boolean)
          .join(" "),
      )
      .join(", ") || "-"
  );
}
