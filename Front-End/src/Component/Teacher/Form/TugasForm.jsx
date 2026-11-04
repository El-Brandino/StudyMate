import { CalendarDays, Users, UserRound, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import api from "../../../api/axios";
import ClassPicker from "./ClassPicker";

const initialForm = {
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

export default function TugasForm({ isOpen = true, onClose, onSuccess }) {
  const [subjects, setSubjects] = useState([]);
  const [kelas, setKelas] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [formData, setFormData] = useState(initialForm);

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

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      const data = new FormData();

      data.append("mode", formData.mode);
      data.append("subject_id", formData.subject_id);
      data.append("title", formData.title);
      data.append("description", formData.description);
      data.append("deadline", formData.deadline);

      if (formData.mode === "kelompok") {
        data.append("instructions", formData.instructions);

        if (formData.min_members !== "") {
          data.append("min_members", formData.min_members);
        }

        if (formData.max_members !== "") {
          data.append("max_members", formData.max_members);
        }
      }

      formData.class_ids.forEach((id) => {
        data.append("class_ids[]", id);
      });

      documents.forEach((file) => {
        data.append("documents[]", file);
      });

      await api.post("/tugas", data);

      toast.success(
        formData.mode === "kelompok"
          ? "Tugas kelompok berhasil dibuat"
          : "Tugas berhasil dibuat",
      );

      setFormData(initialForm);
      setDocuments([]);
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Gagal membuat tugas:", error);
      toast.error(error.response?.data?.message || "Gagal membuat tugas");
    }
  };

  if (!isOpen) return null;

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
          Tambah Tugas Baru
        </h2>

        <form className="task-modal-form" onSubmit={handleSubmit}>
          <div className="task-form-group">
            <label>Mode Pengerjaan</label>
            <div className="task-mode-switch" role="group" aria-label="Mode tugas">
              <button
                type="button"
                className={formData.mode === "individu" ? "is-active" : ""}
                onClick={() => updateField("mode", "individu")}
              >
                <UserRound size={16} />
                Individu
              </button>
              <button
                type="button"
                className={formData.mode === "kelompok" ? "is-active" : ""}
                onClick={() => updateField("mode", "kelompok")}
              >
                <Users size={16} />
                Kelompok
              </button>
            </div>
            <p className="task-form-hint">
              {formData.mode === "kelompok"
                ? "Siswa membentuk kelompok sendiri, lalu membagi pekerjaan dan memperbarui progres."
                : "Setiap siswa menyelesaikan dan menandai tugas ini secara mandiri."}
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
                  onChange={(event) =>
                    updateField("deadline", event.target.value)
                  }
                  required
                />
                <CalendarDays size={16} className="task-date-icon" />
              </div>
            </div>

            <div className="task-form-group">
              <label>Upload Lampiran (opsional)</label>
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
              !formData.title ||
              !formData.subject_id ||
              !formData.deadline ||
              formData.class_ids.length === 0
            }
          >
            {formData.mode === "kelompok"
              ? "Publish Tugas Kelompok"
              : "Publish Tugas"}
          </button>
        </form>
      </div>
    </div>
  );
}
