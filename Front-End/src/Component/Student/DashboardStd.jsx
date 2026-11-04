import {
  Book,
  CheckCircle,
  ClipboardCheck,
  Clock,
  Pin,
  Users,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "../../api/axios";
import {
  formatExamTime,
  getExamDatePart,
  getExamDateTime,
  isExamWithinFiveDays,
} from "../../utils/ujian";
import { DashboardSkeleton } from "../Common/Skeleton.jsx";

const formatDate = (value) => {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const formatExamShortDate = (value) => {
  const text = String(value ?? "");
  const datePart = text.match(/^\d{4}-\d{2}-\d{2}/)?.[0];

  if (!datePart) return formatDate(value);

  return new Date(`${datePart}T00:00:00`).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const getCreatedTime = (value) => {
  const time = new Date(value).getTime();

  return Number.isNaN(time) ? 0 : time;
};

export default function DashboardStd() {
  const [user, setUser] = useState(null);
  const [progress, setProgress] = useState(null);
  const [tugas, setTugas] = useState([]);
  const [jadwal, setJadwal] = useState([]);
  const [ujians, setUjians] = useState([]);
  const tugasKelompok = tugas.filter((item) => item.mode === "kelompok");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const getDashboard = async () => {
      const results = await Promise.allSettled([
        api.get("/me"),
        api.get("/progress"),
        api.get("/tugas"),
        api.get("/jadwal-mapel"),
        api.get("/ujian"),
      ]);

      if (!active) return;

      const [
        userResult,
        progressResult,
        tugasResult,
        jadwalResult,
        ujianResult,
      ] = results;

      if (userResult.status === "fulfilled") {
        setUser(userResult.value.data.user);
      } else {
        console.error("Gagal mengambil data user:", userResult.reason);
      }

      if (progressResult.status === "fulfilled") {
        setProgress(progressResult.value.data);
      } else {
        console.error("Gagal mengambil progress:", progressResult.reason);
      }

      if (tugasResult.status === "fulfilled") {
        setTugas(
          Array.isArray(tugasResult.value.data) ? tugasResult.value.data : [],
        );
      } else {
        console.error("Gagal mengambil tugas:", tugasResult.reason);
      }

      if (jadwalResult.status === "fulfilled") {
        setJadwal(
          Array.isArray(jadwalResult.value.data) ? jadwalResult.value.data : [],
        );
      } else {
        console.error("Gagal mengambil jadwal:", jadwalResult.reason);
      }

      if (ujianResult.status === "fulfilled") {
        setUjians(
          Array.isArray(ujianResult.value.data) ? ujianResult.value.data : [],
        );
      } else {
        console.error("Gagal mengambil ujian:", ujianResult.reason);
      }

      setLoading(false);
    };

    getDashboard();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const updateUser = () => {
      const savedUser = localStorage.getItem("user");

      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }
    };

    window.addEventListener("userUpdated", updateUser);

    return () => {
      window.removeEventListener("userUpdated", updateUser);
    };
  }, []);

  const now = new Date();

  const akhirMinggu = new Date(now);
  akhirMinggu.setDate(now.getDate() + (7 - now.getDay()));

  const deadlineMingguIni = tugas.filter((item) => {
    const deadline = new Date(item.deadline);

    return deadline >= now && deadline <= akhirMinggu;
  }).length;

  const totalMataPelajaran = new Set(tugas.map((item) => item.subject_id)).size;

  const todayName = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
  });

  const todaySchedules = [...jadwal]
    .filter((item) => item.hari === todayName)
    .sort((a, b) =>
      String(a.jam_mulai ?? "").localeCompare(String(b.jam_mulai ?? "")),
    )
    .slice(0, 3);

  const latestTugas = [...tugas]
    .sort((a, b) => getCreatedTime(b.created_at) - getCreatedTime(a.created_at))
    .slice(0, 3);

  const latestTugasKelompok = [...tugasKelompok]
    .sort((a, b) => getCreatedTime(b.created_at) - getCreatedTime(a.created_at))
    .slice(0, 3);

  const pinnedExams = [...ujians]
    .filter(isExamWithinFiveDays)
    .sort((a, b) => getExamDateTime(a) - getExamDateTime(b));

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const getPinLabel = (ujian) => {
    const datePart = getExamDatePart(ujian.exam_date);

    if (!datePart) return "Ujian";

    const examDate = new Date(`${datePart}T00:00:00`);
    const selisihHari = Math.round(
      (examDate.getTime() - todayStart.getTime()) / (24 * 60 * 60 * 1000),
    );

    if (selisihHari <= 0) return "Hari ini";
    if (selisihHari === 1) return "Besok";
    return `H-${selisihHari}`;
  };

  if (loading) {
    return <DashboardSkeleton variant="student" />;
  }

  return (
    <>
      <section className="main-dashboard">
        <div className="greeting-card">
          <h2>
            Selamat, pagi {user?.gender === "Male" ? "Siswa" : "Siswi"}{" "}
            {user?.name}!!
          </h2>
          <p>Semangat belajarnya hari ini!</p>
        </div>

        {pinnedExams.length > 0 && (
          <section
            className="pinned-exams"
            aria-labelledby="pinned-exams-title"
          >
            <div className="pinned-exams__header">
              <span className="pinned-exams__icon" aria-hidden="true">
                <Pin size={17} />
              </span>

              <div className="pinned-exams__heading">
                <h3 id="pinned-exams-title">Ujian Terdekat</h3>
                <p>{pinnedExams.length} ujian dalam 5 hari ke depan</p>
              </div>

              <NavLink to="/ujian">Lihat Semua</NavLink>
            </div>

            <div className="pinned-exams__list">
              {pinnedExams.map((ujian) => (
                <div className="pinned-exam" key={ujian.id}>
                  <span className="pinned-exam__date">
                    <strong>{formatExamShortDate(ujian.exam_date)}</strong>
                    <small>{formatExamTime(ujian.start_time)}</small>
                  </span>

                  <span className="pinned-exam__content">
                    <strong>{ujian.title ?? "Ujian"}</strong>
                    <span>{ujian.subject?.name ?? "-"}</span>
                  </span>

                  <span className="pinned-exam__badge">
                    {getPinLabel(ujian)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="stats-grid">
          <div className="stats-card">
            <div className="icon-box" id="clipboard">
              <ClipboardCheck size={24} color="#73B69B" />
            </div>
            <div>
              <strong>{progress?.total || 0}</strong>
              <small>Total Tugas</small>
            </div>
          </div>
          <div className="stats-card">
            <div className="icon-box" id="checked">
              <CheckCircle size={24} color="#B8922E" />
            </div>
            <div>
              <strong>{progress?.selesai || 0}</strong>
              <small>Selesai</small>
            </div>
          </div>
          <div className="stats-card">
            <div className="icon-box" id="clock">
              <Clock size={24} color="#D96B6B" />
            </div>
            <div>
              <strong>{deadlineMingguIni}</strong>
              <small>Deadline Minggu ini</small>
            </div>
          </div>
          <div className="stats-card">
            <div className="icon-box" id="book">
              <Book size={24} color="#7FA794" />
            </div>
            <div>
              <strong>{totalMataPelajaran}</strong>
              <small>Total Mata pelajaran</small>
            </div>
          </div>
        </div>
        <div className="progress-div">
          <div className="progress-header">
            <h3>Progres Tugas</h3>
            <span>{progress?.persentase || 0}%</span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-bar-fill"
              style={{
                width: `${progress?.persentase || 0}%`,
              }}
            />
          </div>
        </div>
        <div className="dashboard-info">
          <div className="card-info">
            <div className="card-info-header">
              <h3>Jadwal Hari Ini</h3>
              <NavLink to="/jadwal-mapel">Lihat Semua</NavLink>
            </div>
            <div
              className={`card-info-view ${
                todaySchedules.length === 0
                  ? "card-info-view--empty"
                  : "student-dashboard-list"
              }`}
            >
              {todaySchedules.length === 0 ? (
                <p>Tidak ada jadwal hari ini.</p>
              ) : (
                todaySchedules.map((item) => (
                  <div className="student-dashboard-item" key={item.id}>
                    <span className="student-dashboard-item__time">
                      {String(item.jam_mulai ?? "").slice(0, 5)}
                    </span>

                    <span className="student-dashboard-item__content">
                      <strong>{item.subject?.name ?? "-"}</strong>
                      <span>{item.teacher?.name ?? "-"}</span>
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="card-info">
            <div className="card-info-header">
              <h3>Tugas Terbaru</h3>
              <NavLink to="/tugas">Lihat Semua</NavLink>
            </div>
            <div
              className={`card-info-view ${
                latestTugas.length === 0
                  ? "card-info-view--empty"
                  : "student-dashboard-list"
              }`}
            >
              {latestTugas.length === 0 ? (
                <p>Belum ada tugas.</p>
              ) : (
                latestTugas.map((item) => (
                  <div className="student-dashboard-item" key={item.id}>
                    <span
                      className="student-dashboard-item__time"
                      title={
                        item.deadline
                          ? `Deadline ${formatDate(item.deadline)}`
                          : undefined
                      }
                    >
                      {formatDate(item.deadline)}
                    </span>

                    <span className="student-dashboard-item__content">
                      <strong>{item.title}</strong>
                      <span>{item.subject?.name ?? "-"}</span>
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="card-info">
            <div className="card-info-header">
              <h3>Tugas Kelompok</h3>
              <NavLink to="/tugas?mode=kelompok">Lihat Semua</NavLink>
            </div>
            <div
              className={`card-info-view ${
                latestTugasKelompok.length === 0
                  ? "card-info-view--empty"
                  : "student-dashboard-list"
              }`}
            >
              {latestTugasKelompok.length === 0 ? (
                <p>Belum ada tugas kelompok.</p>
              ) : (
                latestTugasKelompok.map((item) => (
                  <NavLink
                    className="student-dashboard-item"
                    to={`/tugas/${item.id}`}
                    key={item.id}
                  >
                    <span className="student-dashboard-item__time">
                      <Users size={16} />
                    </span>

                    <span className="student-dashboard-item__content">
                      <strong>{item.title}</strong>
                      <span>
                        {item.my_group
                          ? `${item.my_group.name} · ${item.my_group.progress?.label ?? "Belum Ada Pembagian Tugas"}`
                          : item.pending_invitation_count > 0
                            ? `${item.pending_invitation_count} undangan kelompok`
                            : "Belum ada kelompok"}
                      </span>
                    </span>
                  </NavLink>
                ))
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
