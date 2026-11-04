import { useEffect, useState } from "react";
import { toast } from "sonner";
import api from "../../api/axios";
import storageUrl from "../../api/storage";
import { placeholder } from "../../assets.js";
import UbahPwForm from "../Teacher/Form/UbahPwForm.jsx";
import { ProfileSkeleton } from "../Common/Skeleton.jsx";

const getProfilePhoto = (profilePhoto) =>
  profilePhoto ? storageUrl(profilePhoto) : placeholder;

export default function ProfilAdmin() {
  const [user, setUser] = useState(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [gender, setGender] = useState("");
  const [photo, setPhoto] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  useEffect(() => {
    let active = true;

    const getUser = async () => {
      try {
        const response = await api.get("/me");
        const userData = response.data.user;

        if (!active) return;

        setUser(userData);
        setName(userData.name);
        setEmail(userData.email);
        setGender(userData.gender);
      } catch (error) {
        console.error("Gagal mengambil data user:", error);
        toast.error("Gagal memuat profil");
      } finally {
        if (active) setLoading(false);
      }
    };

    getUser();

    return () => {
      active = false;
    };
  }, []);

  const handleSimpan = async () => {
    setSaving(true);

    try {
      const formData = new FormData();

      formData.append("_method", "PUT");
      formData.append("name", name);
      formData.append("email", email);
      formData.append("gender", gender);

      if (photo) {
        formData.append("profile_photo", photo);
      }

      const response = await api.post("/profile", formData);

      setUser(response.data.user);
      setPhoto(null);

      localStorage.setItem("user", JSON.stringify(response.data.user));
      window.dispatchEvent(new Event("userUpdated"));

      toast.success("Profil berhasil diperbarui");
    } catch (error) {
      const errors = error.response?.data?.errors;
      const firstError = errors ? Object.values(errors).flat()[0] : null;

      toast.error(
        firstError ||
          error.response?.data?.message ||
          "Gagal memperbarui profil",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <ProfileSkeleton variant="admin" />;
  }

  return (
    <>
      <main className="profil-container admin-profile-page">
        <div className="profil-card">
          <div className="profil-left">
            <div className="avatar-section">
              <div className="avatar-circle">
                <img
                  src={
                    photo
                      ? URL.createObjectURL(photo)
                      : getProfilePhoto(user?.profile_photo)
                  }
                  alt="Foto profil"
                  className="avatar-img"
                />
              </div>

              <h2 className="profil-name">{user?.name || "Admin"}</h2>
              <p className="profil-kelas">Administrator</p>

              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) => setPhoto(event.target.files[0])}
                hidden
                id="admin-profile-photo"
              />

              <label htmlFor="admin-profile-photo" className="ganti-foto-btn">
                Ganti Foto
              </label>

              <p className="foto-info">
                Format: JPG, JPEG, PNG, WEBP
                <br />
                (Maks. 2MB)
              </p>
            </div>
          </div>

          <div className="profil-divider" />

          <div className="profil-right">
            <h3 className="data-profil-title">Data Profil</h3>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="admin-nama">Nama</label>
                <input
                  id="admin-nama"
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Nama Lengkap"
                />
              </div>

              <div className="form-group">
                <label htmlFor="admin-email">Email</label>
                <input
                  id="admin-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Email"
                />
              </div>
            </div>

            <div className="form-group full-width">
              <label htmlFor="admin-gender">Gender</label>
              <select
                id="admin-gender"
                value={gender}
                onChange={(event) => setGender(event.target.value)}
              >
                <option value="" disabled>
                  Pilih gender
                </option>
                <option value="Male">Laki-laki</option>
                <option value="Female">Perempuan</option>
              </select>
            </div>

            <div className="profil-password-row">
              <div className="form-group profil-password-field">
                <label htmlFor="admin-password">Password</label>
                <input
                  id="admin-password"
                  type="password"
                  placeholder="••••••••"
                  readOnly
                  aria-label="Password saat ini"
                />
              </div>

              <button
                className="btn-ubah-password"
                type="button"
                onClick={() => setIsPasswordModalOpen(true)}
              >
                Ubah Password
              </button>
            </div>

            <div className="form-actions">
              <button
                className="btn-simpan"
                type="button"
                onClick={handleSimpan}
                disabled={saving}
              >
                {saving ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      </main>

      <UbahPwForm
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />
    </>
  );
}
