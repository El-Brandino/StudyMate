import { CheckCircle2, X } from "lucide-react";
import { useEffect, useState } from "react";
import api from "../../../api/axios";
import { placeholder } from "../../../assets.js";
import storageUrl from "../../../api/storage";

function formatCompletionTime(value) {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return null;

  return date.toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function DetailForm({ isOpen = true, tugas, onClose }) {
  const [progress, setProgress] = useState([]);
  const [isLoadingProgress, setIsLoadingProgress] = useState(false);
  const [progressError, setProgressError] = useState("");

  const tugasId = tugas?.id;
  const isIndividual = tugas?.mode !== "kelompok";

  useEffect(() => {
    if (!isOpen || !tugasId || !isIndividual) return;

    let isCancelled = false;

    const fetchProgress = async () => {
      setIsLoadingProgress(true);
      setProgress([]);
      setProgressError("");

      try {
        const response = await api.get(`/tugas/${tugasId}/progress`);

        if (!isCancelled) {
          setProgress(Array.isArray(response.data) ? response.data : []);
        }
      } catch (error) {
        console.error("Gagal mengambil progress tugas:", error);

        if (!isCancelled) {
          setProgress([]);
          setProgressError("Gagal memuat data penyelesaian siswa.");
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingProgress(false);
        }
      }
    };

    fetchProgress();

    return () => {
      isCancelled = true;
    };
  }, [isOpen, tugasId, isIndividual]);

  if (!isOpen || !tugas) return null;

  const completedStudents = progress
    .filter((item) => item.status === "selesai")
    .sort(
      (a, b) =>
        new Date(b.completed_at ?? 0) - new Date(a.completed_at ?? 0),
    );

  const totalStudents = progress.length;
  const completedCount = completedStudents.length;
  const percentage = totalStudents
    ? Math.round((completedCount / totalStudents) * 100)
    : 0;

  return (
    <div className="task-modal-overlay" onClick={onClose} role="presentation">
      <div
        className="task-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-tugas-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="task-modal-header">
          <button
            type="button"
            className="task-modal-close"
            aria-label="Tutup detail tugas"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        <h2 id="detail-tugas-title" className="task-form-title">
          Detail Tugas
        </h2>

        <div className="task-modal-form">
          {/* Judul */}
          <div className="task-form-group">
            <label>Judul Tugas</label>
            <p className="task-detail-value">{tugas.title}</p>
          </div>

          {/* Mata Pelajaran */}
          <div className="task-form-group">
            <label>Mata Pelajaran</label>
            <p className="task-detail-value">{tugas.subject?.name ?? "-"}</p>
          </div>

          {/* Tingkat, Jurusan, Kelas */}
          <div className="task-form-row task-form-row--three">
            <div className="task-form-group">
              <label>Tingkat</label>
              <p className="task-detail-value">
                {tugas.kelas?.length > 0
                  ? [...new Set(tugas.kelas.map((item) => item.grade))].join(
                      ", ",
                    )
                  : "-"}
              </p>
            </div>

            <div className="task-form-group">
              <label>Jurusan</label>
              <p className="task-detail-value">
                {tugas.kelas?.length > 0
                  ? [
                      ...new Set(
                        tugas.kelas
                          .map((item) => item.major?.name)
                          .filter(Boolean),
                      ),
                    ].join(", ")
                  : "-"}
              </p>
            </div>

            <div className="task-form-group">
              <label>Kelas</label>
              <p className="task-detail-value">
                {tugas.kelas?.length > 0
                  ? tugas.kelas.map((item) => item.class_number).join(", ")
                  : "-"}
              </p>
            </div>
          </div>

          {/* Deadline */}
          <div className="task-form-group">
            <label>Deadline</label>
            <p className="task-detail-value">{tugas.deadline}</p>
          </div>

          {/* Penyelesaian siswa */}
          <div className="task-form-group">
            <label>Penyelesaian Siswa</label>

            <div className="task-completion-panel">
              <div className="task-completion-summary">
                <div className="task-completion-summary__text">
                  <strong>
                    {totalStudents > 0
                      ? `${completedCount} dari ${totalStudents} siswa menyelesaikan`
                      : "Belum ada siswa pada tugas ini"}
                  </strong>
                  {totalStudents > 0 && <span>{percentage}% selesai</span>}
                </div>

                {totalStudents > 0 && (
                  <progress
                    className="task-card-progress task-completion-progress"
                    value={completedCount}
                    max={totalStudents}
                  />
                )}
              </div>

              {isLoadingProgress ? (
                <p className="task-completion-note">
                  Memuat data penyelesaian siswa...
                </p>
              ) : progressError ? (
                <p className="task-completion-note task-completion-note--error">
                  {progressError}
                </p>
              ) : completedStudents.length === 0 ? (
                <p className="task-completion-note">
                  Belum ada siswa yang menyelesaikan tugas ini.
                </p>
              ) : (
                <ul className="task-completion-list">
                  {completedStudents.map((item) => {
                    const student = item.student;
                    const photoUrl = student?.profile_photo
                      ? storageUrl(student.profile_photo)
                      : placeholder;

                    return (
                      <li
                        key={item.id ?? `${item.task_id}-${item.student_id}`}
                        className="task-completion-item"
                      >
                        <img
                          className="task-completion-avatar"
                          src={photoUrl}
                          alt={`Foto ${student?.name ?? "siswa"}`}
                        />

                        <div className="task-completion-info">
                          <strong>{student?.name ?? "Siswa"}</strong>
                          <span>{student?.kelas?.name ?? "-"}</span>
                        </div>

                        <span className="task-completion-time">
                          <CheckCircle2 size={14} aria-hidden="true" />
                          {formatCompletionTime(item.completed_at) ??
                            "Selesai"}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          {/* Deskripsi */}
          <div className="task-form-group">
            <label>Deskripsi</label>
            <p className="task-detail-description">
              {tugas.description || "Tidak ada deskripsi."}
            </p>
          </div>

          {/* Dokumen */}
          <div className="task-form-group">
            <label>Dokumen</label>

            {Array.isArray(tugas.documents) &&
            tugas.documents.length > 0 ? (
              <div className="task-documents">
                {tugas.documents.map((file) => {
                  const fileUrl = storageUrl(file.file_path);

                  return fileUrl ? (
                    <a
                      key={file.id ?? file.file_path}
                      className="task-document-link"
                      href={fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <span className="task-document-link__label">
                        <span>
                          {file.file_name ||
                            file.original_name ||
                            file.file_path ||
                            "Lampiran tugas"}
                        </span>
                      </span>

                      <span className="task-document-link__action">
                        Buka Dokumen
                      </span>
                    </a>
                  ) : (
                    <p
                      key={file.id ?? file.file_path}
                      className="task-detail-value"
                    >
                      URL dokumen tidak tersedia.
                    </p>
                  );
                })}
              </div>
            ) : (
              <p className="task-detail-value">
                Tidak ada dokumen.
              </p>
            )}
          </div>

          {/* Guru */}
          <div className="task-form-group">
            <label>Dibuat Oleh</label>
            <p className="task-detail-value">{tugas.teacher?.name ?? "-"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
