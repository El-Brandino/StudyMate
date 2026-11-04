import { NavLink } from "react-router-dom";
import {
  logo,
  placeholder,
  iconDashboard,
  iconTugas,
  iconJadwal,
  iconProfil,
  iconLogout,
} from "../../assets.js";
import { useEffect, useState } from "react";
import api from "../../api/axios";
import storageUrl from "../../api/storage";
import { Skeleton } from "../Common/Skeleton.jsx";

export default function AsideBarAdmin({
  setView,
  onLogout,
  isOpen = false,
  onClose,
}) {
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

  const handleNavClick = (view) => {
    setView(view);
    onClose?.();
  };

  const handleLogoutClick = () => {
    onClose?.();
    onLogout();
  };

  return (
    <>
      <button
        type="button"
        className={`aside-backdrop${isOpen ? " is-open" : ""}`}
        aria-label="Tutup menu navigasi"
        tabIndex={-1}
        onClick={onClose}
      />
      <aside
        id="main-sidebar"
        className={isOpen ? "is-open" : ""}
        aria-label="Navigasi utama"
      >
        <header>
          <img src={logo} alt="StudyMate logo" />
          <h1>StudyMate</h1>
          <button
            type="button"
            className="aside-close"
            aria-label="Tutup menu navigasi"
            onClick={onClose}
          >
            <span aria-hidden="true">&times;</span>
          </button>
        </header>
        <div className="aside-contain">
          <div className="aside-account">
            <img src={photoUrl} alt="" />
            <div className="account-tittle">
              {user ? (
                <>
                  <h1>{user.name?.split(" ")[0]}</h1>
                  <h1>Administrator</h1>
                </>
              ) : (
                <div className="skeleton-stack">
                  <Skeleton width={74} height={13} />
                  <Skeleton width={66} height={10} />
                </div>
              )}
            </div>
          </div>
          <ul className="button-list">
            <li>
              <NavLink
                to="/dashboard"
                aria-label="Dashboard"
                title="Dashboard"
                data-short="Beranda"
                onClick={() => handleNavClick("Dashboard")}
              >
                <img src={iconDashboard} alt="" />
                <span className="nav-label">Dashboard</span>
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/admin/kelola-akun"
                aria-label="Kelola Akun"
                title="Kelola Akun"
                data-short="Akun"
                onClick={() => handleNavClick("Kelola Akun")}
              >
                <img src={iconProfil} alt="" />
                <span className="nav-label">Kelola Akun</span>
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/admin/mapel"
                aria-label="Mapel"
                title="Mapel"
                data-short="Mapel"
                onClick={() => handleNavClick("Mapel")}
              >
                <img src={iconTugas} alt="" />
                <span className="nav-label">Mapel</span>
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/admin/jadwal"
                aria-label="Jadwal Mapel"
                title="Jadwal Mapel"
                data-short="Jadwal"
                onClick={() => handleNavClick("Jadwal Mapel")}
              >
                <img src={iconJadwal} alt="" />
                <span className="nav-label">Jadwal Mapel</span>
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/profil"
                aria-label="Profil"
                title="Profil"
                data-short="Profil"
                onClick={() => handleNavClick("Profil")}
              >
                <img src={iconProfil} alt="" />
                <span className="nav-label">Profil</span>
              </NavLink>
            </li>
          </ul>
        </div>
        <div className="log-out">
          <button
            type="button"
            aria-label="Log Out"
            title="Log Out"
            data-short="Keluar"
            onClick={handleLogoutClick}
          >
            <img src={iconLogout} alt="" />
            <span className="nav-label">Log Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
