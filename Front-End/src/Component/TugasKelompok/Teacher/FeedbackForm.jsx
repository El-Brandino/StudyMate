import { MessageSquare } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import api from "../../../api/axios";
import { InfoAlert, Modal } from "../shared";
import { getErrorMessage } from "../utils";

export default function FeedbackForm({
  kelompok,
  pekerjaan = null,
  onClose,
  onSuccess,
}) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSaving(true);

    try {
      await api.post(`/kelompok-tugas/${kelompok.id}/umpan-balik`, {
        message,
        pekerjaan_id: pekerjaan?.id ?? null,
      });

      toast.success("Umpan balik berhasil dikirim.");
      onSuccess();
      onClose();
    } catch (requestError) {
      console.error("Gagal mengirim umpan balik:", requestError);
      setError(getErrorMessage(requestError, "Gagal mengirim umpan balik."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Beri Umpan Balik"
      subtitle={
        pekerjaan
          ? `Pekerjaan: ${pekerjaan.title}`
          : `Kelompok: ${kelompok.name}`
      }
      onClose={saving ? () => {} : onClose}
    >
      <form className="tk-form" onSubmit={handleSubmit}>
        {error && <InfoAlert tone="danger">{error}</InfoAlert>}

        <InfoAlert>
          Umpan balik guru bersifat catatan monitoring. Guru tidak mengubah
          status pekerjaan kecuali memakai tindakan koreksi.
        </InfoAlert>

        <div className="tk-field">
          <label htmlFor="tk-feedback">Umpan balik</label>
          <textarea
            id="tk-feedback"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Tuliskan arahan, apresiasi, atau hal yang perlu diperbaiki..."
            required
            maxLength={2000}
          />
          <small>{message.length}/2000 karakter</small>
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
            disabled={saving || !message.trim()}
          >
            <MessageSquare size={16} />
            {saving ? "Mengirim..." : "Kirim Umpan Balik"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
