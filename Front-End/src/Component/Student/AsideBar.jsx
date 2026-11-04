import { useEffect, useState } from "react";
import api from "../../api/axios";
import storageUrl from "../../api/storage";
import { NavLink } from "react-router-dom";
import {
  logo,
  placeholder,
  iconDashboard,
  iconPengumuman,
  iconKalender,
  iconTugas,
  iconJadwal,
  iconProfil,
  iconLogout,
} from "../../assets.js";
import { Skeleton } from "../Common/Skeleton.jsx";

export default function AsideBarStd({
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
          <img src={photoUrl} alt="Foto profil" />

          <div className="account-tittle">
            {user ? (
              <>
                <h1>{user.name?.split(" ")[0]}</h1>
                <h1>{user.role === "siswa" ? "Siswa" : "Guru"}</h1>
              </>
            ) : (
              <div className="skeleton-stack">
                <Skeleton width={74} height={13} />
                <Skeleton width={46} height={10} />
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
              to="/pengumuman"
              aria-label="Pengumuman"
              title="Pengumuman"
              data-short="Info"
              onClick={() => handleNavClick("Pengumuman")}
            >
              <img src={iconPengumuman} alt="" />
              <span className="nav-label">Pengumuman</span>
            </NavLink>
          </li>

          <li>
            <NavLink
              to="/kalender"
              aria-label="Kalender"
              title="Kalender"
              data-short="Kalender"
              onClick={() => handleNavClick("Kalender")}
            >
              <img src={iconKalender} alt="" />
              <span className="nav-label">Kalender</span>
            </NavLink>
          </li>

          <li>
            <NavLink
              to="/tugas"
              aria-label="Tugas"
              title="Tugas"
              data-short="Tugas"
              onClick={() => handleNavClick("Tugas")}
            >
              <img src={iconTugas} alt="" />
              <span className="nav-label">Tugas</span>
            </NavLink>
          </li>

          <li>
            <NavLink
              to="/ujian"
              aria-label="Ujian"
              title="Ujian"
              data-short="Ujian"
              onClick={() => handleNavClick("Ujian")}
            >
              <img src={iconJadwal} alt="" />
              <span className="nav-label">Ujian</span>
            </NavLink>
          </li>

          <li>
            <NavLink
              to="/jadwal-mapel"
              aria-label="Jadwal Mapel"
              title="Jadwal Mapel"
              data-short="Jadwal"
              onClick={() => handleNavClick("Jadwal Mapel")}
            >
              <img src={iconKalender} alt="" />
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