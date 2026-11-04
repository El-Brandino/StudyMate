import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../../api/axios";
import storageUrl from "../../api/storage";
import { URUTAN_OPTIONS, bandingkanUrutan, waktuTanggal } from "../../utils/urutan";
import { AnnouncementListSkeleton } from "../Common/Skeleton.jsx";

export default function PengumumanStd() {
  const [pengumuman, setPengumuman] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sortBy, setSortBy] = useState("terdekat");
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);

  const fetchPengumuman = useCallback(async () => {
    try {
      setError("");

      const response = await api.get("/pengumuman");

      setPengumuman(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error("Gagal mengambil pengumuman:", err);

      setError(
        err.response?.data?.message ||
          "Pengumuman gagal dimuat. Periksa koneksi API.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // Ambil data pertama kali dan perbarui setiap 10 detik.
  useEffect(() => {
    fetchPengumuman();

    const interval = setInterval(() => {
      fetchPengumuman();
    }, 10000);

    return () => clearInterval(interval);
  }, [fetchPengumuman]);

  useEffect(() => {
    if (!selectedAnnouncement) return undefined;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setSelectedAnnouncement(null);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedAnnouncement]);

  const sortedPengumuman = useMemo(() => {
    // "Terdekat" = pengumuman paling baru lebih dulu.
    return [...pengumuman].sort((a, b) =>
      bandingkanUrutan(
        a,
        b,
        sortBy,
        (item) => waktuTanggal(item.end_at || item.start_at || item.created_at),
        -1,
      ),
    );
  }, [pengumuman, sortBy]);

  const getStatus = (item) => {
    const now = new Date();
    const startAt = item.start_at ? new Date(item.start_at) : null;
    const endAt = item.end_at ? new Date(item.end_at) : null;

    if (startAt && startAt > now) {
      return {
        label: "Akan Datang",
        className: "upcoming",
      };
    }

    if (endAt && endAt < now) {
      return {
        label: "Berakhir",
        className: "ended",
      };
    }

    return {
      label: "Aktif",
      className: "active",
    };
  };

  const formatTanggal = (tanggal) => {
    if (!tanggal) return "";

    const date = new Date(tanggal);

    if (Number.isNaN(date.getTime())) return "";

    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const formatRentangTanggal = (item) => {
    if (item.start_at && item.end_at) {
      return `${formatTanggal(item.start_at)} Berlaku s.d. ${formatTanggal(item.end_at)}`;
    }

    if (item.start_at) {
      return `Mulai ${formatTanggal(item.start_at)}`;
    }

    if (item.end_at) {
      return `Berlaku s.d. ${formatTanggal(item.end_at)}`;
    }

    return "Tanpa batas waktu";
  };

  const getTarget = (item) => {
    if (item.target === "semua") {
      return "Semua Kelas";
    }

    const daftar = Array.isArray(item.kelas)
      ? item.kelas
      : item.kelas
        ? [item.kelas]
        : [];

    if (daftar.length > 0) {
      return daftar
        .map(
          (kelas) =>
            `${kelas.grade} ${
              kelas.major?.name ?? kelas.major_name ?? ""
            } ${kelas.class_number}`.trim(),
        )
        .join(", ");
    }

    return "Kelas Tertentu";
  };

  return (
    <main className="main-pengumuman-box teacher-pengumuman">
      {loading && <AnnouncementListSkeleton rows={3} />}

      {!loading && error && (
        <section className="announcement-empty-state">
          <strong>Gagal memuat pengumuman.</strong>
          <p>{error}</p>

          <button type="button" onClick={fetchPengumuman}>
            Coba Lagi
          </button>
        </section>
      )}

      {!loading && !error && pengumuman.length === 0 && (
        <section className="announcement-empty-state">
          <strong>Belum ada pengumuman.</strong>
          <p>Pengumuman dari guru akan muncul di sini.</p>
        </section>
      )}

      {!loading && !error && pengumuman.length > 0 && (
        <section
          className="announcement-filter-panel"
          aria-label="Urutkan pengumuman"
        >
          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value)}
            aria-label="Urutkan pengumuman"
          >
            {URUTAN_OPTIONS.map((option) => (
              <option key={option.nilai} value={option.nilai}>
                {option.label}
              </option>
            ))}
          </select>
        </section>
      )}

      {!loading && !error && pengumuman.length > 0 && (
        <section className="announcement-list">
          {sortedPengumuman.map((item) => {
            const status = getStatus(item);

            return (
              <article className="announcement-card" key={item.id}>
                <div className="announcement-card__header">
                  <div>
                    <h2>{item.title}</h2>

                    <p className="announcement-card__dates">
                      {formatRentangTanggal(item)}
                    </p>

                    <p className="announcement-card__teacher">
                      Oleh: {item.teacher?.name ?? "Guru"}
                    </p>
                  </div>

                  <div className="announcement-card__controls">
                    <span
                      className={`announcement-status announcement-status--${status.className}`}
                    >
                      <span aria-hidden="true" />
                      {status.label}
                    </span>
                    <button
                      type="button"
                      className="announcement-card__detail"
                      onClick={() => setSelectedAnnouncement(item)}
                    >
                      Detail
                    </button>
                  </div>
                </div>

                <p className="announcement-content">{item.content}</p>

                {item.attachment && (
                  <p className="announcement-card__attachment">
                    <a
                      className="announcement-attachment-button"
                      href={storageUrl(item.attachment)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Lihat Lampiran
                    </a>
                  </p>
                )}

                <footer className="announcement-card__footer">
                  <span className="announcement-card__target">
                    {getTarget(item)}
                  </span>
                </footer>
              </article>
            );
          })}
        </section>
      )}

      {selectedAnnouncement && (
        <div
          className="announcement-detail-overlay"
          onClick={() => setSelectedAnnouncement(null)}
        >
          <section
            className="announcement-detail-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="announcement-detail-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="announcement-detail-header">
              <div>
                <span className="announcement-detail-eyebrow">Pengumuman</span>
                <h2 id="announcement-detail-title">Detail Pengumuman</h2>
              </div>

              <button
                type="button"
                className="announcement-detail-close"
                onClick={() => setSelectedAnnouncement(null)}
                aria-label="Tutup detail"
              >
                ✕
              </button>
            </div>

            <div className="announcement-detail-summary">
              <h3>{selectedAnnouncement.title}</h3>
              <p className="announcement-detail-author">
                Oleh: {selectedAnnouncement.teacher?.name ?? "Guru"}
              </p>
              <div className="announcement-detail-meta">
                <span className="announcement-card__target">
                  {getTarget(selectedAnnouncement)}
                </span>
                <span
                  className={`announcement-status announcement-status--${getStatus(selectedAnnouncement).className}`}
                >
                  <span aria-hidden="true" />
                  {getStatus(selectedAnnouncement).label}
                </span>
                <span className="announcement-detail-dates">
                  {formatRentangTanggal(selectedAnnouncement)}
                </span>
              </div>
            </div>

            <div className="announcement-detail-content">
              {selectedAnnouncement.content}
            </div>

            {selectedAnnouncement.attachment && (
              <div className="announcement-detail-attachment">
                <a
                  className="announcement-attachment-button"
                  href={storageUrl(selectedAnnouncement.attachment)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Lihat Lampiran
                </a>
              </div>
            )}

            <div className="announcement-detail-footer">
              <button
                type="button"
                onClick={() => setSelectedAnnouncement(null)}
              >
                Tutup
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
