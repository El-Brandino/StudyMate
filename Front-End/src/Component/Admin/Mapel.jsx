import { BookOpen, Plus, Search, Trash2, UserPlus, Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import api from "../../api/axios";
import AssignMapelForm from "./Form/AssignMapelForm";
import MapelForm from "./Form/MapelForm";
import { Skeleton, TableSkeleton } from "../Common/Skeleton.jsx";

const getInitials = (name = "") => {
  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return initials || "?";
};

export default function Mapel() {
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState(null);
  const [fetching, setFetching] = useState(true);
  const [removingTeacherSubject, setRemovingTeacherSubject] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const [sRes, tRes] = await Promise.all([
        api.get("/subjects"),
        api.get("/admin/teachers"),
      ]);

      setSubjects(sRes.data ?? []);
      setTeachers(tRes.data ?? []);
    } catch (error) {
      console.error(error);
      toast.error("Gagal memuat data mapel");
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- ambil data awal saat mount
    fetchData();
  }, [fetchData]);

  const handleDelete = async (subject) => {
    if (
      !window.confirm(`Yakin ingin menghapus mapel ${subject.name}?`)
    ) {
      return;
    }

    try {
      await api.delete(`/admin/subject/${subject.id}`);
      toast.success("Mapel berhasil dihapus");
      fetchData();
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Gagal menghapus mapel",
      );
    }
  };

  const handleRemoveTeacherSubject = async (teacher, subject) => {
    if (
      !window.confirm(
        `Cabut mapel ${subject.name} dari ${teacher.name}? Guru tidak akan bisa membuat tugas/ujian baru untuk mapel ini.`,
      )
    ) {
      return;
    }

    const key = `${teacher.id}-${subject.id}`;
    setRemovingTeacherSubject(key);

    try {
      await api.delete(`/admin/teacher/${teacher.id}/subject/${subject.id}`);
      toast.success(`Mapel ${subject.name} dicabut dari ${teacher.name}`);
      fetchData();
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Gagal mencabut mapel dari guru",
      );
    } finally {
      setRemovingTeacherSubject(null);
    }
  };

  const teachersBySubject = (subjectId) =>
    teachers.filter((teacher) =>
      teacher.subjects?.some((subject) => subject.id === subjectId),
    );

  const keyword = search.trim().toLowerCase();
  const filteredSubjects = subjects.filter((subject) => {
    if (!keyword) return true;

    const teacherNames = teachersBySubject(subject.id)
      .map((teacher) => teacher.name)
      .join(" ");

    return `${subject.name} ${teacherNames}`.toLowerCase().includes(keyword);
  });

  return (
    <main className="admin-page">
      <header className="admin-page-header">
        <div>
          <p className="admin-eyebrow">Kurikulum</p>
          <h2>Mapel</h2>
          <p className="admin-page-subtitle">
            Tambahkan mata pelajaran dan atur guru yang mengampu setiap mapel.
          </p>
        </div>

        <div className="admin-page-actions">
          <button
            type="button"
            className="admin-btn admin-btn--secondary"
            onClick={() => setDialog("assign")}
          >
            <UserPlus size={18} />
            Assign ke Guru
          </button>
          <button
            type="button"
            className="admin-btn admin-btn--primary"
            onClick={() => setDialog("mapel")}
          >
            <Plus size={18} />
            Tambah Mapel
          </button>
        </div>
      </header>

      <section className="admin-card">
        <div className="admin-card-header">
          <div>
            <h3>Daftar Mapel</h3>
            <p>
              {fetching ? (
                <Skeleton width={170} height={11} />
              ) : (
                `${subjects.length} mata pelajaran terdaftar`
              )}
            </p>
          </div>

          <div className="admin-toolbar">
            <label className="admin-search" htmlFor="search-mapel">
              <Search size={16} />
              <input
                id="search-mapel"
                type="search"
                placeholder="Cari mapel atau guru..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
          </div>
        </div>

        {fetching ? (
          <TableSkeleton columns={3} rows={4} firstCell="icon" lastCell="action" />
        ) : filteredSubjects.length > 0 ? (
          <div className="admin-table-wrap">
            <table className="admin-data-table">
              <thead>
                <tr>
                  <th>Mata Pelajaran</th>
                  <th>Guru Pengampu</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubjects.map((subject) => {
                  const pengampu = teachersBySubject(subject.id);

                  return (
                    <tr key={subject.id}>
                      <td>
                        <div className="admin-subject-cell">
                          <span className="admin-subject-icon">
                            <BookOpen size={16} />
                          </span>
                          <strong>{subject.name}</strong>
                        </div>
                      </td>
                      <td>
                        {pengampu.length > 0 ? (
                          <div className="admin-chip-list">
                            {pengampu.map((teacher) => (
                              <span
                                className="admin-chip"
                                key={teacher.id}
                              >
                                {teacher.name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="admin-muted">Belum diassign</span>
                        )}
                      </td>
                      <td>
                        <div className="admin-row-actions">
                          <button
                            type="button"
                            className="admin-icon-btn admin-icon-btn--danger"
                            title={`Hapus mapel ${subject.name}`}
                            aria-label={`Hapus mapel ${subject.name}`}
                            onClick={() => handleDelete(subject)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="admin-empty">
            {keyword ? <Search size={22} /> : <BookOpen size={22} />}
            <p>
              {keyword
                ? "Tidak ada mapel yang cocok dengan pencarian."
                : "Belum ada mata pelajaran terdaftar."}
            </p>
          </div>
        )}
      </section>

      <section className="admin-card">
        <div className="admin-card-header">
          <div>
            <h3>Guru & Mapel yang Diampu</h3>
            <p>
              {fetching ? (
                <Skeleton width={118} height={11} />
              ) : (
                `${teachers.length} guru terdaftar`
              )}
            </p>
          </div>
        </div>

        {fetching ? (
          <TableSkeleton columns={2} rows={4} firstCell="user" lastCell="text" />
        ) : teachers.length > 0 ? (
          <div className="admin-table-wrap">
            <table className="admin-data-table">
              <thead>
                <tr>
                  <th>Guru</th>
                  <th>Mapel yang Diampu</th>
                </tr>
              </thead>
              <tbody>
                {teachers.map((teacher) => (
                  <tr key={teacher.id}>
                    <td>
                      <div className="admin-user-cell">
                        <div className="admin-avatar">
                          {getInitials(teacher.name)}
                        </div>
                        <div>
                          <strong>{teacher.name}</strong>
                          <span>{teacher.email}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      {teacher.subjects?.length > 0 ? (
                        <div className="admin-chip-list">
                          {teacher.subjects.map((subject) => {
                            const key = `${teacher.id}-${subject.id}`;
                            const isRemoving =
                              removingTeacherSubject === key;

                            return (
                              <span className="admin-chip" key={subject.id}>
                                {subject.name}
                                <button
                                  type="button"
                                  className="admin-chip-remove"
                                  title={`Cabut ${subject.name} dari ${teacher.name}`}
                                  aria-label={`Cabut ${subject.name} dari ${teacher.name}`}
                                  onClick={() =>
                                    handleRemoveTeacherSubject(teacher, subject)
                                  }
                                  disabled={isRemoving}
                                >
                                  {isRemoving ? "..." : <Trash2 size={12} />}
                                </button>
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="admin-muted">Belum ada mapel</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="admin-empty">
            <Users size={22} />
            <p>Belum ada akun guru terdaftar.</p>
          </div>
        )}
      </section>

      <MapelForm
        isOpen={dialog === "mapel"}
        onClose={() => setDialog(null)}
        onSuccess={fetchData}
      />
      <AssignMapelForm
        isOpen={dialog === "assign"}
        onClose={() => setDialog(null)}
        onSuccess={fetchData}
        teachers={teachers}
        subjects={subjects}
      />
    </main>
  );
}
