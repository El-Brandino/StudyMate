import { useState } from "react";
import { toast } from "sonner";
import api from "../../../api/axios";
import "../../../UbahPwForm.css";

export default function UbahPwForm({
  isOpen = false,
  onClose,
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error("Konfirmasi password baru tidak cocok");
      return;
    }

    if (currentPassword === newPassword) {
      toast.error("Password baru harus berbeda dari password lama");
      return;
    }

    try {
      setLoading(true);

      const response = await api.put("/profile/password", {
        current_password: currentPassword,
        new_password: newPassword,
        new_password_confirmation: confirmPassword,
      });

      toast.success(
        response.data.message || "Password berhasil diubah"
      );

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      onClose();
    } catch (error) {
      console.error("Gagal mengubah password:", error);

      const errors = error.response?.data?.errors;
      const message =
        errors?.current_password?.[0] ||
        errors?.new_password?.[0] ||
        error.response?.data?.message ||
        "Gagal mengubah password";

      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="password-modal-overlay"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="password-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ubah-password-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="ubah-password-title">Ubah Password</h2>

        <form
          className="password-modal-form"
          onSubmit={handleSubmit}
        >
          <div className="password-modal-field">
            <label htmlFor="password-lama">
              Password Lama
            </label>
            <input
              id="password-lama"
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              maxLength={8}
              value={currentPassword}
              onChange={(event) =>
                setCurrentPassword(event.target.value)
              }
              required
            />
          </div>

          <div className="password-modal-field">
            <label htmlFor="password-baru">
              Password Baru
            </label>
            <input
              id="password-baru"
              name="newPassword"
              type="password"
              autoComplete="new-password"
              maxLength={8}
              value={newPassword}
              onChange={(event) =>
                setNewPassword(event.target.value)
              }
              minLength={6}
              required
            />
          </div>

          <div className="password-modal-field">
            <label htmlFor="konfirmasi-password">
              Konfirmasi Password Baru
            </label>
            <input
              id="konfirmasi-password"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              maxLength={8}
              value={confirmPassword}
              onChange={(event) =>
                setConfirmPassword(event.target.value)
              }
              minLength={6}
              required
            />
          </div>

          <div className="password-modal-actions">
            <button
              type="submit"
              className="password-modal-submit"
              disabled={
                loading ||
                !currentPassword ||
                !newPassword ||
                !confirmPassword
              }
            >
              {loading ? "Menyimpan..." : "Ubah Password"}
            </button>

            <button
              type="button"
              className="password-modal-cancel"
              onClick={onClose}
              disabled={loading}
            >
              Batal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}