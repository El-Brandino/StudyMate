import { NavLink, useLocation } from "react-router-dom";
import { iconHalfMoon, iconSun, placeholder } from "../../assets.js";
import { useEffect, useState } from "react";
import api from "../../api/axios";
import storageUrl from "../../api/storage";
import { Skeleton } from "../Common/Skeleton.jsx";

const PAGE_TITLES = {
  "/dashboard": "Dashboard",
  "/pengumuman": "Pengumuman",
  "/kalender": "Kalender",
  "/tugas": "Tugas",
  "/ujian": "Ujian",
  "/jadwal-mapel": "Jadwal Mapel",
  "/profil": "Profil",
};

export default function HeaderStd({
  View,
  isDarkMode,
  onToggleTheme,
  onMenuOpen,
  isMenuOpen,
}) {
  const location = useLocation();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const getUser = async () => {
      try {
        const response = await api.get("/me");
        setUser(response.data.user);
      } catch (error) {
        console.error("Gagal mengambil data user:", error);
      }
    };

    getUser();

    const updateUser = () => {
      const savedUser = localStorage.getItem("user");

      if (savedUser) {
        setUser(JSON.parse(savedUser));
      } else {
        getUser();
      }
    };

    window.addEventListener("userUpdated", updateUser);

    return () => {
      window.removeEventListener("userUpdated", updateUser);
    };
  }, []);

  const photoUrl = user?.profile_photo
    ? storageUrl(user.profile_photo)
    : placeholder;
  const pageTitle =
    PAGE_TITLES[location.pathname] ??
    (location.pathname.startsWith("/tugas/") ||
    location.pathname.startsWith("/tugas-kelompok")
      ? "Tugas"
      : View);

  return (
    <nav className="main-header" aria-label="Main navigation">
      <div className="title-nav">
        <button
          type="button"
          className="icon-button mobile-menu-button"
          aria-label="Buka menu navigasi"
          aria-controls="main-sidebar"
          aria-expanded={isMenuOpen}
          onClick={onMenuOpen}
        >
          <span className="hamburger-icon" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        </button>
        <h1>{pageTitle}</h1>
      </div>

      <div className="nav-contain">
        <div className="nav-buttons">
          <button
            className="icon-button theme-toggle"
            type="button"
            onClick={onToggleTheme}
            aria-label={
              isDarkMode ? "Gunakan tema terang" : "Gunakan tema gelap"
            }
            aria-pressed={isDarkMode}
          >
            <img src={isDarkMode ? iconSun : iconHalfMoon} alt="" />
          </button>
        </div>

        <NavLink
          to="/profil"
          className="account-button"
          aria-label="Buka profil"
        >
          <img src={photoUrl} alt="" />

          <span className="account-btn-info">
            {user ? (
              <>
                <strong>{user.name?.split(" ")[0]}</strong>
                <small>{user.role === "siswa" ? "Siswa" : "Guru"}</small>
              </>
            ) : (
              <>
                <Skeleton width={66} height={11} />
                <Skeleton width={38} height={9} />
              </>
            )}
          </span>
        </NavLink>
      </div>
    </nav>
  );
}