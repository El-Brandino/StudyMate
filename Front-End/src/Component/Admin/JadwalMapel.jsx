import { CalendarDays, Clock, Pencil, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import api from "../../api/axios";
import { matchesKelasSelection } from "../../utils/kelas";
import ClassSelectFields from "../Common/ClassSelectFields";
import JadwalForm from "./Form/JadwalForm";
import { AdminScheduleSkeleton } from "../Common/Skeleton.jsx";

const HARI = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];

const toTime = (value) => String(value ?? "").slice(0, 5);

export default function JadwalMapel() {
  const [jadwal, setJadwal] = useState([]);
  const [kelas, setKelas] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [filterClass, setFilterClass] = useState({
    grade: "",
    major: "",
    number: "",
  });
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [fetching, setFetching] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [jRes, kRes, sRes, tRes] = await Promise.all([
        api.get("/admin/jadwal"),
        api.get("/kelas"),
        api.get("/subjects"),
        api.get("/admin/teachers"),
      ]);

      setJadwal(jRes.data ?? []);
      setKelas(kRes.data ?? []);
      setSubjects(sRes.data ?? []);
      setTeachers(tRes.data ?? []);
    } catch (error) {
      console.error(error);
      toast.error("Gagal memuat data jadwal");
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- ambil data awal saat mount
    fetchData();
  }, [fetchData]);

  const openCreate = () => {
    setEditingItem(null);
    setIsFormOpen(true);
  };

  const openEdit = (item) => {
    setEditingItem(item);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingItem(null);
  };

  const handleDelete = async (item) => {
    if (
      !window.confirm(
        `Yakin ingin menghapus jadwal ${item.subject?.name} untuk ${item.kelas?.name}?`,
      )
    ) {
      return;
    }

    try {
      await api.delete(`/admin/jadwal/${item.id}`);
      toast.success("Jadwal berhasil dihapus");
      fetchData();
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Gagal menghapus jadwal",
      );
    }
  };

  const filteredJadwal = jadwal.filter((item) =>
    matchesKelasSelection(item.kelas, filterClass),
  );

  const hasClassFilter = Boolean(
    filterClass.grade || filterClass.major || filterClass.number,
  );

  const grouped = filteredJadwal.reduce((acc, item) => {
    if (!acc[item.hari]) acc[item.hari] = [];
    acc[item.hari].push(item);
    return acc;
  }, {});

  const visibleDays = HARI.filter(
    (hari) => (grouped[hari] ?? []).length > 0,
  );

  return (
    <main className="admin-page">
      <header className="admin-page-header">
        <div>
          <p className="admin-eyebrow">Akademik</p>
          <h2>Jadwal Mapel</h2>
          <p className="admin-page-subtitle">
            Atur jadwal pelajaran per kelas, lengkap dengan guru pengampu dan
            waktu pelaksanaan.
          </p>
        </div>

        <div className="admin-page-actions">
          <ClassSelectFields
            mode="filter"
            kelas={kelas}
            value={filterClass}
            onChange={setFilterClass}
            idPrefix="jadwal-filter"
            className="class-select-fields admin-class-filter"
            selectClassName="admin-select"
          />

          <button
            type="button"
            className="admin-btn admin-btn--primary"
            onClick={openCreate}
          >
            <Plus size={18} />
            Tambah Jadwal
          </button>
        </div>
      </header>

      {fetching ? (
        <AdminScheduleSkeleton days={3} rows={2} />
      ) : visibleDays.length > 0 ? (
        visibleDays.map((hari) => {
          const items = [...grouped[hari]].sort(
            (a, b) =>
              String(a.jam_mulai).localeCompare(String(b.jam_mulai)) ||
              (a.urutan ?? 0) - (b.urutan ?? 0),
          );

          return (
            <section className="admin-card admin-schedule-card" key={hari}>
              <div className="admin-card-header">
                <div>
                  <h3>{hari}</h3>
                  <p>{items.length} jadwal pelajaran</p>
                </div>
              </div>

              <div className="admin-schedule-list">
                {items.map((item) => (
                  <article className="admin-schedule-item" key={item.id}>
                    <div className="admin-schedule-time">
                      <Clock size={15} />
                      {toTime(item.jam_mulai)}
                      <span>- {toTime(item.jam_selesai)}</span>
                    </div>

                    <div className="admin-schedule-main">
                      <strong>{item.subject?.name}</strong>
                      <span>
                        {item.kelas?.name} • {item.teacher?.name}
                      </span>
                    </div>

                    <span className="admin-badge admin-badge--muted admin-schedule-meta">
                      {item.urutan ? `Urutan ${item.urutan}` : "Tanpa urutan"}
                    </span>

                    <div className="admin-row-actions">
                      <button
                        type="button"
                        className="admin-icon-btn"
                        title="Edit jadwal"
                        aria-label={`Edit jadwal ${item.subject?.name}`}
                        onClick={() => openEdit(item)}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        className="admin-icon-btn admin-icon-btn--danger"
                        title="Hapus jadwal"
                        aria-label={`Hapus jadwal ${item.subject?.name}`}
                        onClick={() => handleDelete(item)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          );
        })
      ) : (
        <section className="admin-card">
          <div className="admin-empty">
            <CalendarDays size={24} />
            <p>
              {hasClassFilter
                ? "Belum ada jadwal untuk kelas yang dipilih."
                : "Belum ada jadwal mapel. Tambahkan jadwal pertama."}
            </p>
          </div>
        </section>
      )}

      {isFormOpen ? (
        <JadwalForm
          key={editingItem?.id ?? "jadwal-baru"}
          isOpen
          onClose={closeForm}
          onSuccess={fetchData}
          kelas={kelas}
          subjects={subjects}
          teachers={teachers}
          editingItem={editingItem}
        />
      ) : null}
    </main>
  );
}
