import { iconSquareText } from "../../assets.js";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import DetailForm from "./Form/DetailForm";
import api from "../../api/axios";
import storageUrl from "../../api/storage";
import { toast } from "sonner";
import { placeholder } from "../../assets.js";
import { URUTAN_OPTIONS, bandingkanUrutan, waktuTanggal } from "../../utils/urutan";
import { TaskListSkeleton } from "../Common/Skeleton.jsx";

const getProfilePhoto = (profilePhoto) =>
  profilePhoto ? storageUrl(profilePhoto) : placeholder;

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

const isOverdue = (value) => {
  if (!value) return false;

  const deadline = new Date(value);
  if (Number.isNaN(deadline.getTime())) return false;

  const today = new Date();
  deadline.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  return deadline < today;
};

const MODE_FILTERS = [
  { value: "semua", label: "Semua Tugas" },
  { value: "individu", label: "Tugas Individu" },
  { value: "kelompok", label: "Tugas Kelompok" },
];

export default function TugasStd() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [tugas, setTugas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [selectedTugas, setSelectedTugas] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [sortBy, setSortBy] = useState("terdekat");
  const [modeFilter, setModeFilter] = useState(() => {
    const mode = searchParams.get("mode");
    return ["individu", "kelompok"].includes(mode) ? mode : "semua";
  });

  useEffect(() => {
    const getTugas = async () => {
      try {
        const response = await api.get("/tugas");

        setTugas(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        console.error("Gagal mengambil tugas:", error);
      } finally {
        setLoading(false);
      }
    };

    getTugas();
  }, []);

  useEffect(() => {
    const mode = searchParams.get("mode");

    // eslint-disable-next-line react-hooks/set-state-in-effect -- sinkronisasi filter dari URL
    setModeFilter(["individu", "kelompok"].includes(mode) ? mode : "semua");
  }, [searchParams]);

  const handleDetail = async (id) => {
    try {
      const response = await api.get(`/tugas/${id}`);

      setSelectedTugas(response.data);
      setIsDetailOpen(true);
    } catch (error) {
      console.error("Gagal mengambil detail tugas:", error);
      toast.error("Gagal memuat detail tugas");
    }
  };

  const terapkanStatus = (taskId, status) => {
    setTugas((prev) =>
      prev.map((item) => {
        if (item.id !== taskId) return item;

        // Laravel mengirim relasi dengan nama snake_case.
        const progressLama = Array.isArray(item.progress_tugas)
          ? item.progress_tugas
          : [];

        return {
          ...item,
          progress_tugas: [
            {
              task_id: taskId,
              student_id: progressLama[0]?.student_id,
              ...progressLama[0],
              status,
            },
          ],
        };
      }),
    );
  };

  const handleProgress = async (taskId, checked) => {
    const status = checked ? "selesai" : "belum";

    // Tampilkan status baru langsung di layar (optimistic update).
    terapkanStatus(taskId, status);
    setSavingId(taskId);

    try {
      await api.patch(`/tugas/${taskId}/progress`, { status });

      toast.success(
        checked
          ? "Tugas ditandai selesai"
          : "Status tugas dikembalikan ke belum selesai",
      );

      const response = await api.get("/tugas");
      setTugas(response.data);
    } catch (error) {
      console.error("Gagal mengubah progress:", error);

      toast.error(
        error.response?.data?.message || "Gagal mengubah status tugas",
      );

      // Kembalikan tampilan ke data terbaru dari server.
      try {
        const response = await api.get("/tugas");
        setTugas(response.data);
      } catch (refreshError) {
        console.error("Gagal memuat ulang tugas:", refreshError);
      }
    } finally {
      setSavingId(null);
    }
  };

  const sortedTugas = useMemo(() => {
    const filtered = tugas.filter(
      (item) => modeFilter === "semua" || item.mode === modeFilter,
    );

    // Deadline terdekat lebih dulu (default); tugas tanpa deadline di akhir.
    return [...filtered].sort((a, b) =>
      bandingkanUrutan(a, b, sortBy, (item) => waktuTanggal(item.deadline)),
    );
  }, [tugas, sortBy, modeFilter]);

  if (loading) {
    return <TaskListSkeleton variant="student" />;
  }

  return (
    <main className="main-tugas-box student-task-page">
      <h2 className="student-task-heading">Daftar Tugas</h2>

      {tugas.length > 0 && (
        <div className="student-sort-bar">
          <label htmlFor="student-task-mode">Tampilkan</label>

          <select
            id="student-task-mode"
            value={modeFilter}
            onChange={(event) => setModeFilter(event.target.value)}
          >
            {MODE_FILTERS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <label htmlFor="student-task-sort">Urutkan</label>

          <select
            id="student-task-sort"
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value)}
          >
            {URUTAN_OPTIONS.map((option) => (
              <option key={option.nilai} value={option.nilai}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {tugas.length === 0 ? (
        <div className="tugas-box student-task-empty">
          <div className="tugas-icon">
            <img
              src={iconSquareText}
              alt="Tugas Icon"
              width={100}
              height={100}
            />
          </div>
          <div className="tugas-title">
            <strong>Belum ada tugas.</strong>
            <small>Tugas dari guru akan muncul di sini.</small>
          </div>
        </div>
      ) : sortedTugas.length === 0 ? (
        <div className="tugas-box student-task-empty">
          <div className="tugas-title">
            <strong>Tidak ada tugas pada filter ini.</strong>
            <small>Ubah filter mode atau urutan untuk melihat tugas lain.</small>
          </div>
        </div>
      ) : (
        <div className="student-task-list">
          {sortedTugas.map((item) => {
            const overdue = isOverdue(item.deadline);
            const isGroup = item.mode === "kelompok";
            const group = item.my_group;
            const groupProgress = group?.progress;
            const sudahSelesai =
              item.progress_tugas?.[0]?.status === "selesai";
            const sedangMenyimpan = savingId === item.id;
            const pendingInvitations = item.pending_invitation_count ?? 0;

            return (
              <article
                className={`student-task-card ${
                  isGroup ? "student-task-card--group" : ""
                }`}
                key={item.id}
              >
                <div className="student-task-teacher">
                  <img
                    className="student-task-avatar"
                    src={getProfilePhoto(item.teacher?.profile_photo)}
                    alt={`Foto ${item.teacher?.name || "Guru"}`}
                  />
                  <div className="student-task-teacher-copy">
                    <strong className="student-task-teacher-name">
                      {item.teacher?.name || "Guru"}
                    </strong>
                    <span className="student-task-subject">
                      {item.subject?.name || "Mata pelajaran"}
                    </span>
                  </div>
                </div>

                <div className="student-task-main">
                  <div className="student-task-mode-row">
                    <span
                      className={`task-mode-badge task-mode-badge--${
                        item.mode ?? "individu"
                      }`}
                    >
                      {isGroup ? "Kelompok" : "Individu"}
                    </span>
                    {pendingInvitations > 0 && !group && (
                      <span className="task-mode-badge task-mode-badge--invite">
                        {pendingInvitations} undangan
                      </span>
                    )}
                  </div>
                  <h3 className="student-task-title">{item.title}</h3>
                  {item.description && (
                    <span className="student-task-description">
                      {item.description}
                    </span>
                  )}
                  <div className="student-task-meta">
                    <span
                      className={`student-task-status ${
                        overdue
                          ? "student-task-status--overdue"
                          : "student-task-status--active"
                      }`}
                    >
                      {overdue ? "Terlambat" : "Berlangsung"}
                    </span>
                    <span>Dibuat: {formatDate(item.created_at)}</span>
                    <span>Deadline: {formatDate(item.deadline)}</span>
                  </div>
                </div>

                {isGroup ? (
                  <div className="student-task-group-actions">
                    {group ? (
                      <>
                        <span className="student-task-group-name">
                          {group.name}
                        </span>
                        <span className="student-task-group-meta">
                          {group.jumlah_anggota} anggota
                          {group.status_kelompok === "belum_lengkap"
                            ? " · belum lengkap"
                            : ""}
                        </span>
                        {groupProgress?.total > 0 ? (
                          <>
                            <progress
                              className="task-card-progress"
                              value={groupProgress.selesai}
                              max={groupProgress.total}
                            />
                            <span className="student-task-group-meta">
                              {groupProgress.label} · {groupProgress.selesai}{" "}
                              dari {groupProgress.total} pekerjaan selesai
                            </span>
                          </>
                        ) : (
                          <span className="student-task-group-meta">
                            Belum Ada Pembagian Tugas
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="student-task-group-meta">
                        Kamu belum membentuk atau bergabung ke kelompok untuk
                        tugas ini.
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="student-task-actions">
                    <label className="student-task-check-label">
                      <input
                        className="student-task-checkbox"
                        type="checkbox"
                        checked={sudahSelesai}
                        disabled={sedangMenyimpan}
                        onChange={(e) =>
                          handleProgress(item.id, e.target.checked)
                        }
                        aria-label={`Tandai selesai: ${item.title}`}
                      />
                      {sedangMenyimpan ? "Menyimpan..." : "Tandai Selesai"}
                    </label>
                    <span
                      className={`student-task-status ${
                        sudahSelesai
                          ? "student-task-status--done"
                          : "student-task-status--pending"
                      }`}
                    >
                      {sudahSelesai ? "Selesai" : "Belum Selesai"}
                    </span>
                  </div>
                )}

                <button
                  className="student-task-detail"
                  type="button"
                  onClick={() =>
                    isGroup ? navigate(`/tugas/${item.id}`) : handleDetail(item.id)
                  }
                >
                  {isGroup
                    ? group
                      ? "Buka Kelompok"
                      : "Bentuk / Gabung"
                    : "Detail"}
                </button>
              </article>
            );
          })}
        </div>
      )}

      <DetailForm
        isOpen={isDetailOpen}
        tugas={selectedTugas}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedTugas(null);
        }}
      />
    </main>
  );
}
