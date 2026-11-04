
import { useEffect, useState } from "react";
import { logo, iconHalfMoon, iconSun } from "../assets.js";
import api from "../api/axios";
import { toast } from "sonner";
import { Skeleton } from "./Common/Skeleton.jsx";

export default function Register({
  isDarkMode,
  onToggleTheme,
  onRegistered,
  onBackToLogin,
}) {
  const [name, setName] = useState("");
  const [gender, setGender] = useState("Male");
  const [email, setEmail] = useState("");
  const [grade, setGrade] = useState("");
  const [majorId, setMajorId] = useState("");
  const [classNumber, setClassNumber] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [classes, setClasses] = useState([]);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingClasses, setIsLoadingClasses] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadClasses() {
      try {
        const response = await api.get("/kelas");

        if (active) {
          setClasses(Array.isArray(response.data) ? response.data : []);
        }
      } catch (error) {
        console.error("Gagal memuat kelas:", error);
        if (active) {
          toast.error("Daftar kelas gagal dimuat.");
        }
      } finally {
        if (active) setIsLoadingClasses(false);
      }
    }

    loadClasses();

    return () => {
      active = false;
    };
  }, []);

  // API /kelas mengembalikan major secara flat (major_id & major_name).
  const grades = [
    ...new Set(
      classes
        .map((kelas) => String(kelas.grade ?? "").trim())
        .filter(Boolean),
    ),
  ].sort((a, b) => a.localeCompare(b, "id", { numeric: true }));

  const majors = [
    ...new Map(
      classes
        .filter(
          (kelas) =>
            (!grade || String(kelas.grade) === grade) &&
            kelas.major_id &&
            kelas.major_name,
        )
        .map((kelas) => [
          String(kelas.major_id),
          { id: String(kelas.major_id), name: kelas.major_name },
        ]),
    ).values(),
  ];

  const classNumbers = [
    ...new Set(
      classes
        .filter(
          (kelas) =>
            (!grade || String(kelas.grade) === grade) &&
            (!majorId || String(kelas.major_id) === majorId),
        )
        .map((kelas) => String(kelas.class_number ?? "").trim())
        .filter(Boolean),
    ),
  ].sort((a, b) => Number(a) - Number(b));

  const selectedClass =
    classes.find(
      (kelas) =>
        String(kelas.grade) === grade &&
        String(kelas.major_id) === majorId &&
        String(kelas.class_number) === classNumber,
    ) ?? null;

  const handleGradeChange = (event) => {
    setGrade(event.target.value);
    setMajorId("");
    setClassNumber("");
  };

  const handleMajorChange = (event) => {
    setMajorId(event.target.value);
    setClassNumber("");
  };

  const handleClassNumberChange = (event) => {
    setClassNumber(event.target.value);
  };

  async function handleRegister(event) {
    event.preventDefault();

    if (isLoading) return;

    if (password !== passwordConfirmation) {
      toast.error("Konfirmasi password tidak cocok.");
      return;
    }

    if (password.length < 8) {
      toast.error("Password minimal 8 karakter.");
      return;
    }

    if (!selectedClass) {
      toast.error("Pilih kelas terlebih dahulu.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.post("/register", {
        name,
        gender,
        email,
        class_id: Number(selectedClass.id),
        password,
        password_confirmation: passwordConfirmation,
      });

      const { token, user } = response.data;

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      toast.success("Registrasi berhasil. Selamat datang di StudyMate!");

      onRegistered(user);
    } catch (error) {
      console.error("Registrasi gagal:", error.response?.data);

      const errors = error.response?.data?.errors;
      const firstError = errors
        ? Object.values(errors).flat()[0]
        : null;

      toast.error(
        firstError ||
          error.response?.data?.message ||
          "Registrasi gagal. Silakan coba lagi."
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="login-wrapper">
      <button
        className="icon-button theme-toggle login-theme-toggle"
        type="button"
        onClick={onToggleTheme}
        aria-label={isDarkMode ? "Gunakan tema terang" : "Gunakan tema gelap"}
        aria-pressed={isDarkMode}
      >
        <img src={isDarkMode ? iconSun : iconHalfMoon} alt="" />
      </button>

      <div className="login-card">
        <div className="logo-section">
          <div className="logo-icon">
            <img src={logo} alt="Logo StudyMate" />
          </div>

          <h1 className="app-name">StudyMate</h1>
          <p className="app-tagline">
            Platform Manajemen Belajar Sekolah Telesandi
          </p>
          <p>Daftar sebagai siswa</p>
        </div>

        <form className="login-form" onSubmit={handleRegister}>
          <div className="form-group">
            <label htmlFor="register-name">Nama Lengkap</label>
            <input
              id="register-name"
              type="text"
              autoComplete="name"
              placeholder="Masukkan nama lengkap"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={255}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="register-gender">Jenis Kelamin</label>
            <select
              id="register-gender"
              value={gender}
              onChange={(event) => setGender(event.target.value)}
              required
            >
              <option value="Male">Laki-laki</option>
              <option value="Female">Perempuan</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="register-email">Email</label>
            <input
              id="register-email"
              type="email"
              autoComplete="email"
              placeholder="Masukkan email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          {isLoadingClasses ? (
            <div className="form-group">
              <label htmlFor="register-class">Kelas</label>
              <div className="register-class-grid">
                <Skeleton height={52} radius={10} />
                <Skeleton height={52} radius={10} />
                <Skeleton height={52} radius={10} />
              </div>
            </div>
          ) : classes.length === 0 ? (
            <div className="form-group">
              <label htmlFor="register-class">Kelas</label>
              <select id="register-class" defaultValue="" disabled required>
                <option value="">Kelas belum tersedia</option>
              </select>
            </div>
          ) : (
            <>
              <div className="register-class-grid">
                <div className="form-group">
                  <label htmlFor="register-grade">Tingkat</label>
                  <select
                    id="register-grade"
                    value={grade}
                    onChange={handleGradeChange}
                    required
                  >
                    <option value="">Pilih tingkat</option>
                    {grades.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="register-major">Jurusan</label>
                  <select
                    id="register-major"
                    value={majorId}
                    onChange={handleMajorChange}
                    disabled={!grade}
                    required
                  >
                    <option value="">Pilih jurusan</option>
                    {majors.map((major) => (
                      <option key={major.id} value={major.id}>
                        {major.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="register-class-number">Nomor Kelas</label>
                  <select
                    id="register-class-number"
                    value={classNumber}
                    onChange={handleClassNumberChange}
                    disabled={!majorId}
                    required
                  >
                    <option value="">Pilih nomor</option>
                    {classNumbers.map((number) => (
                      <option key={number} value={number}>
                        Kelas {number}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedClass && (
                <p className="register-class-preview">
                  Kelas terpilih: <strong>{selectedClass.name}</strong>
                </p>
              )}
            </>
          )}

          <div className="form-group">
            <label htmlFor="register-password">Password</label>
            <div className="password-input-wrapper">
              <input
                id="register-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Minimal 8 karakter"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={8}
                required
              />

              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={
                  showPassword ? "Sembunyikan password" : "Tampilkan password"
                }
              >
                {showPassword ? "Sembunyikan" : "Lihat"}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="register-confirm-password">
              Konfirmasi Password
            </label>
            <div className="password-input-wrapper">
              <input
                id="register-confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Ulangi password"
                value={passwordConfirmation}
                onChange={(event) =>
                  setPasswordConfirmation(event.target.value)
                }
                minLength={8}
                required
              />

              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowConfirmPassword((value) => !value)}
                aria-label={
                  showConfirmPassword
                    ? "Sembunyikan konfirmasi password"
                    : "Tampilkan konfirmasi password"
                }
              >
                {showConfirmPassword ? "Sembunyikan" : "Lihat"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn-login"
            disabled={isLoading || isLoadingClasses || classes.length === 0}
          >
            {isLoading ? "Memproses..." : "Daftar"}
          </button>

          <p className="auth-switch">
            Sudah punya akun?{" "}
            <a
              className="auth-switch__link"
              href="/login"
              onClick={(event) => {
                event.preventDefault();
                onBackToLogin();
              }}
            >
              Masuk
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}
