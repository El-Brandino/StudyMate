import { useCallback, useEffect, useState } from "react";
import api from "../../api/axios";
import storageUrl from "../../api/storage";
import PengumumanForm from "./Form/PengumumanForm";
import { AnnouncementListSkeleton } from "../Common/Skeleton.jsx";

/** Relasi kelas kini berupa array (satu pengumuman bisa banyak kelas). */
function daftarKelas(item) {
  if (Array.isArray(item.kelas)) return item.kelas;
  if (item.kelas) return [item.kelas];
  return [];
}

export default function PengumumanTch() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [pengumuman, setPengumuman] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [kelasList, setKelasList] = useState([]);
  const [filterGrade, setFilterGrade] = useState("");
  const [filterMajor, setFilterMajor] = useState("");
  const [filterClassNumber, setFilterClassNumber] = useState("");

  const fetchPengumuman = useCallback(async () => {
    try {
      setError("");
      setActionError("");

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

  useEffect(() => {
    fetchPengumuman();
  }, [fetchPengumuman]);

  useEffect(() => {
    api
      .get("/kelas")
      .then((response) => {
        setKelasList(Array.isArray(response.data) ? response.data : []);
      })
      .catch((err) => {
        console.error("Gagal mengambil daftar kelas:", err);
      });
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchPengumuman();
    }, 10000); // setiap 10 detik

    return () => clearInterval(interval);
  }, [fetchPengumuman]);

  const getStatus = (item) => {
    const now = new Date();
    const startAt = item.start_at ? new Date(item.start_at) : null;
    const endAt = item.end_at ? new Date(item.end_at) : null;

    if (startAt && startAt > now) {
      return { label: "Akan Datang", className: "upcoming" };
    }

    if (endAt && endAt < now) {
      return { label: "Berakhir", className: "ended" };
    }

    return { label: "Aktif", className: "active" };
  };

  const [deletingId, setDeletingId] = useState(null);

  const formatTanggal = (tanggal) => {
    if (!tanggal) return "";

    return new Date(tanggal).toLocaleDateString("id-ID", {
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

  const handleDelete = async (item) => {
    const confirmed = window.confirm(`Hapus pengumuman "${item.title}"?`);

    if (!confirmed) return;

    try {
      setActionError("");
      setDeletingId(item.id);

      await api.delete(`/pengumuman/${item.id}`);

      setPengumuman((current) =>
        current.filter((announcement) => announcement.id !== item.id),
      );
    } catch (err) {
      console.error("Gagal menghapus pengumuman:", err);

      setActionError(
        err.response?.data?.message || "Pengumuman gagal dihapus.",
      );
    } finally {
      setDeletingId(null);
    }
  };

  const filteredPengumuman = pengumuman.filter((item) => {
    // Tanpa filter, tampilkan semua pengumuman
    if (!filterGrade && !filterMajor && !filterClassNumber) {
      return true;
    }

    // Pengumuman untuk semua kelas tetap berlaku
    if (item.target === "semua") {
      return true;
    }

    const daftar = daftarKelas(item);

    if (daftar.length === 0) return false;

    // Tampilkan jika ada satu kelas yang cocok dengan semua filter aktif.
    return daftar.some(
      (kelas) =>
        (!filterGrade || kelas.grade === filterGrade) &&
        (!filterMajor || String(kelas.major_id) === filterMajor) &&
        (!filterClassNumber ||
          String(kelas.class_number) === filterClassNumber),
    );
  });

  const availableMajors = [
    ...new Map(
      kelasList
        .filter((kelas) => !filterGrade || kelas.grade === filterGrade)
        .map((kelas) => [
          String(kelas.major_id),
          { id: String(kelas.major_id), name: kelas.major_name },
        ]),
    ).values(),
  ];

  const availableClassNumbers = [
    ...new Set(
      kelasList
        .filter(
          (kelas) =>
            (!filterGrade || kelas.grade === filterGrade) &&
            (!filterMajor || String(kelas.major_id) === filterMajor),
        )
        .map((kelas) => String(kelas.class_number)),
    ),
  ].sort((a, b) => Number(a) - Number(b));

  return (
    <>
      <main className="main-pengumuman-box teacher-pengumuman">
        <button
          className="add-task-button"
          type="button"
          onClick={() => {
            setEditingAnnouncement(null);
            setIsFormOpen(true);
          }}
        >
          + Buat Pengumuman Baru
        </button>

        <section
          className="announcement-filter-panel"
          aria-label="Filter pengumuman"
        >
          <select
            value={filterGrade}
            aria-label="Pilih tingkat"
            onChange={(event) => {
              setFilterGrade(event.target.value);
              setFilterMajor("");
              setFilterClassNumber("");
            }}
          >
            <option value="">Semua Tingkat</option>
            {[...new Set(kelasList.map((kelas) => kelas.grade))]
              .sort()
              .map((grade) => (
                <option key={grade} value={grade}>
                  {grade}
                </option>
              ))}
          </select>

          <select
            value={filterMajor}
            aria-label="Pilih jurusan"
            onChange={(event) => {
              setFilterMajor(event.target.value);
              setFilterClassNumber("");
            }}
          >
            <option value="">Semua Jurusan</option>
            {availableMajors.map((major) => (
              <option key={major.id} value={major.id}>
                {major.name}
              </option>
            ))}
          </select>

          <select
            value={filterClassNumber}
            aria-label="Pilih kelas"
            onChange={(event) => setFilterClassNumber(event.target.value)}
          >
            <option value="">Semua Kelas</option>
            {availableClassNumbers.map((number) => (
              <option key={number} value={number}>
                {number}
              </option>
            ))}
          </select>
        </section>

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
            <p>Klik "Buat Pengumuman Baru" untuk membuat pengumuman.</p>
          </section>
        )}

        {!loading && !error && filteredPengumuman.length > 0 && (
          <section className="announcement-list">
            {actionError && <p role="alert">{actionError}</p>}
            {filteredPengumuman.map((item) => {
              const status = getStatus(item);

              return (
                <article className="announcement-card" key={item.id}>
                  <div className="announcement-card__header">
                    <div>
                      <h2>{item.title}</h2>
                      <p className="announcement-card__dates">
                        {formatRentangTanggal(item)}
                      </p>
                    </div>

                    <span
                      className={`announcement-status announcement-status--${status.className}`}
                    >
                      <span aria-hidden="true" />
                      {status.label}
                    </span>
                  </div>

                  <p className="announcement-content">{item.content}</p>

                  {item.attachment && (
                    <p className="announcement-card__attachment">
                      <a
                        href={storageUrl(item.attachment)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Lihat Lampiran
                      </a>
                    </p>
                  )}

                  <footer className="announcement-card__footer">
                    <span className="announcement-card__target">
                      {item.target === "semua"
                        ? "Semua Kelas"
                        : item.kelas?.length
                          ? item.kelas
                              .map(
                                (kelas) =>
                                  `${kelas.grade} ${
                                    kelas.major?.name ??
                                    kelas.major_name ??
                                    ""
                                  } ${kelas.class_number}`.trim(),
                              )
                              .join(", ")
                          : "Kelas Tertentu"}
                    </span>

                    <div className="announcement-card__actions">
                      <button
                        className="announcement-card__edit"
                        type="button"
                        onClick={() => {
                          setEditingAnnouncement(item);
                          setIsFormOpen(true);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className="announcement-card__delete"
                        type="button"
                        onClick={() => handleDelete(item)}
                      >
                        Hapus
                      </button>
                    </div>
                  </footer>
                </article>
              );
            })}
          </section>
        )}

        {!loading &&
          !error &&
          pengumuman.length > 0 &&
          filteredPengumuman.length === 0 && (
            <section className="announcement-empty-state">
              <strong>Pengumuman tidak ditemukan.</strong>
              <p>Coba ubah filter tingkat, jurusan, atau kelas.</p>
            </section>
          )}
      </main>

      <PengumumanForm
        isOpen={isFormOpen}
        initialAnnouncement={editingAnnouncement}
        onClose={() => {
          setIsFormOpen(false);
          setEditingAnnouncement(null);
        }}
        onCreated={() => {
          setIsFormOpen(false);
          setEditingAnnouncement(null);
          fetchPengumuman();
        }}
      />
    </>
  );
}
