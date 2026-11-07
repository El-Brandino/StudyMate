import { useState } from "react";
import { logo, iconHalfMoon, iconSun } from "../assets.js";
import api from "../api/axios";
import { toast } from "sonner";

export default function Login({
  isDarkMode,
  onToggleTheme,
  onLogin,
  onGoToRegister,
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (event) => {
    event.preventDefault();

    if (isLoading) return;

    setIsLoading(true);

    try {
      const response = await api.post("/login", {
        email: email,
        password: password,
      });

      const { token, user } = response.data;

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      onLogin(user);

      toast.success("Login berhasil");

      console.log("Login berhasil:", response.data);
    } catch (error) {
      toast.error("Login gagal");
      console.error("Login gagal:", error.response?.data);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
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
          {/* Logo Section */}
          <div className="logo-section">
            <div className="logo-icon">
              <img src={logo} alt="Logo StudyMate" />
            </div>
            <h1 className="app-name">StudyMate</h1>
            <p className="app-tagline">
              Platform Manajemen Belajar Sekolah
            </p>
          </div>

          {/* Login Form */}
          <form className="login-form" onSubmit={handleLogin}>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                placeholder="Masukkan email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  placeholder="Masukkan password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowPassword((visible) => !visible)}
                  id="toggleBtn"
                  aria-label={
                    showPassword ? "Sembunyikan password" : "Tampilkan password"
                  }
                  aria-pressed={showPassword}
                >
                  <svg
                    id="eyeIcon"
                    xmlns="http://www.w3.org/2000/svg"
                    width={20}
                    height={20}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    {showPassword ? (
                      <>
                        <path d="M3 3l18 18" />
                        <path d="M10.58 10.58a2 2 0 0 0 2.83 2.83" />
                        <path d="M9.88 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a18.45 18.45 0 0 1-3.16 4.19" />
                        <path d="M6.61 6.61C3.83 8.44 1 12 1 12s4 8 11 8a10.9 10.9 0 0 0 4.39-.92" />
                      </>
                    ) : (
                      <>
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx={12} cy={12} r={3} />
                      </>
                    )}
                  </svg>
                </button>
              </div>
            </div>
            <button type="submit" className="btn-login" disabled={isLoading}>
              {isLoading ? "Memproses..." : "Masuk"}
            </button>
          </form>
          <p className="auth-switch">
            Belum punya akun?{" "}
            <a
              className="auth-switch__link"
              href="/register"
              onClick={(event) => {
                event.preventDefault();
                onGoToRegister();
              }}
            >
              Daftar sebagai siswa
            </a>
          </p>
        </div>
      </div>
    </>
  );
}
