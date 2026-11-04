import { AlertTriangle, Save } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import api from "../../../api/axios";
import { InfoAlert, Modal } from "../shared";
import { getErrorMessage, STATUS_OPTIONS } from "../utils";

const sameIds = (first, second) => {
  const a = [...first].map(String).sort();
  const b = [...second].map(String).sort();

  return a.length === b.length && a.every((value, index) => value === b[index]);
};

export default function KoreksiForm({
  kelompok,
  pekerjaan,
  onClose,
  onSuccess,
}) {
  const currentAssigneeIds = (pekerjaan.penanggung_jawab ?? []).map(
    (student) => student.id,
  );
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState("");
  const [assigneeIds, setAssigneeIds] = useState(currentAssigneeIds);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const members = (kelompok.anggota ?? []).map((item) => item.student).filter(Boolean);

  const toggleAssignee = (id) => {
    setAssigneeIds((current) =>
      current.includes(id)
        ? current.filter((studentId) => studentId !== id)
        : [...current, id],
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const statusChanged = status !== "" && status !== pekerjaan.status;
    const assigneesChanged = !sameIds(assigneeIds, currentAssigneeIds);

    if (!statusChanged && !assigneesChanged) {
      setError("Pilih status baru atau ubah penanggung jawab terlebih dahulu.");
      return;
    }

    if (assigneeIds.length === 0) {
      setError("Pekerjaan harus memiliki minimal satu penanggung jawab.");
      return;
    }

    setSaving(true);

    try {
      const payload = { reason };

      if (statusChanged) payload.status = status;
      if (assigneesChanged) payload.assignee_ids = assigneeIds;

      await api.patch(
        `/kelompok-tugas/${kelompok.id}/pekerjaan/${pekerjaan.id}/koreksi`,
        payload,
      );

      toast.success("Koreksi pekerjaan berhasil disimpan.");
      onSuccess();
      onClose();
    } catch (requestError) {
      console.error("Gagal menyimpan koreksi:", requestError);
      setError(
        getErrorMessage(requestError, "Gagal menyimpan koreksi pekerjaan."),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Koreksi Pekerjaan"
      subtitle={`${kelompok.name} · ${pekerjaan.title}`}
      onClose={saving ? () => {} : onClose}
    >
      <form className="tk-form" onSubmit={handleSubmit}>
        {error && <InfoAlert tone="danger">{error}</InfoAlert>}

        <InfoAlert tone="warning">
          <AlertTriangle size={16} aria-hidden="true" />
          <span>
            Koreksi hanya untuk memperbaiki data yang keliru. Tindakan ini
            dicatat di riwayat aktivitas kelompok beserta alasannya.
          </span>
        </InfoAlert>

        <div className="tk-field">
          <label htmlFor="tk-correction-status">
            Status pekerjaan (opsional)
          </label>
          <select
            id="tk-correction-status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="">Tidak mengubah status</option>
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <small>Status saat ini: {pekerjaan.status_label}</small>
        </div>

        <div className="tk-field">
          <span className="tk-label">Penanggung jawab</span>
          <div className="tk-check-grid">
            {members.map((member) => (
              <label className="tk-check" key={member.id}>
                <input
                  type="checkbox"
                  checked={assigneeIds.includes(member.id)}
                  onChange={() => toggleAssignee(member.id)}
                />
                <span>{member.name}</span>
              </label>
            ))}
          </div>
          <small>Minimal satu anggota kelompok harus dipilih.</small>
        </div>

        <div className="tk-field">
          <label htmlFor="tk-correction-reason">Alasan koreksi</label>
          <textarea
            id="tk-correction-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Jelaskan alasan perubahan agar siswa memahami koreksinya..."
            minLength={5}
            maxLength={1000}
            required
          />
          <small>{reason.length}/1000 karakter</small>
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
            disabled={saving || reason.trim().length < 5}
          >
            <Save size={16} />
            {saving ? "Menyimpan..." : "Simpan Koreksi"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
