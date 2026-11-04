import { useEffect, useState } from "react";
import api from "../../api/axios";
import { LegacyScheduleSkeleton } from "../Common/Skeleton.jsx";

const HARI = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];

export default function JadwalMapelGuru() {
  const [jadwal, setJadwal] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get("/jadwal-mapel");
        setJadwal(res.data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const grouped = jadwal.reduce((acc, item) => {
    const key = item.hari;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  if (loading) {
    return (
      <LegacyScheduleSkeleton title="Jadwal Mengajar" columns={3} days={3} />
    );
  }

  return (
    <main className="main-content">
      <section className="table-section">
        <h2>Jadwal Mengajar</h2>
        {HARI.map((hari) => (
          <div key={hari} className="jadwal-group">
            <h3>{hari}</h3>
            <div className="table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Jam</th>
                    <th>Mapel</th>
                    <th>Kelas</th>
                  </tr>
                </thead>
                <tbody>
                  {(grouped[hari] || []).map((j) => (
                    <tr key={j.id}>
                      <td>
                        {j.jam_mulai} - {j.jam_selesai}
                      </td>
                      <td>{j.subject?.name}</td>
                      <td>{j.kelas?.name}</td>
                    </tr>
                  ))}
                  {(grouped[hari] || []).length === 0 && (
                    <tr>
                      <td colSpan="3" className="empty">
                        Tidak ada jadwal mengajar
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
