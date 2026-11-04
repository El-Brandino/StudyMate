import { UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import api from "../../../api/axios";
import AdminModal from "./AdminModal";

const EMPTY_FORM = {
  teacher_id: "",
  subject_id: "",
};

export default function AssignMapelForm({
  isOpen = false,
  onClose,
  onSuccess,
  teachers = [],
  subjects = [],
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);

  const handleClose = () => {
    setForm(EMPTY_FORM);
    onClose?.();
  };

  const handleChange = (field) => (event) => {
    setForm((current) => ({
      ...current,
      [field]: event.target.value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);

    try {
      await api.post("/admin/assign-subject", form);
      toast.success("Mapel berhasil diassign ke guru");
      onSuccess?.();
      handleClose();
    } catch (error) {
      const errors = error.response?.data?.errors;
      const firstError = errors ? Object.values(errors).flat()[0] : null;

      toast.error(
        firstError ||
          error.response?.data?.message ||
          "Gagal assign mapel",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminModal
      isOpen={isOpen}
      title="Assign Mapel ke Guru"
      subtitle="Pilih guru dan mata pelajaran yang akan diampu."
      onClose={handleClose}
    >
      <form className="admin-modal-form" onSubmit={handleSubmit}>
        <div className="admin-form-grid">
          <div className="admin-field">
            <label htmlFor="assign-guru">Guru</label>
            <select
              id="assign-guru"
              value={form.teacher_id}
              onChange={handleChange("teacher_id")}
              required
            >
              <option value="">-- Pilih Guru --</option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.name}
                </option>
              ))}
            </select>
          </div>

          <div className="admin-field">
            <label htmlFor="assign-mapel">Mata Pelajaran</label>
            <select
              id="assign-mapel"
              value={form.subject_id}
              onChange={handleChange("subject_id")}
              required
            >
              <option value="">-- Pilih Mapel --</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="admin-modal-actions">
          <button
            type="button"
            className="admin-btn admin-btn--secondary"
            onClick={handleClose}
            disabled={loading}
          >
            Batal
          </button>

          <button
            type="submit"
            className="admin-btn admin-btn--primary"
            disabled={loading}
          >
            <UserPlus size={17} />
            {loading ? "Menyimpan..." : "Assign Mapel"}
          </button>
        </div>
      </form>
    </AdminModal>
  );
}
