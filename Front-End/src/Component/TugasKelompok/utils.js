export const STATUS_LABELS = {
  belum_dikerjakan: "Belum Dikerjakan",
  sedang_dikerjakan: "Sedang Dikerjakan",
  menunggu_review: "Menunggu Review",
  selesai: "Selesai",
};

export const STATUS_OPTIONS = Object.entries(STATUS_LABELS).map(
  ([value, label]) => ({ value, label }),
);

export const formatDate = (value) => {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

export const formatDateTime = (value) => {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const toDateTimeInput = (value) => {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const pad = (number) => String(number).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export const isOverdue = (value, status) => {
  if (status === "selesai" || !value) return false;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;

  return date.getTime() < Date.now();
};

export const daysUntil = (value) => {
  if (!value) return null;

  const deadline = new Date(value);
  if (Number.isNaN(deadline.getTime())) return null;

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  deadline.setHours(0, 0, 0, 0);

  return Math.round((deadline - start) / (24 * 60 * 60 * 1000));
};

export const deadlineLabel = (value) => {
  const days = daysUntil(value);

  if (days === null) return "Tanpa deadline";
  if (days < 0) return `Terlambat ${Math.abs(days)} hari`;
  if (days === 0) return "Deadline hari ini";
  if (days === 1) return "Deadline besok";
  return `H-${days}`;
};

export const kelasLabel = (kelas) => {
  if (!kelas) return "-";
  return `${kelas.grade ?? ""} ${kelas.major?.name ?? ""} ${
    kelas.class_number ?? ""
  }`
    .replace(/\s+/g, " ")
    .trim();
};

export const getErrorMessage = (error, fallback = "Terjadi kesalahan.") => {
  const data = error?.response?.data;
  const firstError = data?.errors
    ? Object.values(data.errors).flat().filter(Boolean)[0]
    : null;

  return firstError || data?.message || fallback;
};
