import { GraduationCap, Search, Trash2, UserPlus, Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import api from "../../api/axios";
import AkunGuruForm from "./Form/AkunGuruForm";
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

const matchesSearch = (item, keyword) => {
  const search = keyword.trim().toLowerCase();

  if (!search) return true;

  return [item.name, item.email, item.kelas?.name]
    .filter(Boolean)
    .some((value) => value.toLowerCase().includes(search));
};

export default function KelolaAkun() {
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [kelas, setKelas] = useState([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [teacherSearch, setTeacherSearch] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [fetching, setFetching] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [tRes, sRes, kRes] = await Promise.all([
        api.get("/admin/teachers"),
        api.get("/admin/students"),
        api.get("/kelas"),
      ]);

      setTeachers(tRes.data ?? []);
      setStudents(sRes.data ?? []);
      setKelas(kRes.data ?? []);
    } catch (error) {
      console.error(error);
      toast.error("Gagal memuat data akun");
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- ambil data awal saat mount
    fetchData();
  }, [fetchData]);

  const handleDelete = async (account) => {
    if (
      !window.confirm(`Yakin ingin menghapus akun ${account.name}?`)
    ) {
      return;
    }

    try {
      await api.delete(`/admin/user/${account.id}`);
      toast.success("Akun berhasil dihapus");
      fetchData();
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Gagal menghapus akun",
      );
    }
  };

  const filteredTeachers = teachers.filter((teacher) =>
    matchesSearch(teacher, teacherSearch),
  );
  const filteredStudents = students.filter((student) =>
    matchesSearch(student, studentSearch),
  );

  return (
    <main className="admin-page">
      <header className="admin-page-header">
        <div>
          <p className="admin-eyebrow">Manajemen Pengguna</p>
          <h2>Kelola Akun</h2>
          <p className="admin-page-subtitle">
            Buat akun guru baru serta pantau akun guru dan siswa yang terdaftar
            di StudyMate.
          </p>
        </div>

        <div className="admin-page-actions">
          <button
            type="button"
            className="admin-btn admin-btn--primary"
            onClick={() => setIsFormOpen(true)}
          >
            <UserPlus size={18} />
            Tambah Akun Guru
          </button>
        </div>
      </header>

      <section className="admin-card">
        <div className="admin-card-header">
          <div>
            <h3>Daftar Guru</h3>
            <p>
              {fetching ? (
                <Skeleton width={150} height={11} />
              ) : (
                `${teachers.length} akun guru terdaftar`
              )}
            </p>
          </div>

          <div className="admin-toolbar">
            <label className="admin-search" htmlFor="search-guru">
              <Search size={16} />
              <input
                id="search-guru"
                type="search"
                placeholder="Cari guru..."
                value={teacherSearch}
                onChange={(event) => setTeacherSearch(event.target.value)}
              />
            </label>
          </div>
        </div>

        {fetching ? (
          <TableSkeleton columns={4} rows={4} firstCell="user" lastCell="action" />
        ) : filteredTeachers.length > 0 ? (
          <div className="admin-table-wrap">
            <table className="admin-data-table">
              <thead>
                <tr>
                  <th>Nama & Email</th>
                  <th>Wali Kelas</th>
                  <th>Jenis Kelamin</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredTeachers.map((teacher) => (
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
                      {teacher.kelas ? (
                        <span className="admin-badge admin-badge--muted">
                          {teacher.kelas.name}
                        </span>
                      ) : (
                        <span className="admin-muted">-</span>
                      )}
                    </td>
                    <td>
                      {teacher.gender === "Male"
                        ? "Laki-laki"
                        : "Perempuan"}
                    </td>
                    <td>
                      <div className="admin-row-actions">
                        <button
                          type="button"
                          className="admin-icon-btn admin-icon-btn--danger"
                          title={`Hapus ${teacher.name}`}
                          aria-label={`Hapus akun ${teacher.name}`}
                          onClick={() => handleDelete(teacher)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="admin-empty">
            {teacherSearch.trim() ? (
              <Search size={22} />
            ) : (
              <Users size={22} />
            )}
            <p>
              {teacherSearch.trim()
                ? "Tidak ada guru yang cocok dengan pencarian."
                : "Belum ada akun guru terdaftar."}
            </p>
          </div>
        )}
      </section>

      <section className="admin-card">
        <div className="admin-card-header">
          <div>
            <h3>Daftar Siswa</h3>
            <p>
              {fetching ? (
                <Skeleton width={150} height={11} />
              ) : (
                `${students.length} akun siswa terdaftar`
              )}
            </p>
          </div>

          <div className="admin-toolbar">
            <label className="admin-search" htmlFor="search-siswa">
              <Search size={16} />
              <input
                id="search-siswa"
                type="search"
                placeholder="Cari siswa..."
                value={studentSearch}
                onChange={(event) => setStudentSearch(event.target.value)}
              />
            </label>
          </div>
        </div>

        {fetching ? (
          <TableSkeleton columns={4} rows={4} firstCell="user" lastCell="action" />
        ) : filteredStudents.length > 0 ? (
          <div className="admin-table-wrap">
            <table className="admin-data-table">
              <thead>
                <tr>
                  <th>Nama & Email</th>
                  <th>Kelas</th>
                  <th>Jenis Kelamin</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => (
                  <tr key={student.id}>
                    <td>
                      <div className="admin-user-cell">
                        <div className="admin-avatar">
                          {getInitials(student.name)}
                        </div>
                        <div>
                          <strong>{student.name}</strong>
                          <span>{student.email}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      {student.kelas ? (
                        <span className="admin-badge admin-badge--muted">
                          {student.kelas.name}
                        </span>
                      ) : (
                        <span className="admin-muted">-</span>
                      )}
                    </td>
                    <td>
                      {student.gender === "Male"
                        ? "Laki-laki"
                        : "Perempuan"}
                    </td>
                    <td>
                      <div className="admin-row-actions">
                        <button
                          type="button"
                          className="admin-icon-btn admin-icon-btn--danger"
                          title={`Hapus ${student.name}`}
                          aria-label={`Hapus akun ${student.name}`}
                          onClick={() => handleDelete(student)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="admin-empty">
            {studentSearch.trim() ? (
              <Search size={22} />
            ) : (
              <GraduationCap size={22} />
            )}
            <p>
              {studentSearch.trim()
                ? "Tidak ada siswa yang cocok dengan pencarian."
                : "Belum ada akun siswa terdaftar."}
            </p>
          </div>
        )}
      </section>

      <AkunGuruForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={fetchData}
        kelas={kelas}
      />
    </main>
  );
}
