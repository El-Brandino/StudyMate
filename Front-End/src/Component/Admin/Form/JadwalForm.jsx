import { CalendarPlus, Save } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import api from "../../../api/axios";
import { findKelasById, getSelectionFromKelas } from "../../../utils/kelas";
import ClassSelectFields from "../../Common/ClassSelectFields";
import AdminModal from "./AdminModal";

const HARI = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];

const EMPTY_FORM = {
  class_id: "",
  subject_id: "",
  teacher_id: "",
  hari: "Senin",
  jam_mulai: "",
  jam_selesai: "",
  urutan: "",
};

const toTimeInput = (value) => (value ? String(value).slice(0, 5) : "");

const buildInitialForm = (item) => {
  if (!item) return EMPTY_FORM;

  return {
    class_id: item.class_id ?? "",
    subject_id: item.subject_id ?? "",
    teacher_id: item.teacher_id ?? "",
    hari: item.hari ?? "Senin",
    jam_mulai: toTimeInput(item.jam_mulai),
    jam_selesai: toTimeInput(item.jam_selesai),
    urutan: item.urutan ?? "",
  };
};

export default function JadwalForm({
  isOpen = false,
  onClose,
  onSuccess,
  kelas = [],
  subjects = [],
  teachers = [],
  editingItem = null,
}) {
  const [form, setForm] = useState(() => buildInitialForm(editingItem));
  const [classSelection, setClassSelection] = useState(() =>
    getSelectionFromKelas(
      editingItem?.kelas ?? findKelasById(kelas, editingItem?.class_id),
    ),
  );
  const [loading, setLoading] = useState(false);
  const isEditing = Boolean(editingItem);

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

    if (!form.class_id) {
      toast.error("Lengkapi pilihan kelas terlebih dahulu.");
      return;
    }

    if (form.jam_selesai <= form.jam_mulai) {
      toast.error("Jam selesai harus lebih lambat dari jam mulai");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        class_id: Number(form.class_id),
        subject_id: Number(form.subject_id),
        teacher_id: Number(form.teacher_id),
        hari: form.hari,
        jam_mulai: form.jam_mulai,
        jam_selesai: form.jam_selesai,
        urutan: form.urutan === "" ? null : Number(form.urutan),
      };

      if (isEditing) {
        await api.put(`/admin/jadwal/${editingItem.id}`, payload);
        toast.success("Jadwal berhasil diperbarui");
      } else {
        await api.post("/admin/jadwal", payload);
        toast.success("Jadwal berhasil ditambahkan");
      }

      onSuccess?.();
      onClose?.();
    } catch (error) {
      const errors = error.response?.data?.errors;
      const firstError = errors ? Object.values(errors).flat()[0] : null;

      toast.error(
        firstError ||
          error.response?.data?.message ||
          "Gagal menyimpan jadwal",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminModal
      isOpen={isOpen}
      title={isEditing ? "Edit Jadwal Mapel" : "Tambah Jadwal Mapel"}
      subtitle="Atur kelas, mata pelajaran, guru, dan waktu pelaksanaan."
      onClose={onClose}
      size="wide"
    >
      <form className="admin-modal-form" onSubmit={handleSubmit}>
        <div className="admin-form-grid">
          <div className="admin-field admin-field--full">
            <label>Kelas</label>

            <ClassSelectFields
              kelas={kelas}
              value={classSelection}
              onChange={handleClassSelectionChange}
              idPrefix="jadwal-kelas"
              disabled={loading}
            />
          </div>

          <div className="admin-field">
            <label htmlFor="jadwal-mapel">Mata Pelajaran</label>
            <select
              id="jadwal-mapel"
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

          <div className="admin-field">
            <label htmlFor="jadwal-guru">Guru Pengampu</label>
            <select
              id="jadwal-guru"
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
            <label htmlFor="jadwal-hari">Hari</label>
            <select
              id="jadwal-hari"
              value={form.hari}
              onChange={handleChange("hari")}
              required
            >
              {HARI.map((hari) => (
                <option key={hari} value={hari}>
                  {hari}
                </option>
              ))}
            </select>
          </div>

          <div className="admin-field">
            <label htmlFor="jadwal-mulai">Jam Mulai</label>
            <input
              id="jadwal-mulai"
              type="time"
              value={form.jam_mulai}
              onChange={handleChange("jam_mulai")}
              required
            />
          </div>

          <div className="admin-field">
            <label htmlFor="jadwal-selesai">Jam Selesai</label>
            <input
              id="jadwal-selesai"
              type="time"
              value={form.jam_selesai}
              onChange={handleChange("jam_selesai")}
              required
            />
          </div>

          <div className="admin-field admin-field--full">
            <label htmlFor="jadwal-urutan">Urutan (opsional)</label>
            <input
              id="jadwal-urutan"
              type="number"
              min={0}
              placeholder="Contoh: 1"
              value={form.urutan}
              onChange={handleChange("urutan")}
            />
          </div>
        </div>

        <div className="admin-modal-actions">
          <button
            type="button"
            className="admin-btn admin-btn--secondary"
            onClick={onClose}
            disabled={loading}
          >
            Batal
          </button>

          <button
            type="submit"
            className="admin-btn admin-btn--primary"
            disabled={loading}
          >
            {isEditing ? <Save size={17} /> : <CalendarPlus size={17} />}
            {loading
              ? "Menyimpan..."
              : isEditing
                ? "Simpan Perubahan"
                : "Tambah Jadwal"}
          </button>
        </div>
      </form>
    </AdminModal>
  );
}
