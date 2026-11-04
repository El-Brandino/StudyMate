import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import api from "../../../api/axios";
import AdminModal from "./AdminModal";

export default function MapelForm({ isOpen = false, onClose, onSuccess }) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleClose = () => {
    setName("");
    onClose?.();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);

    try {
      await api.post("/admin/create-subject", { name });
      toast.success("Mapel berhasil ditambahkan");
      onSuccess?.();
      handleClose();
    } catch (error) {
      const errors = error.response?.data?.errors;
      const firstError = errors ? Object.values(errors).flat()[0] : null;

      toast.error(
        firstError ||
          error.response?.data?.message ||
          "Gagal menambahkan mapel",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminModal
      isOpen={isOpen}
      title="Tambah Mapel"
      subtitle="Tambahkan mata pelajaran baru ke daftar StudyMate."
      onClose={handleClose}
    >
      <form className="admin-modal-form" onSubmit={handleSubmit}>
        <div className="admin-field">
          <label htmlFor="mapel-nama">Nama Mata Pelajaran</label>
          <input
            id="mapel-nama"
            type="text"
            placeholder="Contoh: Matematika"
            maxLength={255}
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
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
            <Plus size={17} />
            {loading ? "Menambahkan..." : "Tambah Mapel"}
          </button>
        </div>
      </form>
    </AdminModal>
  );
}
