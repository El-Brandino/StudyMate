import { useEffect, useState } from "react";
import "./App.css";
import "./App-Student.css";
import "./App-Teacher.css";
import "./App-Admin.css";
import "./Skeleton.css";
import "./TugasKelompok.css";
import "./App-Responsive.css";
import { Toaster, toast } from "sonner";
import api from "./api/axios";
//import Global
import Login from "./Component/Login.jsx";
import Register from "./Component/Register.jsx";
// Import Student
import AsideBarStd from "./Component/Student/AsideBar.jsx";
import HeaderStd from "./Component/Student/Header.jsx";
import DashboardStd from "./Component/Student/DashboardStd.jsx";
import KalenderStd from "./Component/Student/Kalender.jsx";
import TugasStd from "./Component/Student/Tugas.jsx";
import TugasKelompokDetailStd from "./Component/TugasKelompok/Student/TugasKelompokDetail.jsx";
import PengumumanStd from "./Component/Student/Pengumuman.jsx";
import ProfilStd from "./Component/Student/Profil.jsx";
import UjianStd from "./Component/Student/Ujian.jsx";
import JadwalMapelSiswa from "./Component/Student/JadwalMapel.jsx";
// Import Teacher
import AsideBarTch from "./Component/Teacher/AsideBar.jsx";
import HeaderTch from "./Component/Teacher/Header.jsx";
import DashboardTch from "./Component/Teacher/DashboardTch.jsx";
import KalenderTch from "./Component/Teacher/Kalender.jsx";
import PengumumanTch from "./Component/Teacher/Pengumuman.jsx";
import TugasTch from "./Component/Teacher/Tugas.jsx";
import TugasKelompokDetailTch from "./Component/TugasKelompok/Teacher/TugasKelompokDetail.jsx";
import UjianTch from "./Component/Teacher/Ujian.jsx";
import ProfilTch from "./Component/Teacher/Profil.jsx";
import JadwalMapelGuru from "./Component/Teacher/JadwalMapel.jsx";
// Import Admin
import AsideBarAdmin from "./Component/Admin/AsideBar.jsx";
import HeaderAdmin from "./Component/Admin/Header.jsx";
import DashboardAdmin from "./Component/Admin/DashboardAdmin.jsx";
import KelolaAkun from "./Component/Admin/KelolaAkun.jsx";
import MapelAdmin from "./Component/Admin/Mapel.jsx";
import JadwalMapelAdmin from "./Component/Admin/JadwalMapel.jsx";
import ProfilAdmin from "./Component/Admin/Profil.jsx";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useParams,
} from "react-router-dom";

function LegacyTugasKelompokRedirect() {
  const { id } = useParams();

  return <Navigate to={id ? `/tugas/${id}` : "/tugas"} replace />;
}

export default function App() {
  const [authView, setAuthView] = useState("login");
  const [View, setView] = useState("Dashboard");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(
    () => localStorage.getItem("studymate-theme") === "dark",
  );

  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("user");

    if (!savedUser) return null;

    try {
      return JSON.parse(savedUser);
    } catch {
      localStorage.removeItem("user");
      return null;
    }
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark-mode", isDarkMode);
    localStorage.setItem("studymate-theme", isDarkMode ? "dark" : "light");
  }, [isDarkMode]);

  useEffect(() => {
    if (!isSidebarOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsSidebarOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isSidebarOpen]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 768px)");

    const handleChange = (event) => {
      if (!event.matches) {
        setIsSidebarOpen(false);
      }
    };

    mediaQuery.addEventListener("change", handleChange);

    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const toggleTheme = () => {
    setIsDarkMode((currentMode) => !currentMode);
  };

  const handleLogout = async () => {
    try {
      await api.post("/logout");
    } catch (error) {
      // Tetap logout di sisi klien meskipun token sudah tidak valid.
      console.error("Gagal logout dari server:", error);
    }

    localStorage.removeItem("token");
    localStorage.removeItem("user");

    setIsSidebarOpen(false);
    setUser(null);

    toast.success("Logout berhasil");
  };

  if (!user) {
    return (
      <>
        <Toaster position="bottom-right" richColors />

        {authView === "register" ? (
          <Register
            isDarkMode={isDarkMode}
            onToggleTheme={toggleTheme}
            onRegistered={(newUser) => {
              setUser(newUser);
              setAuthView("login");
            }}
            onBackToLogin={() => setAuthView("login")}
          />
        ) : (
          <Login
            isDarkMode={isDarkMode}
            onToggleTheme={toggleTheme}
            onLogin={setUser}
            onGoToRegister={() => setAuthView("register")}
          />
        )}
      </>
    );
  }

  return (
    <>
      <Toaster position="bottom-right" richColors />

      <BrowserRouter>
        {user.role === "admin" ? (
          <>
            <AsideBarAdmin
              setView={setView}
              onLogout={handleLogout}
              isOpen={isSidebarOpen}
              onClose={() => setIsSidebarOpen(false)}
            />

            <HeaderAdmin
              isDarkMode={isDarkMode}
              onToggleTheme={toggleTheme}
              onMenuOpen={() => setIsSidebarOpen(true)}
              isMenuOpen={isSidebarOpen}
            />

            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardAdmin />} />
              <Route path="/admin/kelola-akun" element={<KelolaAkun />} />
              <Route path="/admin/mapel" element={<MapelAdmin />} />
              <Route path="/admin/jadwal" element={<JadwalMapelAdmin />} />
              <Route path="/profil" element={<ProfilAdmin />} />
              <Route path="/logout" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </>
        ) : user.role === "guru" ? (
          <>
            <AsideBarTch
              setView={setView}
              onLogout={handleLogout}
              isOpen={isSidebarOpen}
              onClose={() => setIsSidebarOpen(false)}
            />

            <HeaderTch
              View={View}
              isDarkMode={isDarkMode}
              onToggleTheme={toggleTheme}
              onMenuOpen={() => setIsSidebarOpen(true)}
              isMenuOpen={isSidebarOpen}
            />

            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />

              <Route path="/dashboard" element={<DashboardTch />} />

              <Route path="/pengumuman" element={<PengumumanTch />} />

              <Route path="/kalender" element={<KalenderTch />} />

              <Route path="/tugas" element={<TugasTch />} />

              <Route path="/tugas/:id" element={<TugasKelompokDetailTch />} />

              <Route
                path="/tugas-kelompok"
                element={<LegacyTugasKelompokRedirect />}
              />

              <Route
                path="/tugas-kelompok/:id"
                element={<LegacyTugasKelompokRedirect />}
              />

              <Route path="/ujian" element={<UjianTch />} />

              <Route path="/jadwal-mapel" element={<JadwalMapelGuru />} />

              <Route path="/profil" element={<ProfilTch />} />

              <Route
                path="/logout"
                element={<Navigate to="/dashboard" replace />}
              />
            </Routes>
          </>
        ) : (
          <>
            <AsideBarStd
              setView={setView}
              onLogout={handleLogout}
              isOpen={isSidebarOpen}
              onClose={() => setIsSidebarOpen(false)}
            />

            <HeaderStd
              View={View}
              isDarkMode={isDarkMode}
              onToggleTheme={toggleTheme}
              onMenuOpen={() => setIsSidebarOpen(true)}
              isMenuOpen={isSidebarOpen}
            />

            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />

              <Route path="/dashboard" element={<DashboardStd />} />

              <Route path="/pengumuman" element={<PengumumanStd />} />

              <Route path="/kalender" element={<KalenderStd />} />

              <Route path="/tugas" element={<TugasStd />} />

              <Route path="/tugas/:id" element={<TugasKelompokDetailStd />} />

              <Route
                path="/tugas-kelompok"
                element={<LegacyTugasKelompokRedirect />}
              />

              <Route
                path="/tugas-kelompok/:id"
                element={<LegacyTugasKelompokRedirect />}
              />

              <Route path="/ujian" element={<UjianStd />} />

              <Route path="/jadwal-mapel" element={<JadwalMapelSiswa />} />

              <Route path="/profil" element={<ProfilStd />} />

              <Route
                path="/logout"
                element={<Navigate to="/dashboard" replace />}
              />
            </Routes>
          </>
        )}
      </BrowserRouter>
    </>
  );
}
