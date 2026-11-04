import { UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import api from "../../../api/axios";
import ClassSelectFields from "../../Common/ClassSelectFields";
import AdminModal from "./AdminModal";

const EMPTY_CLASS_SELECTION = {
  grade: "",
  major: "",
  number: "",
};

const EMPTY_FORM = {
  name: "",
  gender: "Male",
  email: "",
  password: "",
  password_confirmation: "",
  class_id: "",
};

export default function AkunGuruForm({
  isOpen = false,
  onClose,
  onSuccess,
  kelas = [],
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [classSelection, setClassSelection] = useState(EMPTY_CLASS_SELECTION);
  const [loading, setLoading] = useState(false);

  const handleClose = () => {
    setForm(EMPTY_FORM);
    setClassSelection(EMPTY_CLASS_SELECTION);
    onClose?.();
  };

  const handleChange = (field) => (event) => {
    setForm((current) => ({
      ...current,
      [field]: event.target.value,
    }));
  };

  const handleClassSelectionChange = (nextSelection, matchedClass) => {
    setClassSelection(nextSelection);
    setForm((current) => ({
      ...current,
      class_id: matchedClass?.id != null ? String(matchedClass.id) : "",
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (form.password !== form.password_confirmation) {
      toast.error("Konfirmasi password tidak cocok");
      return;
    }

    const hasPartialClass =
      Boolean(
        classSelection.grade ||
          classSelection.major ||
          classSelection.number,
      ) && !form.class_id;

    if (hasPartialClass) {
      toast.error("Lengkapi pilihan kelas atau kosongkan semuanya.");
      return;
    }

    setLoading(true);

    try {
      await api.post("/admin/create-guru", {
        ...form,
        class_id: form.class_id ? Number(form.class_id) : null,
      });

      toast.success("Akun guru berhasil dibuat");
      onSuccess?.();
      handleClose();
    } catch (error) {
      const errors = error.response?.data?.errors;
      const firstError = errors ? Object.values(errors).flat()[0] : null;

      toast.error(
        firstError ||
          error.response?.data?.message ||
          "Gagal membuat akun guru",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminModal
      isOpen={isOpen}
      title="Tambah Akun Guru"
      subtitle="Lengkapi data guru. Akun langsung bisa digunakan untuk login."
      onClose={handleClose}
      size="wide"
    >
      <form className="admin-modal-form" onSubmit={handleSubmit}>
        <div className="admin-form-grid">
          <div className="admin-field">
            <label htmlFor="guru-nama">Nama Lengkap</label>
            <input
              id="guru-nama"
              type="text"
              placeholder="Masukkan nama lengkap"
              autoComplete="name"
              maxLength={255}
              value={form.name}
              onChange={handleChange("name")}
              required
            />
          </div>

          <div className="admin-field">
            <label htmlFor="guru-gender">Jenis Kelamin</label>
            <select
              id="guru-gender"
              value={form.gender}
              onChange={handleChange("gender")}
              required
            >
              <option value="Male">Laki-laki</option>
              <option value="Female">Perempuan</option>
            </select>
          </div>

          <div className="admin-field">
            <label htmlFor="guru-email">Email</label>
            <input
              id="guru-email"
              type="email"
              placeholder="guru@sekolah.com"
              autoComplete="email"
              maxLength={255}
              value={form.email}
              onChange={handleChange("email")}
              required
            />
          </div>

          <div className="admin-field admin-field--full">
            <label>Wali Kelas (opsional)</label>

            <ClassSelectFields
              kelas={kelas}
              value={classSelection}
              onChange={handleClassSelectionChange}
              idPrefix="guru-kelas"
              disabled={loading}
            />

            <small className="admin-form-hint">
              Kosongkan ketiga pilihan jika guru tidak menjadi wali kelas.
            </small>
          </div>

          <div className="admin-field">
            <label htmlFor="guru-password">Password</label>
            <input
              id="guru-password"
              type="password"
              placeholder="Minimal 6 karakter"
              autoComplete="new-password"
              minLength={6}
              value={form.password}
              onChange={handleChange("password")}
              required
            />
          </div>

          <div className="admin-field">
            <label htmlFor="guru-password-confirm">Konfirmasi Password</label>
            <input
              id="guru-password-confirm"
              type="password"
              placeholder="Ulangi password"
              autoComplete="new-password"
              minLength={6}
              value={form.password_confirmation}
              onChange={handleChange("password_confirmation")}
              required
            />
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
            {loading ? "Menyimpan..." : "Buat Akun Guru"}
          </button>
        </div>
      </form>
    </AdminModal>
  );
}
