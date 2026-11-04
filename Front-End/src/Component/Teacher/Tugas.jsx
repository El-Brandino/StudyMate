import { Search, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import TugasForm from "./Form/TugasForm";
import EditForm from "./Form/EditForm";
import DetailForm from "./Form/DetailForm";
import api from "../../api/axios";
import { toast } from "sonner";
import { TaskListSkeleton } from "../Common/Skeleton.jsx";

const MODE_OPTIONS = [
  { value: "semua", label: "Semua Mode" },
  { value: "individu", label: "Individu" },
  { value: "kelompok", label: "Kelompok" },
];

export default function TugasTch() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [tugas, setTugas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  const [selectedTugas, setSelectedTugas] = useState(null);
  const [search, setSearch] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("");
  const [selectedMajor, setSelectedMajor] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("semua");
  const [selectedMode, setSelectedMode] = useState(() => {
    const mode = searchParams.get("mode");
    return ["individu", "kelompok"].includes(mode) ? mode : "semua";
  });
  const [sortBy, setSortBy] = useState("terdekat");
  const [subjects, setSubjects] = useState([]);
  const [kelas, setKelas] = useState([]);
  const [isDetailFormOpen, setIsDetailFormOpen] = useState(false);
  const [progressTugas, setProgressTugas] = useState({});

  const fetchProgress = async (taskId) => {
    try {
      const response = await api.get(`/tugas/${taskId}/progress`);

      setProgressTugas((prev) => ({
        ...prev,
        [taskId]: response.data,
      }));
    } catch (error) {
      console.error("Gagal mengambil progress:", error);
    }
  };

  const fetchTugas = async () => {
    try {
      const response = await api.get("/tugas");
      const items = Array.isArray(response.data) ? response.data : [];

      setTugas(items);
      setProgressTugas({});
      items
        .filter((task) => task.mode === "individu")
        .forEach((task) => fetchProgress(task.id));
    } catch (error) {
      console.error("Gagal mengambil tugas:", error);
      toast.error("Gagal memuat tugas");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    const yakin = window.confirm(
      "Apakah kamu yakin ingin menghapus tugas ini?",
    );

    if (!yakin) return;

    try {
      await api.delete(`/tugas/${id}`);

      toast.success("Tugas berhasil dihapus");

      await fetchTugas();
    } catch (error) {
      console.error("Gagal menghapus tugas:", error);

      toast.error(
        error.response?.data?.message || "Gagal menghapus tugas",
      );
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- ambil data awal saat mount
    fetchTugas();

    api
      .get("/my-subjects")
      .then((response) => {
        const subjectData = response.data;

        setSubjects(
          Array.isArray(subjectData)
            ? subjectData
            : (subjectData?.subjects ?? []),
        );
      })
      .catch((error) => {
        console.error("Gagal mengambil subject:", error);
      });

    api
      .get("/kelas")
      .then((response) => {
        setKelas(response.data);
      })
      .catch((error) => {
        console.error("Gagal mengambil kelas:", error);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hanya dijalankan saat mount
  }, []);

  useEffect(() => {
    const mode = searchParams.get("mode");

    // eslint-disable-next-line react-hooks/set-state-in-effect -- sinkronisasi filter dari URL
    setSelectedMode(["individu", "kelompok"].includes(mode) ? mode : "semua");
  }, [searchParams]);

  const tingkatList = [...new Set(kelas.map((item) => item.grade))];

  // API /kelas mengembalikan major secara flat (major_id & major_name).
  const jurusanList = [
    ...new Map(
      kelas
        .filter((item) => item.major_id && item.major_name)
        .map((item) => [
          item.major_id,
          { id: item.major_id, name: item.major_name },
        ]),
    ).values(),
  ];

  const getTaskStatus = (task) => {
    const now = new Date();
    const deadline = new Date(task.deadline);

    const deadlineDate = new Date(
      deadline.getFullYear(),
      deadline.getMonth(),
      deadline.getDate(),
    );

    const todayDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );

    if (deadlineDate.getTime() === todayDate.getTime()) {
      return "hari ini";
    }

    if (deadlineDate < todayDate) {
      return "lewat";
    }

    return "aktif";
  };

  const filteredTugas = tugas.filter((item) => {
    const keyword = search.toLowerCase();

    const cocokSearch =
      item.title.toLowerCase().includes(keyword) ||
      item.subject?.name?.toLowerCase().includes(keyword) ||
      item.teacher?.name?.toLowerCase().includes(keyword);

    const cocokSubject =
      selectedSubject === "" || String(item.subject_id) === selectedSubject;

    const cocokMode =
      selectedMode === "semua" || item.mode === selectedMode;

    const cocokGrade =
      selectedGrade === "" ||
      item.kelas?.some((kelas) => kelas.grade === selectedGrade);

    const cocokMajor =
      selectedMajor === "" ||
      item.kelas?.some((kelas) => String(kelas.major?.id) === selectedMajor);

    const cocokClass =
      selectedClass === "" ||
      item.kelas?.some((kelas) => String(kelas.class_number) === selectedClass);

    const status = getTaskStatus(item);

    const cocokStatus = selectedStatus === "semua" || status === selectedStatus;

    return (
      cocokSearch &&
      cocokMode &&
      cocokSubject &&
      cocokGrade &&
      cocokMajor &&
      cocokClass &&
      cocokStatus
    );
  });

  const sortedTugas = [...filteredTugas].sort((a, b) => {
    if (sortBy === "terdekat") {
      return new Date(a.deadline) - new Date(b.deadline);
    }

    if (sortBy === "terlama") {
      return new Date(b.deadline) - new Date(a.deadline);
    }

    if (sortBy === "tanggal") {
      return new Date(b.created_at) - new Date(a.created_at);
    }

    if (sortBy === "abjad") {
      return a.title.localeCompare(b.title);
    }

    return 0;
  });

  const classList = [...new Set(kelas.map((item) => item.class_number))].sort(
    (a, b) => a - b,
  );

  const getProgressCount = (task) => {
    if (task.mode === "kelompok") {
      const summary = task.group_summary;

      return {
        group: true,
        selesai: summary?.pekerjaan_selesai ?? 0,
        total: summary?.total_pekerjaan ?? 0,
        persentase: summary?.persentase,
        label: summary?.label ?? "Belum Ada Pembagian Tugas",
        kelompok: summary?.total_kelompok ?? task.kelompok_count ?? 0,
        anggota: summary?.total_anggota ?? 0,
      };
    }

    const progress = progressTugas[task.id] || [];
    const selesai = progress.filter((item) => item.status === "selesai").length;

    return {
      group: false,
      selesai,
      total: progress.length,
      persentase: progress.length
        ? Math.round((selesai / progress.length) * 100)
        : 0,
      label: `${selesai} dari ${progress.length} siswa menyelesaikan`,
    };
  };

  const openDetail = (item) => {
    if (item.mode === "kelompok") {
      navigate(`/tugas/${item.id}`);
      return;
    }

    setSelectedTugas(item);
    setIsDetailFormOpen(true);
  };

  if (loading) {
    return <TaskListSkeleton variant="teacher" />;
  }

  return (
    <>
      <main className="main-tugas-box teacher-tugas">
        <button
          className="add-task-button"
          type="button"
          onClick={() => setIsFormOpen(true)}
        >
          + Tambah Tugas Baru
        </button>
        <section className="task-filter-panel" aria-label="Filter tugas">
          <label className="task-search">
            <Search size={20} aria-hidden="true" />
            <input
              type="search"
              placeholder="Cari tugas..."
              aria-label="Cari tugas"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <select
            value={selectedMode}
            onChange={(event) => setSelectedMode(event.target.value)}
            aria-label="Pilih mode tugas"
          >
            {MODE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            value={selectedSubject}
            onChange={(event) => setSelectedSubject(event.target.value)}
            aria-label="Pilih mata pelajaran"
          >
            <option value="">Semua Mapel</option>

            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
          <select
            value={selectedGrade}
            onChange={(event) => setSelectedGrade(event.target.value)}
            aria-label="Pilih tingkat"
          >
            <option value="">Semua Tingkat</option>

            {tingkatList.map((tingkat) => (
              <option key={tingkat} value={tingkat}>
                {tingkat}
              </option>
            ))}
          </select>
          <select
            value={selectedMajor}
            onChange={(event) => setSelectedMajor(event.target.value)}
            aria-label="Pilih jurusan"
          >
            <option value="">Semua Jurusan</option>

            {jurusanList.map((jurusan) => (
              <option key={jurusan.id} value={jurusan.id}>
                {jurusan.name}
              </option>
            ))}
          </select>
          <select
            value={selectedClass}
            onChange={(event) => setSelectedClass(event.target.value)}
            aria-label="Pilih kelas"
          >
            <option value="">Semua Kelas</option>

            {classList.map((nomor) => (
              <option key={nomor} value={nomor}>
                {nomor}
              </option>
            ))}
          </select>
          <select
            value={selectedStatus}
            onChange={(event) => setSelectedStatus(event.target.value)}
            aria-label="Pilih Status"
          >
            <option value="semua">Semua Status</option>
            <option value="aktif">Aktif</option>
            <option value="selesai">Selesai</option>
            <option value="lewat">Lewat</option>
            <option value="hari ini">Hari ini</option>
          </select>
          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value)}
            aria-label="Pilih urutan"
          >
            <option value="terdekat">Deadline Terdekat</option>
            <option value="terlama">Deadline Terlama</option>
            <option value="tanggal">Tanggal Dibuat</option>
            <option value="abjad">Abjad</option>
          </select>
        </section>
        {filteredTugas.length === 0 ? (
          <section className="task-empty-state">
            <strong>
              {tugas.length === 0
                ? "Belum ada tugas."
                : "Tugas tidak ditemukan."}
            </strong>

            <p>
              {tugas.length === 0
                ? 'Klik "Tambah Tugas Baru" untuk membuat tugas.'
                : "Coba ubah kata pencarian atau filter."}
            </p>
          </section>
        ) : (
          <section className="task-list">
            {sortedTugas.map((item) => {
              const progress = getProgressCount(item);
              const status = getTaskStatus(item);

              return (
                <article
                  className={`task-card ${
                    item.mode === "kelompok" ? "task-card--group" : ""
                  }`}
                  key={item.id}
                >
                  <div className="task-card-main">
                    <div className="task-card-mode-row">
                      <span
                        className={`task-mode-badge task-mode-badge--${
                          item.mode ?? "individu"
                        }`}
                      >
                        {item.mode === "kelompok" ? (
                          <>
                            <Users size={12} /> Kelompok
                          </>
                        ) : (
                          "Individu"
                        )}
                      </span>
                      {item.mode === "kelompok" && (
                        <span className="task-card-group-count">
                          {progress.kelompok} kelompok · {progress.anggota}{" "}
                          anggota
                        </span>
                      )}
                    </div>
                    <p className="task-card-category">
                      {item.subject?.name ?? "-"}
                    </p>
                    <h3>{item.title}</h3>
                    <p className="task-card-teacher">
                      {item.teacher?.name ?? "-"}
                    </p>
                  </div>

                  <div className="task-card-meta">
                    <div className="task-card-meta-item">
                      <span className="task-card-label">KELAS</span>
                      <strong>
                        {(item.kelas ?? [])
                          .map(
                            (kelas) =>
                              `${kelas.grade} ${kelas.major?.name ?? "-"} ${kelas.class_number}`,
                          )
                          .join(", ")}
                      </strong>
                    </div>

                    <div className="task-card-meta-item">
                      <span className="task-card-label">DEADLINE</span>
                      <strong>
                        {new Date(item.deadline).toLocaleDateString("id-ID", {
                          month: "long",
                          year: "numeric",
                          day: "numeric",
                        })}
                      </strong>
                    </div>
                  </div>

                  <div className="task-card-side">
                    <span
                      className={`task-card-status task-card-status--${status.replace(
                        " ",
                        "-",
                      )}`}
                    >
                      {status}
                    </span>
                    {progress.total > 0 ? (
                      <>
                        <progress
                          className="task-card-progress"
                          value={progress.selesai}
                          max={progress.total}
                        />
                        <p>
                          {progress.group
                            ? `${progress.selesai} dari ${progress.total} pekerjaan selesai`
                            : progress.label}
                        </p>
                      </>
                    ) : (
                      <p className="task-card-progress-empty">
                        {progress.group
                          ? progress.label
                          : "Belum ada siswa"}
                      </p>
                    )}

                    <div className="task-card-actions">
                      <button
                        type="button"
                        className="task-card-action task-card-action--primary"
                        onClick={() => openDetail(item)}
                      >
                        {item.mode === "kelompok" ? "Monitor" : "Detail"}
                      </button>
                      <button
                        type="button"
                        className="task-card-action task-card-action--ghost"
                        onClick={() => {
                          setSelectedTugas(item);
                          setIsEditFormOpen(true);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className="task-card-action task-card-action--danger"
                        type="button"
                        onClick={() => handleDelete(item.id)}
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </main>

      <TugasForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={fetchTugas}
      />

      <EditForm
        isOpen={isEditFormOpen}
        tugas={selectedTugas}
        onClose={() => {
          setIsEditFormOpen(false);
          setSelectedTugas(null);
        }}
        onSuccess={fetchTugas}
      />

      <DetailForm
        isOpen={isDetailFormOpen}
        tugas={selectedTugas}
        onClose={() => {
          setIsDetailFormOpen(false);
          setSelectedTugas(null);
        }}
      />
    </>
  );
}
