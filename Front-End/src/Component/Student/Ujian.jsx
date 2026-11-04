import { useCallback, useEffect, useMemo, useState } from "react";
import { X, FileText, Download } from "lucide-react";
import api from "../../api/axios";
import { toast } from "sonner";
import {
  formatExamClasses,
  formatExamDate,
  formatExamTime,
  getExamDateTime,
  getExamStatus,
  getExamStatusClass,
  isExamWithinFiveDays,
} from "../../utils/ujian";
import { URUTAN_OPTIONS, bandingkanUrutan } from "../../utils/urutan";
import { ExamListSkeleton } from "../Common/Skeleton.jsx";

export default function UjianStd() {
  const [ujians, setUjians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("all");
  const [sortBy, setSortBy] = useState("terdekat");
  const [selectedExam, setSelectedExam] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");

  const loadUjians = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/ujian");
      const data = response.data;

      setUjians(Array.isArray(data) ? data : (data.data ?? []));
    } catch (err) {
      console.error("Gagal memuat jadwal ujian:", err);
      setError(
        err.response?.data?.message ||
          "Gagal memuat jadwal ujian. Silakan coba lagi.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUjians();
  }, [loadUjians]);

  useEffect(() => {
    function handleEscape(event) {
      if (event.key === "Escape") {
        setSelectedExam(null);
      }
    }

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const subjects = useMemo(() => {
    const uniqueSubjects = new Map();

    ujians.forEach((ujian) => {
      if (ujian.subject) {
        uniqueSubjects.set(ujian.subject.id, ujian.subject);
      }
    });

    return Array.from(uniqueSubjects.values());
  }, [ujians]);

  const filteredUjians = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    const hasil = ujians.filter((ujian) => {
      const matchesSearch =
        keyword === "" ||
        (ujian.title ?? "").toLowerCase().includes(keyword) ||
        (ujian.subject?.name ?? "").toLowerCase().includes(keyword) ||
        (ujian.teacher?.name ?? "").toLowerCase().includes(keyword);

      const matchesSubject =
        selectedSubject === "all" ||
        String(ujian.subject_id) === selectedSubject;

      return matchesSearch && matchesSubject;
    });

    return hasil.sort((a, b) =>
      bandingkanUrutan(a, b, sortBy, getExamDateTime),
    );
  }, [ujians, searchTerm, selectedSubject, sortBy]);

  async function handleOpenDetail(ujian) {
    try {
      const response = await api.get(`/ujian/${ujian.id}`);

      // Mendukung respons JSON biasa maupun format { data: ... }.
      const detail = response.data?.data ?? response.data;

      setSelectedExam(detail);
    } catch (err) {
      console.error("Gagal memuat detail ujian:", err);
      toast.error("Gagal memuat detail ujian.");
    }
  }

  async function handleDownloadDocument(ujian) {
    try {
      const response = await api.get(`/ujian/${ujian.id}/document`, {
        responseType: "blob",
      });

      const blobUrl = URL.createObjectURL(response.data);
      const link = document.createElement("a");

      const safeTitle = (ujian.title || "Ujian").replace(/[^a-z0-9-_]/gi, "-");

      const extension = ujian.document_path?.split(".").pop()?.toLowerCase();

      link.href = blobUrl;
      link.download = `Kisi-Kisi-${safeTitle}${
        extension ? `.${extension}` : ""
      }`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      // Beri waktu browser memproses unduhan sebelum URL dibersihkan.
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);

      toast.success("Dokumen kisi-kisi berhasil diunduh.");
    } catch (err) {
      console.error("Gagal mengunduh dokumen:", err);

      toast.error(
        err.response?.data?.message || "Gagal mengunduh dokumen kisi-kisi.",
      );
    }
  }

  return (
    <div className="exam-page">
      <div className="exam-page-header">
        <div>
          <h1>Jadwal Ujian</h1>
          <p>Jadwal ujian dan dokumen kisi-kisi dari guru.</p>
        </div>
      </div>

      <div className="exam-filters exam-filters--sorted exam-filters--student">
        <input
          type="search"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Cari ujian atau mata pelajaran..."
          aria-label="Cari jadwal ujian"
        />

        <select
          value={selectedSubject}
          onChange={(event) => setSelectedSubject(event.target.value)}
          aria-label="Filter mata pelajaran"
        >
          <option value="all">Semua Mata Pelajaran</option>

          {subjects.map((subject) => (
            <option key={subject.id} value={String(subject.id)}>
              {subject.name}
            </option>
          ))}
        </select>

        <select
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value)}
          aria-label="Urutkan jadwal ujian"
        >
          {URUTAN_OPTIONS.map((option) => (
            <option key={option.nilai} value={option.nilai}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <ExamListSkeleton rows={3} />
      ) : error ? (
        <div className="exam-empty-state" role="alert">
          <h3>Gagal memuat jadwal ujian</h3>
          <p>{error}</p>
          <button type="button" onClick={loadUjians}>
            Coba Lagi
          </button>
        </div>
      ) : filteredUjians.length === 0 ? (
        <div className="exam-empty-state">
          <h3>Belum ada jadwal ujian</h3>
          <p>
            {ujians.length === 0
              ? "Jadwal ujian dari guru akan muncul di sini."
              : "Tidak ada jadwal yang cocok dengan pencarian atau filter."}
          </p>
        </div>
      ) : (
        <div className="exam-list">
          {filteredUjians.map((ujian) => (
            <article className="exam-card" key={ujian.id}>
              <div className="exam-card-header">
                <div>
                  <span className="exam-subject">
                    {ujian.subject?.name ?? "Mata pelajaran"}
                  </span>

                  <h3>{ujian.title}</h3>
                </div>

                <span
                  className={`exam-status exam-status--${getExamStatusClass(ujian)}`}
                >
                  {getExamStatus(ujian)}
                </span>
              </div>

              <div className="exam-card-info">
                <p>
                  <strong>Guru:</strong> {ujian.teacher?.name ?? "-"}
                </p>
                <p>
                  <strong>Tanggal:</strong>{" "}
                  <span
                    className={
                      isExamWithinFiveDays(ujian)
                        ? "exam-date--urgent"
                        : undefined
                    }
                  >
                    {formatExamDate(ujian.exam_date)}
                  </span>
                </p>
                <p>
                  <strong>Waktu:</strong> {formatExamTime(ujian.start_time)}
                </p>
                <p>
                  <strong>Durasi:</strong> {ujian.duration} menit
                </p>
                <p>
                  <strong>Kelas:</strong> {formatExamClasses(ujian.kelas)}
                </p>
              </div>

              <div className="exam-card-actions">
                <button type="button" onClick={() => handleOpenDetail(ujian)}>
                  Detail
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {selectedExam && (
        <div
          className="exam-modal-overlay"
          role="presentation"
          onClick={() => setSelectedExam(null)}
        >
          <section
            className="exam-detail-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="exam-detail-title"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="exam-detail-modal__header">
              <div>
                <span className="exam-detail-modal__eyebrow">
                  {selectedExam.subject?.name ?? "Mata pelajaran"}
                </span>

                <h2 id="exam-detail-title">{selectedExam.title}</h2>
              </div>

              <button
                type="button"
                className="exam-modal-close"
                aria-label="Tutup detail ujian"
                onClick={() => setSelectedExam(null)}
              >
                <X size={18} />
              </button>
            </header>

            <dl className="exam-detail-modal__fields">
              <div>
                <dt>Mata Pelajaran</dt>
                <dd>{selectedExam.subject?.name ?? "-"}</dd>
              </div>

              <div>
                <dt>Guru</dt>
                <dd>{selectedExam.teacher?.name ?? "-"}</dd>
              </div>

              <div>
                <dt>Tanggal Ujian</dt>
                <dd
                  className={
                    isExamWithinFiveDays(selectedExam)
                      ? "exam-date--urgent"
                      : undefined
                  }
                >
                  {formatExamDate(selectedExam.exam_date)}
                </dd>
              </div>

              <div>
                <dt>Waktu Mulai</dt>
                <dd>{formatExamTime(selectedExam.start_time)}</dd>
              </div>

              <div>
                <dt>Durasi</dt>
                <dd>{selectedExam.duration ?? "-"} menit</dd>
              </div>

              <div>
                <dt>Status</dt>
                <dd>
                  <span
                    className={`exam-status exam-status--${getExamStatusClass(
                      selectedExam,
                    )}`}
                  >
                    {getExamStatus(selectedExam)}
                  </span>
                </dd>
              </div>

              <div>
                <dt>Kelas Tujuan</dt>
                <dd>{formatExamClasses(selectedExam.kelas)}</dd>
              </div>
            </dl>

            <div className="exam-detail-modal__description">
              <h3>Deskripsi</h3>
              <p>{selectedExam.description || "Tidak ada deskripsi."}</p>
            </div>

            <div className="exam-detail-modal__document">
              <h3>Dokumen Kisi-Kisi</h3>

              {selectedExam.document_path ? (
                <div className="exam-detail-modal__document-card">
                  <FileText size={24} />

                  <div className="exam-detail-modal__document-info">
                    <strong>Dokumen kisi-kisi tersedia</strong>
                    <span>File dapat diunduh sebagai bahan belajar.</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDownloadDocument(selectedExam)}
                  >
                    <Download size={16} />
                    Unduh
                  </button>
                </div>
              ) : (
                <p>Belum ada dokumen kisi-kisi yang diunggah.</p>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
