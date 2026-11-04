import { useEffect, useState } from "react";
import api from "../../api/axios";
import storageUrl from "../../api/storage";
import { placeholder } from "../../assets.js";
import { toast } from "sonner";
import UbahPwForm from "./Form/UbahPwForm.jsx";
import { ProfileSkeleton, Skeleton } from "../Common/Skeleton.jsx";

const getProfilePhoto = (profilePhoto) =>
  profilePhoto ? storageUrl(profilePhoto) : placeholder;

export default function ProfilTch() {
  const [user, setUser] = useState(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [gender, setGender] = useState("");
  const [photo, setPhoto] = useState(null);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingSubjects, setLoadingSubjects] = useState(true);

  useEffect(() => {
    const getSubjects = async () => {
      try {
        const response = await api.get("/my-subjects");

        setSubjects(
          Array.isArray(response.data)
            ? response.data
            : (response.data?.subjects ?? []),
        );
      } catch (error) {
        console.error("Gagal mengambil mata pelajaran:", error);
        toast.error("Gagal memuat mata pelajaran");
      } finally {
        setLoadingSubjects(false);
      }
    };

    getSubjects();
  }, []);

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

      localStorage.setItem("user", JSON.stringify(response.data.user));

      window.dispatchEvent(new Event("userUpdated"));

      toast.success("Profil berhasil diperbarui");
    } catch (error) {
      console.error("Gagal memperbarui profil:", error);

      toast.error(error.response?.data?.message || "Gagal memperbarui profil");
    }
  };

  if (loading) {
    return <ProfileSkeleton variant="teacher" />;
  }

  return (
    <>
      <div className="profil-container">
        <div className="profil-content">
          <div className="profil-card">
            {/* Left Section - Profile Info */}
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
                <h2 className="profil-name">{user?.name}</h2>
                <p className="profil-kelas">
                  {user?.role === "siswa"
                    ? `Siswa • ${user?.kelas?.grade || "-"} ${user?.kelas?.major?.name || ""} ${user?.kelas?.class_number || ""}`
                    : "Guru"}
                </p>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => setPhoto(e.target.files[0])}
                  hidden
                  id="profile-photo"
                />

                <label htmlFor="profile-photo" className="ganti-foto-btn">
                  Ganti Foto
                </label>
                <p className="foto-info">
                  Format: JPG, JPEG, PNG, WEBP
                  <br />
                  (Maks. 2MB)
                </p>
              </div>
            </div>
            {/* Divider */}
            <div className="profil-divider" />
            {/* Right Section - Data Profil */}
            <div className="profil-right">
              <h3 className="data-profil-title">Data Profil</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>Nama</label>
                  <input
                    type="text"
                    id="nama"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nama Lengkap"
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                  />
                </div>
              </div>
              <div className="form-group full-width">
                <label htmlFor="gender">Gender</label>
                <select
                  id="gender"
                  name="gender"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
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
                  <label htmlFor="profil-password">Password</label>
                  <input
                    id="profil-password"
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
                <button className="btn-simpan" onClick={handleSimpan}>
                  Simpan
                </button>
              </div>
            </div>
          </div>

          <div className="teacher-subjects-section">
            <h3 className="teacher-subjects-title">
              Spesialisasi Mata Pelajaran
            </h3>

            {loadingSubjects ? (
              <div className="skeleton-stack" aria-busy="true">
                <div className="skeleton-chip-row">
                  <Skeleton width={112} height={32} radius={999} />
                  <Skeleton width={148} height={32} radius={999} />
                  <Skeleton width={98} height={32} radius={999} />
                </div>
              </div>
            ) : (
              <>
                <div className="teacher-subjects-list">
                  {subjects.map((subject) => (
                    <div key={subject.id} className="teacher-subject-chip">
                      <span>{subject.name}</span>
                    </div>
                  ))}

                  {subjects.length === 0 && (
                    <p>Belum ada spesialisasi mata pelajaran.</p>
                  )}
                </div>

                <p className="teacher-subjects-note">
                  Spesialisasi mata pelajaran diatur oleh admin.
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      <UbahPwForm
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />
    </>
  );
}
