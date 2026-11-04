
import {
  BookOpen,
  CalendarDays,
  ClipboardList,
  Clock3,
  Users,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import api from "../../api/axios";
import {
  formatExamDate,
  formatExamTime,
  getExamDateTime,
} from "../../utils/ujian";
import { DashboardSkeleton } from "../Common/Skeleton.jsx";

export default function DashboardTch() {
  const [user, setUser] = useState(null);
  const [tugas, setTugas] = useState([]);
  const [pengumuman, setPengumuman] = useState([]);
  const [kelasList, setKelasList] = useState([]);
  const [ujians, setUjians] = useState([]);
  const tugasKelompok = tugas.filter((item) => item.mode === "kelompok");
  const [loading, setLoading] = useState(true);
  const skipInitialProgress = useRef(true);

  const [filterGrade, setFilterGrade] = useState("");
  const [filterMajor, setFilterMajor] = useState("");
  const [filterClassNumber, setFilterClassNumber] = useState("");

  const [progress, setProgress] = useState({
    total: 0,
    selesai: 0,
    belum: 0,
    persentase: 0,
  });

  // Memperbarui data guru jika profil berubah.
  useEffect(() => {
    const updateUser = () => {
      try {
        const savedUser = localStorage.getItem("user");

        if (savedUser) {
          setUser(JSON.parse(savedUser));
        }
      } catch (error) {
        console.error("Gagal membaca data user:", error);
      }
    };

    window.addEventListener("userUpdated", updateUser);

    return () => {
      window.removeEventListener("userUpdated", updateUser);
    };
  }, []);

  // Mengambil seluruh data awal dashboard secara paralel.
  useEffect(() => {
    let active = true;

    const getDashboard = async () => {
      const results = await Promise.allSettled([
        api.get("/me"),
        api.get("/tugas"),
        api.get("/pengumuman"),
        api.get("/kelas"),
        api.get("/teacher/progress"),
        api.get("/ujian"),
      ]);

      if (!active) return;

      const [
        userResult,
        tugasResult,
        pengumumanResult,
        kelasResult,
        progressResult,
        ujianResult,
      ] = results;

      if (userResult.status === "fulfilled") {
        setUser(userResult.value.data.user);
      } else {
        console.error("Gagal mengambil data user:", userResult.reason);
      }

      if (tugasResult.status === "fulfilled") {
        setTugas(
          Array.isArray(tugasResult.value.data) ? tugasResult.value.data : [],
        );
      } else {
        console.error("Gagal mengambil data tugas:", tugasResult.reason);
      }

      if (pengumumanResult.status === "fulfilled") {
        setPengumuman(
          Array.isArray(pengumumanResult.value.data)
            ? pengumumanResult.value.data
            : [],
        );
      } else {
        console.error(
          "Gagal mengambil data pengumuman:",
          pengumumanResult.reason,
        );
      }

      if (kelasResult.status === "fulfilled") {
        setKelasList(
          Array.isArray(kelasResult.value.data) ? kelasResult.value.data : [],
        );
      } else {
        console.error("Gagal mengambil data kelas:", kelasResult.reason);
      }

      if (progressResult.status === "fulfilled") {
        setProgress(progressResult.value.data);
      } else {
        console.error("Gagal mengambil progress tugas:", progressResult.reason);
      }

      if (ujianResult.status === "fulfilled") {
        setUjians(
          Array.isArray(ujianResult.value.data) ? ujianResult.value.data : [],
        );
      } else {
        console.error("Gagal mengambil data ujian:", ujianResult.reason);
      }

      setLoading(false);
    };

    getDashboard();

    return () => {
      active = false;
    };
  }, []);

  // Mengambil progress tugas sesuai filter tingkat/jurusan/nomor kelas.
  useEffect(() => {
    // Data progress awal sudah diambil bersama data dashboard lainnya.
    if (skipInitialProgress.current) {
      skipInitialProgress.current = false;
      return;
    }

    const getProgress = async () => {
      try {
        const response = await api.get("/teacher/progress", {
          params: {
            grade: filterGrade || undefined,
            major_id: filterMajor || undefined,
            class_number: filterClassNumber || undefined,
          },
        });

        setProgress(response.data);
      } catch (error) {
        console.error("Gagal mengambil progress tugas:", error);
      }
    };

    getProgress();
  }, [filterGrade, filterMajor, filterClassNumber]);

  // Pilihan tingkat berdasarkan data kelas.
  const availableGrades = [
    ...new Set(kelasList.map((kelas) => kelas.grade)),
  ].sort();

  // Pilihan jurusan menyesuaikan tingkat yang dipilih.
  const availableMajors = [
    ...new Map(
      kelasList
        .filter(
          (kelas) =>
            kelas.major_id &&
            kelas.major_name &&
            (!filterGrade || kelas.grade === filterGrade)
        )
        .map((kelas) => [
          String(kelas.major_id),
          {
            id: String(kelas.major_id),
            name: kelas.major_name,
          },
        ])
    ).values(),
  ];

  // Pilihan nomor kelas menyesuaikan tingkat dan jurusan.
  const availableClassNumbers = [
    ...new Set(
      kelasList
        .filter(
          (kelas) =>
            (!filterGrade || kelas.grade === filterGrade) &&
            (!filterMajor ||
              String(kelas.major_id) === filterMajor)
        )
        .map((kelas) => String(kelas.class_number))
    ),
  ].sort((a, b) => Number(a) - Number(b));

  const upcomingExams = [...ujians]
    .filter((item) => {
      const waktu = getExamDateTime(item);

      return Number.isFinite(waktu) && waktu >= new Date().getTime();
    })
    .sort((a, b) => getExamDateTime(a) - getExamDateTime(b))
    .slice(0, 3);

  if (loading) {
    return <DashboardSkeleton variant="teacher" />;
  }

  return (
    <>
      <section className="main-dashboard teacher-dashboard">
        <div className="greeting-card">
          <h2>
            Halo,{" "}
            {user?.gender === "Male"
              ? "Pak"
              : user?.gender === "Female"
                ? "Bu"
                : ""}{" "}
            {user?.name ?? "Guru"}!
          </h2>

          <p>Kelola tugas, ulangan, dan pengumuman di sini.</p>
        </div>

        <div className="stats-grid">
          <div className="stats-card">
            <div className="icon-box" id="clipboard">
              <ClipboardList size={24} color="#2D725C" />
            </div>

            <div>
              <strong>{tugas.length}</strong>
              <small>Total Tugas</small>
            </div>
          </div>

          <div className="stats-card">
            <div className="icon-box" id="checked">
              <Clock3 size={24} color="#C79A2B" />
            </div>

            <div>
              <strong>{ujians.length}</strong>
              <small>Total Ujian</small>
            </div>
          </div>

          <div className="stats-card">
            <div className="icon-box" id="book">
              <BookOpen size={24} color="#82A995" />
            </div>

            <div>
              <strong>{pengumuman.length}</strong>
              <small>Total Pengumuman</small>
            </div>
          </div>
        </div>

        <div className="dashboard-grid">
          <div className="dashboard-panel progress-panel">
            <div className="progress-header">
              <h3>Progress Tugas</h3>

              <div className="progress-filter">
                <div className="dropdown-class">
                  <select
                    value={filterGrade}
                    aria-label="Pilih tingkat"
                    onChange={(event) => {
                      setFilterGrade(event.target.value);
                      setFilterMajor("");
                      setFilterClassNumber("");
                    }}
                  >
                    <option value="">Semua Tingkat</option>

                    {availableGrades.map((grade) => (
                      <option key={grade} value={grade}>
                        {grade}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="dropdown-mayor">
                  <select
                    value={filterMajor}
                    aria-label="Pilih jurusan"
                    onChange={(event) => {
                      setFilterMajor(event.target.value);
                      setFilterClassNumber("");
                    }}
                  >
                    <option value="">Semua Jurusan</option>

                    {availableMajors.map((major) => (
                      <option key={major.id} value={major.id}>
                        {major.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="dropdown-numberClass">
                  <select
                    value={filterClassNumber}
                    aria-label="Pilih nomor kelas"
                    onChange={(event) =>
                      setFilterClassNumber(event.target.value)
                    }
                  >
                    <option value="">Semua Nomor Kelas</option>

                    {availableClassNumbers.map((number) => (
                      <option key={number} value={number}>
                        {number}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="progress-content">
              <div
                className={`progress-ring${
                  progress.total > 0 ? " progress-ring--active" : ""
                }`}
              >
                <strong>{progress.persentase}%</strong>
                <span>Selesai</span>
              </div>

              <div className="progress-copy">
                {progress.total > 0 ? (
                  <>
                    <p>
                      <strong>{progress.selesai}</strong> dari{" "}
                      <strong>{progress.total}</strong> tugas diselesaikan
                      siswa.
                    </p>

                    <div className="progress-bar">
                      <div
                        className="progress-bar-fill"
                        style={{ width: `${progress.persentase}%` }}
                      />
                    </div>

                    <small className="progress-note">
                      {progress.belum} tugas belum diselesaikan
                    </small>
                  </>
                ) : (
                  <>
                    <p>Belum ada data progres tugas siswa.</p>
                    <div className="progress-bar" />
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="dashboard-panel info-panel">
            <div className="card-info-header">
              <h3>Tugas Terbaru</h3>
              <NavLink to="/tugas">Lihat Semua</NavLink>
            </div>

            <div className="card-info-view teacher-recent-tasks">
              {tugas.length === 0
                ? "Belum ada tugas."
                : [...tugas]
                    .sort(
                      (a, b) =>
                        new Date(b.created_at) - new Date(a.created_at),
                    )
                    .slice(0, 3)
                    .map((item) => (
                    <div
                      className="teacher-recent-task"
                      key={item.id}
                    >
                      <span
                        className="teacher-recent-task__icon"
                        aria-hidden="true"
                      >
                        <BookOpen size={17} />
                      </span>

                      <span className="teacher-recent-task__content">
                        <strong>{item.title}</strong>
                        <span>{item.subject?.name ?? "-"}</span>
                      </span>
                    </div>
                  ))}
            </div>
          </div>

          <div className="dashboard-panel info-panel">
            <div className="card-info-header">
              <h3>Tugas Kelompok</h3>
              <NavLink to="/tugas?mode=kelompok">Lihat Semua</NavLink>
            </div>

            <div
              className={`card-info-view ${
                tugasKelompok.length > 0 ? "teacher-recent-tasks" : ""
              }`}
            >
              {tugasKelompok.length === 0
                ? "Belum ada tugas kelompok."
                : [...tugasKelompok]
                    .sort(
                      (a, b) =>
                        new Date(b.created_at) - new Date(a.created_at),
                    )
                    .slice(0, 3)
                    .map((item) => (
                      <NavLink
                        className="teacher-recent-task"
                        to={`/tugas/${item.id}`}
                        key={item.id}
                      >
                        <span
                          className="teacher-recent-task__icon"
                          aria-hidden="true"
                        >
                          <Users size={17} />
                        </span>

                        <span className="teacher-recent-task__content">
                          <strong>{item.title}</strong>
                          <span>
                            {item.subject?.name ?? "-"} ·{" "}
                            {item.kelompok_count ?? 0} kelompok
                          </span>
                        </span>
                      </NavLink>
                    ))}
            </div>
          </div>

          <div className="dashboard-panel info-panel">
            <div className="card-info-header">
              <h3>Ulangan Mendatang</h3>
              <NavLink to="/ujian">Lihat Semua</NavLink>
            </div>

            <div
              className={`card-info-view ${
                upcomingExams.length > 0 ? "teacher-recent-tasks" : ""
              }`}
            >
              {upcomingExams.length === 0
                ? "Belum ada ujian."
                : upcomingExams.map((item) => (
                    <div className="teacher-recent-task" key={item.id}>
                      <span
                        className="teacher-recent-task__icon"
                        aria-hidden="true"
                      >
                        <CalendarDays size={17} />
                      </span>

                      <span className="teacher-recent-task__content">
                        <strong>{item.title}</strong>
                        <span>
                          {item.subject?.name ?? "-"} ·{" "}
                          {formatExamDate(item.exam_date)} ·{" "}
                          {formatExamTime(item.start_time)}
                        </span>
                      </span>
                    </div>
                  ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
