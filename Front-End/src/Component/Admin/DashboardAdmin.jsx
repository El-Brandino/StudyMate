import {
  BookOpen,
  CalendarDays,
  GraduationCap,
  School,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import api from "../../api/axios";
import { DashboardSkeleton } from "../Common/Skeleton.jsx";

const DAY_NAMES = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
];

const getInitials = (name = "") => {
  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return initials || "AD";
};

const getCreatedAt = (item) =>
  item.created_at ? new Date(item.created_at).getTime() : 0;

export default function DashboardAdmin() {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({
    teachers: 0,
    students: 0,
    subjects: 0,
    classes: 0,
  });
  const [todaySchedules, setTodaySchedules] = useState([]);
  const [latestAccounts, setLatestAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const fetchData = async () => {
      try {
        const [meRes, teachersRes, studentsRes, subjectsRes, kelasRes, jadwalRes] =
          await Promise.all([
            api.get("/me"),
            api.get("/admin/teachers"),
            api.get("/admin/students"),
            api.get("/subjects"),
            api.get("/kelas"),
            api.get("/admin/jadwal"),
          ]);

        if (!active) return;

        const teachers = teachersRes.data ?? [];
        const students = studentsRes.data ?? [];
        const subjects = subjectsRes.data ?? [];
        const kelas = kelasRes.data ?? [];
        const jadwal = jadwalRes.data ?? [];
        const today = DAY_NAMES[new Date().getDay()];

        setUser(meRes.data.user);
        setStats({
          teachers: teachers.length,
          students: students.length,
          subjects: subjects.length,
          classes: kelas.length,
        });
        setTodaySchedules(
          jadwal
            .filter((item) => item.hari === today)
            .sort(
              (a, b) =>
                String(a.jam_mulai).localeCompare(String(b.jam_mulai)) ||
                (a.urutan ?? 0) - (b.urutan ?? 0),
            )
            .slice(0, 5),
        );
        setLatestAccounts(
          [...teachers, ...students]
            .sort((a, b) => getCreatedAt(b) - getCreatedAt(a))
            .slice(0, 5),
        );
      } catch (error) {
        console.error("Gagal mengambil data dashboard:", error);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchData();

    return () => {
      active = false;
    };
  }, []);

  const firstName = user?.name?.split(" ")[0] || "Admin";
  const todayLabel = new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  if (loading) {
    return <DashboardSkeleton variant="admin" />;
  }

  return (
    <main className="admin-page admin-dashboard-page">
      <section className="greeting-card admin-greeting">
        <div>
          <p className="admin-eyebrow">Dashboard Admin</p>
          <h2>Selamat datang, {firstName}!</h2>
          <p className="admin-greeting-subtitle">
            Kelola akun, mapel, dan jadwal pelajaran StudyMate dari satu
            tempat. Hari ini {todayLabel}.
          </p>
        </div>

        <div className="admin-greeting-actions">
          <NavLink
            to="/admin/kelola-akun"
            className="admin-btn admin-btn--primary"
          >
            <Users size={17} />
            Kelola Akun
          </NavLink>
          <NavLink
            to="/admin/jadwal"
            className="admin-btn admin-btn--secondary"
          >
            <CalendarDays size={17} />
            Lihat Jadwal
          </NavLink>
        </div>
      </section>

      <div className="stats-grid">
        <div className="stats-card">
          <div className="icon-box" id="clipboard">
            <Users size={24} color="#73B69B" />
          </div>
          <div>
            <strong>{stats.teachers}</strong>
            <small>Total Guru</small>
          </div>
        </div>

        <div className="stats-card">
          <div className="icon-box" id="checked">
            <GraduationCap size={24} color="#B8922E" />
          </div>
          <div>
            <strong>{stats.students}</strong>
            <small>Total Siswa</small>
          </div>
        </div>

        <div className="stats-card">
          <div className="icon-box" id="book">
            <BookOpen size={24} color="#7FA794" />
          </div>
          <div>
            <strong>{stats.subjects}</strong>
            <small>Total Mapel</small>
          </div>
        </div>

        <div className="stats-card">
          <div className="icon-box" id="clock">
            <School size={24} color="#D96B6B" />
          </div>
          <div>
            <strong>{stats.classes}</strong>
            <small>Total Kelas</small>
          </div>
        </div>
      </div>

      <div className="dashboard-info admin-dashboard-info">
        <section className="card-info">
          <div className="card-info-header">
            <h3>Jadwal Hari Ini</h3>
            <NavLink to="/admin/jadwal">Lihat Semua</NavLink>
          </div>

          {todaySchedules.length > 0 ? (
            <div className="admin-agenda-list">
              {todaySchedules.map((item) => (
                <div className="admin-agenda-item" key={item.id}>
                  <div className="admin-agenda-time">
                    <strong>{String(item.jam_mulai).slice(0, 5)}</strong>
                    <span>{String(item.jam_selesai).slice(0, 5)}</span>
                  </div>
                  <div className="admin-agenda-main">
                    <strong>{item.subject?.name}</strong>
                    <span>
                      {item.kelas?.name} • {item.teacher?.name}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="admin-empty admin-empty--compact">
              <CalendarDays size={22} />
              <p>Belum ada jadwal untuk hari ini.</p>
            </div>
          )}
        </section>

        <section className="card-info">
          <div className="card-info-header">
            <h3>Akun Terbaru</h3>
            <NavLink to="/admin/kelola-akun">Lihat Semua</NavLink>
          </div>

          {latestAccounts.length > 0 ? (
            <div className="admin-account-list">
              {latestAccounts.map((item) => (
                <div
                  className="admin-account-item"
                  key={`${item.role}-${item.id}`}
                >
                  <div className="admin-avatar">{getInitials(item.name)}</div>
                  <div className="admin-account-copy">
                    <strong>{item.name}</strong>
                    <span>{item.email}</span>
                  </div>
                  <span className="admin-badge admin-badge--muted">
                    {item.role === "guru" ? "Guru" : "Siswa"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="admin-empty admin-empty--compact">
              <Users size={22} />
              <p>Belum ada akun terdaftar.</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
