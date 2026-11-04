import { Plus, Save } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import api from "../../../api/axios";
import { InfoAlert, Modal } from "../shared";
import { getErrorMessage, toDateTimeInput } from "../utils";

export default function PekerjaanForm({
  kelompok,
  pekerjaan = null,
  currentUserId,
  onClose,
  onSuccess,
}) {
  const members = (kelompok.anggota ?? [])
    .map((item) => item.student)
    .filter(Boolean);

  const [formData, setFormData] = useState(() => ({
    title: pekerjaan?.title ?? "",
    description: pekerjaan?.description ?? "",
    deadline: toDateTimeInput(pekerjaan?.deadline),
    result_notes: pekerjaan?.result_notes ?? "",
    result_link: pekerjaan?.result_link ?? "",
    assignee_ids: pekerjaan
      ? (pekerjaan.penanggung_jawab ?? []).map((student) => student.id)
      : currentUserId
        ? [currentUserId]
        : [],
  }));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const updateField = (field, value) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const toggleAssignee = (id) => {
    setFormData((current) => ({
      ...current,
      assignee_ids: current.assignee_ids.includes(id)
        ? current.assignee_ids.filter((studentId) => studentId !== id)
        : [...current.assignee_ids, id],
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (formData.assignee_ids.length === 0) {
      setError("Pilih minimal satu penanggung jawab pekerjaan.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        deadline: formData.deadline || null,
        result_notes: formData.result_notes,
        result_link: formData.result_link || null,
        assignee_ids: formData.assignee_ids,
      };

      if (pekerjaan) {
        await api.put(
          `/kelompok-tugas/${kelompok.id}/pekerjaan/${pekerjaan.id}`,
          payload,
        );
      } else {
        await api.post(`/kelompok-tugas/${kelompok.id}/pekerjaan`, payload);
      }

      toast.success(
        pekerjaan
          ? "Pekerjaan berhasil diperbarui."
          : "Pekerjaan berhasil ditambahkan.",
      );
      onSuccess();
      onClose();
    } catch (requestError) {
      console.error("Gagal menyimpan pekerjaan:", requestError);
      setError(
        getErrorMessage(requestError, "Gagal menyimpan pekerjaan kelompok."),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={pekerjaan ? "Edit Pekerjaan" : "Tambah Pekerjaan"}
      subtitle={`${kelompok.name} · Tentukan pekerjaan dan penanggung jawabnya.`}
      onClose={saving ? () => {} : onClose}
      wide
    >
      <form className="tk-form" onSubmit={handleSubmit}>
        {error && <InfoAlert tone="danger">{error}</InfoAlert>}

        <div className="tk-form-grid">
          <div className="tk-field tk-field--full">
            <label htmlFor="tk-work-title">Nama pekerjaan</label>
            <input
              id="tk-work-title"
              type="text"
              value={formData.title}
              onChange={(event) => updateField("title", event.target.value)}
              placeholder="Contoh: Menyusun bab metode penelitian"
              required
            />
          </div>

          <div className="tk-field">
            <label htmlFor="tk-work-deadline">Deadline pekerjaan</label>
            <input
              id="tk-work-deadline"
              type="datetime-local"
              value={formData.deadline}
              onChange={(event) => updateField("deadline", event.target.value)}
            />
            <small>Opsional. Bisa berbeda dari deadline tugas utama.</small>
          </div>

          <div className="tk-field">
            <label htmlFor="tk-work-link">Link hasil</label>
            <input
              id="tk-work-link"
              type="url"
              value={formData.result_link}
              onChange={(event) => updateField("result_link", event.target.value)}
              placeholder="https://..."
            />
            <small>Google Drive, dokumen, atau tautan hasil lainnya.</small>
          </div>

          <div className="tk-field tk-field--full">
            <label htmlFor="tk-work-description">Deskripsi pekerjaan</label>
            <textarea
              id="tk-work-description"
              value={formData.description}
              onChange={(event) =>
                updateField("description", event.target.value)
              }
              placeholder="Rincian pekerjaan, target, atau catatan penting..."
            />
          </div>

          <div className="tk-field tk-field--full">
            <span className="tk-label">Penanggung jawab (bisa lebih dari satu)</span>
            <div className="tk-check-grid">
              {members.map((member) => (
                <label className="tk-check" key={member.id}>
                  <input
                    type="checkbox"
                    checked={formData.assignee_ids.includes(member.id)}
                    onChange={() => toggleAssignee(member.id)}
                  />
                  <span>{member.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="tk-field tk-field--full">
            <label htmlFor="tk-work-notes">Catatan hasil</label>
            <textarea
              id="tk-work-notes"
              value={formData.result_notes}
              onChange={(event) =>
                updateField("result_notes", event.target.value)
              }
              placeholder="Ringkasan hasil, kendala, atau catatan untuk reviewer..."
            />
          </div>
        </div>

        <div className="tk-form-actions">
          <button
            type="button"
            className="tk-btn tk-btn--secondary"
            onClick={onClose}
            disabled={saving}
          >
            Batal
          </button>
          <button
            type="submit"
            className="tk-btn tk-btn--primary"
            disabled={
              saving ||
              !formData.title.trim() ||
              formData.assignee_ids.length === 0
            }
          >
            {pekerjaan ? <Save size={16} /> : <Plus size={16} />}
            {saving
              ? "Menyimpan..."
              : pekerjaan
                ? "Simpan Perubahan"
                : "Tambah Pekerjaan"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
