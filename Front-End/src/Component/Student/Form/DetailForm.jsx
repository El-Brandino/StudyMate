import { X } from "lucide-react";
import storageUrl from "../../../api/storage";

export default function DetailForm({ isOpen = true, tugas, onClose }) {
  if (!isOpen || !tugas) return null;

  // Dokumen lampiran dari guru. Mendukung format lama (tugas.document)
  // dan format baru (tugas.documents[]).
  const documents = Array.isArray(tugas.documents) && tugas.documents.length > 0
    ? tugas.documents
    : tugas.document
      ? [
          {
            id: "legacy",
            file_name: tugas.document.split("/").pop(),
            file_path: tugas.document,
          },
        ]
      : [];

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

          {/* Deskripsi */}
          <div className="task-form-group">
            <label>Deskripsi</label>
            <p className="task-detail-description">
              {tugas.description || "Tidak ada deskripsi."}
            </p>
          </div>

          <div className="task-form-group">
            <label>Lampiran</label>

            {documents.length > 0 ? (
              <div className="task-documents">
                {documents.map((file) => {
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
              <p className="task-detail-value">Tidak ada lampiran.</p>
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
