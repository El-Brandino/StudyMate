import { CalendarDays, FileText, Users, UserRound, X } from "lucide-react";
import { useEffect, useState } from "react";
import api from "../../../api/axios";
import { toast } from "sonner";
import ClassPicker from "./ClassPicker";

const emptyForm = {
  mode: "individu",
  title: "",
  subject_id: "",
  deadline: "",
  description: "",
  instructions: "",
  min_members: "",
  max_members: "",
  class_ids: [],
};

export default function EditForm({ isOpen = true, tugas, onClose, onSuccess }) {
  const [formData, setFormData] = useState(emptyForm);
  const [subjects, setSubjects] = useState([]);
  const [kelas, setKelas] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [removeDocumentIds, setRemoveDocumentIds] = useState([]);

  useEffect(() => {
    if (!tugas) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect -- sinkronisasi form dari props tugas
    setFormData({
      mode: tugas.mode || "individu",
      title: tugas.title || "",
      subject_id: tugas.subject_id || "",
      deadline: tugas.deadline ? tugas.deadline.slice(0, 10) : "",
      description: tugas.description || "",
      instructions: tugas.instructions || "",
      min_members: tugas.min_members ?? "",
      max_members: tugas.max_members ?? "",
      class_ids: (tugas.kelas || []).map((item) => item.id),
    });

    setDocuments([]);
    setRemoveDocumentIds([]);
  }, [tugas]);

  useEffect(() => {
    api
      .get("/my-subjects")
      .then((response) => {
        const subjectData = response.data;

        setSubjects(
          Array.isArray(subjectData)
            ? subjectData
            : (subjectData?.subjects ?? []),
        );
      })
      .catch((error) => {
        console.error("Gagal mengambil subject:", error);
      });

    api
      .get("/kelas")
      .then((response) => setKelas(response.data))
      .catch((error) => {
        console.error("Gagal mengambil kelas:", error);
      });
  }, []);

  const updateField = (field, value) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const toggleRemoveDocument = (documentId) => {
    setRemoveDocumentIds((current) =>
      current.includes(documentId)
        ? current.filter((id) => id !== documentId)
        : [...current, documentId],
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      const payload = new FormData();

      payload.append("_method", "PUT");
      payload.append("mode", formData.mode);
      payload.append("subject_id", formData.subject_id);
      payload.append("title", formData.title);
      payload.append("deadline", formData.deadline);

      if (formData.description) {
        payload.append("description", formData.description);
      }

      if (formData.mode === "kelompok") {
        payload.append("instructions", formData.instructions);

        if (formData.min_members !== "") {
          payload.append("min_members", formData.min_members);
        }

        if (formData.max_members !== "") {
          payload.append("max_members", formData.max_members);
        }
      }

      formData.class_ids.forEach((id) => {
        payload.append("class_ids[]", id);
      });

      documents.forEach((file) => {
        payload.append("documents[]", file);
      });

      removeDocumentIds.forEach((id) => {
        payload.append("remove_document_ids[]", id);
      });

      await api.post(`/tugas/${tugas.id}`, payload);

      toast.success("Tugas berhasil diperbarui");
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Gagal memperbarui tugas:", error);
      toast.error(error.response?.data?.message || "Gagal memperbarui tugas");
    }
  };

  if (!isOpen) return null;

  const hasGroups = (tugas?.kelompok_count ?? 0) > 0;
  const subjectAllowed = subjects.some(
    (subject) => String(subject.id) === String(formData.subject_id),
  );
  const showCurrentSubjectOption =
    Boolean(formData.subject_id) && !subjectAllowed && Boolean(tugas?.subject);

  return (
    <div className="task-modal-overlay" onClick={onClose} role="presentation">
      <div
        className="task-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tugas-form-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="task-modal-header">
          <button
            type="button"
            className="task-modal-close"
            aria-label="Tutup form"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        <h2 id="tugas-form-title" className="task-form-title">
          Edit Tugas
        </h2>

        <form className="task-modal-form" onSubmit={handleSubmit}>
          <div className="task-form-group">
            <label>Mode Pengerjaan</label>
            <div
              className={`task-mode-switch ${hasGroups ? "is-locked" : ""}`}
              role="group"
              aria-label="Mode tugas"
            >
              <button
                type="button"
                className={formData.mode === "individu" ? "is-active" : ""}
                onClick={() => !hasGroups && updateField("mode", "individu")}
                disabled={hasGroups}
              >
                <UserRound size={16} />
                Individu
              </button>
              <button
                type="button"
                className={formData.mode === "kelompok" ? "is-active" : ""}
                onClick={() => !hasGroups && updateField("mode", "kelompok")}
                disabled={hasGroups}
              >
                <Users size={16} />
                Kelompok
              </button>
            </div>
            <p className="task-form-hint">
              {hasGroups
                ? "Mode tidak dapat diubah karena kelompok sudah dibentuk."
                : "Mode masih dapat diubah selama belum ada kelompok atau pembagian pekerjaan."}
            </p>
          </div>

          <div className="task-form-group">
            <label htmlFor="judul-tugas">Judul Tugas</label>
            <input
              id="judul-tugas"
              type="text"
              value={formData.title}
              onChange={(event) => updateField("title", event.target.value)}
              required
            />
          </div>

          <div className="task-form-group">
            <label htmlFor="mata-pelajaran">Mata Pelajaran</label>
            <select
              id="mata-pelajaran"
              value={formData.subject_id}
              onChange={(event) => updateField("subject_id", event.target.value)}
              required
            >
              <option value="" disabled>
                Pilih Mata Pelajaran
              </option>

              {showCurrentSubjectOption && (
                <option value={formData.subject_id}>
                  {tugas.subject?.name ?? "Mapel saat ini"} (tidak lagi diampu)
                </option>
              )}

              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>

            {subjects.length === 0 && (
              <p className="task-form-hint">
                Belum ada pengkhususan mata pelajaran. Hubungi admin untuk
                mengatur mapel yang Anda ampu.
              </p>
            )}

            {subjects.length > 0 && !subjectAllowed && formData.subject_id && (
              <p className="task-form-hint">
                Mapel tugas ini tidak lagi termasuk pengkhususan Anda. Pilih
                salah satu mapel yang diampu untuk menyimpan perubahan.
              </p>
            )}
          </div>

          <div className="task-form-group">
            <label>Kelas Tujuan</label>
            <ClassPicker
              kelas={kelas}
              value={formData.class_ids}
              onChange={(classIds) => updateField("class_ids", classIds)}
            />
          </div>

          <div className="task-form-row task-form-row--two">
            <div className="task-form-group">
              <label htmlFor="deadline">Deadline</label>
              <div className="task-date-input-wrap">
                <input
                  id="deadline"
                  type="date"
                  value={formData.deadline}
                  onChange={(event) => updateField("deadline", event.target.value)}
                  required
                />
                <CalendarDays size={16} className="task-date-icon" />
              </div>
            </div>

            <div className="task-form-group">
              <label htmlFor="lampiran">Tambah Lampiran (opsional)</label>
              <div className="task-upload-wrap">
                <input
                  id="lampiran"
                  className="task-file-input"
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip"
                  onChange={(event) =>
                    setDocuments(Array.from(event.target.files ?? []))
                  }
                />
                <label htmlFor="lampiran" className="task-upload-button">
                  Choose File
                </label>
                <span className="task-upload-filename">
                  {documents.length > 0
                    ? documents.map((file) => file.name).join(", ")
                    : "No file chosen"}
                </span>
              </div>
            </div>
          </div>

          <p className="task-upload-note">
            PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, ZIP (Maks. 10MB per file)
          </p>

          {Array.isArray(tugas?.documents) && tugas.documents.length > 0 && (
            <div className="task-existing-docs">
              <span className="task-card-label">LAMPIRAN TERSIMPAN</span>
              {tugas.documents.map((document) => (
                <label
                  key={document.id}
                  className={`task-existing-doc ${
                    removeDocumentIds.includes(document.id)
                      ? "is-removed"
                      : ""
                  }`}
                >
                  <FileText size={14} />
                  <span>{document.file_name || document.file_path}</span>
                  <span className="task-existing-doc-remove">
                    <input
                      type="checkbox"
                      checked={removeDocumentIds.includes(document.id)}
                      onChange={() => toggleRemoveDocument(document.id)}
                    />
                    Hapus
                  </span>
                </label>
              ))}
            </div>
          )}

          {formData.mode === "kelompok" && (
            <div className="task-form-row task-form-row--two">
              <div className="task-form-group">
                <label htmlFor="min-members">Minimal Anggota</label>
                <input
                  id="min-members"
                  type="number"
                  min="1"
                  max="100"
                  value={formData.min_members}
                  onChange={(event) =>
                    updateField("min_members", event.target.value)
                  }
                  placeholder="Opsional"
                />
              </div>

              <div className="task-form-group">
                <label htmlFor="max-members">Maksimal Anggota</label>
                <input
                  id="max-members"
                  type="number"
                  min="1"
                  max="100"
                  value={formData.max_members}
                  onChange={(event) =>
                    updateField("max_members", event.target.value)
                  }
                  placeholder="Opsional"
                />
              </div>
            </div>
          )}

          <div className="task-form-group">
            <label htmlFor="deskripsi">Deskripsi</label>
            <textarea
              id="deskripsi"
              rows="4"
              value={formData.description}
              onChange={(event) =>
                updateField("description", event.target.value)
              }
            />
          </div>

          {formData.mode === "kelompok" && (
            <div className="task-form-group">
              <label htmlFor="instruksi">Instruksi Pengerjaan</label>
              <textarea
                id="instruksi"
                rows="4"
                value={formData.instructions}
                onChange={(event) =>
                  updateField("instructions", event.target.value)
                }
                placeholder="Langkah kerja, pembagian yang disarankan, atau kriteria penilaian..."
              />
            </div>
          )}

          <button
            type="submit"
            className="task-submit-button"
            disabled={
              subjects.length === 0 ||
              !subjectAllowed ||
              !formData.title ||
              !formData.subject_id ||
              !formData.deadline ||
              formData.class_ids.length === 0
            }
          >
            Simpan Perubahan
          </button>
        </form>
      </div>
    </div>
  );
}
