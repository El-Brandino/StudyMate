import {
  Activity,
  ArrowLeft,
  CalendarDays,
  ClipboardList,
  ExternalLink,
  FileText,
  MessageSquare,
  RefreshCw,
  Settings2,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../../../api/axios";
import storageUrl from "../../../api/storage";
import { matchesKelasSelection } from "../../../utils/kelas";
import ClassSelectFields from "../../Common/ClassSelectFields";
import {
  Avatar,
  AvatarStack,
  EmptyState,
  InfoAlert,
  ProgressBlock,
  StatusBadge,
} from "../shared";
import {
  deadlineLabel,
  formatDate,
  formatDateTime,
  getErrorMessage,
  isOverdue,
  kelasLabel,
} from "../utils";
import FeedbackForm from "./FeedbackForm";
import KoreksiForm from "./KoreksiForm";

const matchesStatusFilter = (group, filter) => {
  if (filter === "semua") return true;

  const total = group.progress?.total ?? 0;
  const done = group.progress?.selesai ?? 0;

  if (filter === "belum_ada") return total === 0;
  if (filter === "selesai") return total > 0 && done === total;
  return total === 0 || done < total;
};

export default function TugasKelompokDetailTch() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [classFilter, setClassFilter] = useState({
    grade: "",
    major: "",
    number: "",
  });
  const [statusFilter, setStatusFilter] = useState("semua");
  const [feedbackTarget, setFeedbackTarget] = useState(null);
  const [correctionTarget, setCorrectionTarget] = useState(null);
  const [activeTab, setActiveTab] = useState("informasi");

  const fetchData = useCallback(async () => {
    try {
      const response = await api.get(`/tugas/${id}/pemantauan`);
      setData(response.data);
      setError("");
    } catch (requestError) {
      console.error("Gagal memuat pemantauan tugas kelompok:", requestError);
      setError(
        getErrorMessage(requestError, "Gagal memuat pemantauan tugas kelompok."),
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- memuat data awal halaman
    fetchData();
  }, [fetchData]);

  const groups = useMemo(() => {
    const list = data?.kelompok ?? [];

    return list.filter(
      (group) =>
        matchesKelasSelection(group.kelas, classFilter) &&
        matchesStatusFilter(group, statusFilter),
    );
  }, [data, classFilter, statusFilter]);

  const assignment = data?.tugas;
  const summary = data?.ringkasan;

  const tabs = [
    { id: "informasi", label: "Informasi Tugas", icon: FileText },
    { id: "kelompok", label: "Kelompok", icon: Users },
    { id: "pembagian", label: "Pembagian Tugas", icon: ClipboardList },
    { id: "progres", label: "Progres", icon: Activity },
  ];

  if (loading) {
    return (
      <main className="tk-page">
        <div className="tk-shell">
          <div className="tk-loading">Memuat pemantauan kelompok...</div>
        </div>
      </main>
    );
  }

  if (error || !assignment) {
    return (
      <main className="tk-page">
        <div className="tk-shell">
          <InfoAlert tone="danger">
            {error || "Tugas kelompok tidak ditemukan."}
          </InfoAlert>
          <Link to="/tugas" className="tk-btn tk-btn--secondary">
            <ArrowLeft size={16} /> Kembali ke daftar tugas
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="tk-page">
      <div className="tk-shell">
        <div className="tk-page-actions">
          <Link to="/tugas" className="tk-btn tk-btn--ghost tk-btn--sm">
            <ArrowLeft size={15} />
            Semua Tugas
          </Link>
          <button
            type="button"
            className="tk-btn tk-btn--secondary tk-btn--sm"
            onClick={fetchData}
          >
            <RefreshCw size={14} />
            Muat ulang
          </button>
        </div>

        <header className="tk-detail-banner">
          <div>
            <span className="tk-eyebrow">{assignment.subject?.name}</span>
            <h2>{assignment.title}</h2>
            <p>{assignment.description || "Tidak ada deskripsi tugas."}</p>
            <div className="tk-detail-banner-meta">
              <span className="tk-chip">
                <CalendarDays size={12} />
                Deadline {formatDate(assignment.deadline)}
              </span>
              <span className="tk-chip tk-chip--muted">
                {(assignment.kelas ?? []).map(kelasLabel).join(", ")}
              </span>
              <span className="tk-chip tk-chip--muted">
                {assignment.kelompok_count ?? summary?.total_kelompok ?? 0}{" "}
                kelompok
              </span>
            </div>
          </div>

          <div className="tk-group-progress">
            <ProgressBlock
              progress={{
                total: summary?.total_pekerjaan ?? 0,
                selesai: summary?.pekerjaan_selesai ?? 0,
                persentase:
                  summary?.total_pekerjaan > 0
                    ? Math.round(
                        (summary.pekerjaan_selesai /
                          summary.total_pekerjaan) *
                          100,
                      )
                    : null,
                sudah_ada_pembagian: (summary?.total_pekerjaan ?? 0) > 0,
              }}
            />
          </div>
        </header>

        <nav className="tk-tabs" aria-label="Bagian detail tugas">
          {tabs.map((tab) => {
            const Icon = tab.icon;

            return (
              <button
                key={tab.id}
                type="button"
                className={`tk-tab ${activeTab === tab.id ? "is-active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={15} />
                {tab.label}
              </button>
            );
          })}
        </nav>

        {activeTab === "informasi" && (
          <>
            <InfoAlert>
              Guru memiliki akses baca untuk monitoring. Perubahan hanya
              dilakukan melalui tombol umpan balik atau koreksi eksplisit, dan
              koreksi akan tercatat di riwayat aktivitas.
            </InfoAlert>

        <section className="tk-summary-grid" aria-label="Ringkasan monitoring">
          <div className="tk-summary-card">
            <span>Kelompok</span>
            <strong>{summary?.total_kelompok ?? 0}</strong>
            <small>{summary?.total_anggota ?? 0} anggota terdaftar</small>
          </div>
          <div className="tk-summary-card">
            <span>Pekerjaan</span>
            <strong>{summary?.total_pekerjaan ?? 0}</strong>
            <small>{summary?.pekerjaan_selesai ?? 0} selesai</small>
          </div>
          <div className="tk-summary-card">
            <span>Belum dikerjakan</span>
            <strong>{summary?.belum_dikerjakan ?? 0}</strong>
            <small>pekerjaan belum dimulai</small>
          </div>
          <div className="tk-summary-card">
            <span>Menunggu review</span>
            <strong>{summary?.menunggu_review ?? 0}</strong>
            <small>perlu dicek kelompok</small>
          </div>
          <div className="tk-summary-card">
            <span>Terlambat</span>
            <strong>{summary?.pekerjaan_terlambat ?? 0}</strong>
            <small>{summary?.kelompok_belum_lengkap ?? 0} kelompok belum lengkap</small>
          </div>
        </section>

        <section className="tk-panel">
          <div className="tk-section-head">
            <div>
              <h3>Instruksi Tugas</h3>
              <p>Acuan yang dilihat siswa saat mengerjakan kelompok.</p>
            </div>
          </div>
          <p className="tk-preserve">{assignment.instructions || "Tidak ada instruksi tambahan."}</p>

          {(assignment.documents ?? []).length > 0 && (
            <div className="tk-doc-list" style={{ marginTop: 12 }}>
              {assignment.documents.map((document) => (
                <div className="tk-doc" key={document.id}>
                  <span>
                    <FileText size={14} style={{ verticalAlign: "middle" }} />{" "}
                    {document.file_name}
                  </span>
                  <a
                    href={storageUrl(document.file_path)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Buka
                  </a>
                </div>
              ))}
            </div>
          )}
        </section>
          </>
        )}

        {activeTab !== "informasi" && (
          <>
        <div className="tk-toolbar">
          <div className="tk-section-head" style={{ flex: 1 }}>
            <div>
              <h3>Monitoring Kelompok</h3>
              <p>Lihat anggota, pembagian pekerjaan, status, dan riwayat.</p>
            </div>
          </div>
          <ClassSelectFields
            mode="filter"
            kelas={assignment.kelas ?? []}
            value={classFilter}
            onChange={setClassFilter}
            idPrefix="kelompok-filter"
            className="class-select-fields tk-class-filter"
          />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            aria-label="Filter status kelompok"
          >
            <option value="semua">Semua status</option>
            <option value="belum_ada">Belum ada pembagian</option>
            <option value="berjalan">Sedang berjalan</option>
            <option value="selesai">Semua pekerjaan selesai</option>
          </select>
        </div>

        {groups.length === 0 ? (
          <EmptyState
            title={
              (data.kelompok ?? []).length === 0
                ? "Belum ada kelompok."
                : "Tidak ada kelompok yang cocok dengan filter."
            }
            message={
              (data.kelompok ?? []).length === 0
                ? "Siswa belum membentuk kelompok untuk tugas ini."
                : "Ubah filter kelas atau status untuk melihat kelompok lain."
            }
          />
        ) : (
          <section aria-label="Daftar kelompok">
            {groups.map((group) => {
              const members = (group.anggota ?? [])
                .map((item) => ({ ...item.student, role: item.role }))
                .filter((member) => member.id);
              const pendingInvites = (group.undangan ?? []).filter(
                (invite) => invite.status === "menunggu",
              );
              const works = group.pekerjaan ?? [];
              const feedback = group.umpan_balik ?? [];
              const activities = group.aktivitas ?? [];

              return (
                <article className="tk-group" key={group.id}>
                  <header className="tk-group-head">
                    <div>
                      <div className="tk-group-title">
                        <h3>{group.name}</h3>
                        <span className="tk-chip tk-chip--muted">
                          {kelasLabel(group.kelas)}
                        </span>
                        {group.status_kelompok === "belum_lengkap" ? (
                          <span className="tk-chip tk-chip--warning">
                            Kelompok belum lengkap
                          </span>
                        ) : (
                          <span className="tk-chip">Kelompok lengkap</span>
                        )}
                      </div>
                      <p className="tk-group-subtitle">
                        {members.length} anggota
                        {pendingInvites.length > 0
                          ? ` · ${pendingInvites.length} undangan menunggu`
                          : ""}
                        {" · "}Terakhir diperbarui{" "}
                        {formatDateTime(group.last_updated_at)}
                      </p>

                      {activeTab === "kelompok" && (
                        <>
                          <div
                            className="tk-member-row"
                            style={{ marginTop: 10 }}
                          >
                            {members.map((member) => (
                              <span className="tk-member" key={member.id}>
                                <Avatar person={member} size="sm" />
                                {member.name}
                                {member.role === "ketua" && (
                                  <small>Ketua</small>
                                )}
                              </span>
                            ))}
                            {members.length === 0 && (
                              <span className="tk-toolbar-note">
                                Belum ada anggota.
                              </span>
                            )}
                          </div>

                          {pendingInvites.length > 0 && (
                            <div
                              className="tk-member-row"
                              style={{ marginTop: 10 }}
                            >
                              <span className="tk-toolbar-note">
                                Menunggu jawaban:
                              </span>
                              {pendingInvites.map((invite) => (
                                <span
                                  className="tk-chip tk-chip--warning"
                                  key={invite.id}
                                >
                                  {invite.student?.name ?? "Siswa"}
                                </span>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    <div className="tk-group-progress">
                      <ProgressBlock progress={group.progress} />
                      {activeTab === "progres" && (
                        <div className="tk-work-actions">
                          <button
                            type="button"
                            className="tk-btn tk-btn--soft tk-btn--sm"
                            onClick={() =>
                              setFeedbackTarget({ group, work: null })
                            }
                          >
                            <MessageSquare size={14} />
                            Umpan Balik Kelompok
                          </button>
                        </div>
                      )}
                    </div>
                  </header>

                  {activeTab === "pembagian" && (
                    <>
                  <div className="tk-divider" />

                  <div className="tk-section-head">
                    <div>
                      <h3>Pembagian Pekerjaan</h3>
                      <p>
                        {works.length} pekerjaan ·{" "}
                        {group.progress?.selesai ?? 0} selesai
                      </p>
                    </div>
                    <ClipboardList size={19} aria-hidden="true" />
                  </div>

                  {works.length === 0 ? (
                    <div className="tk-alert" style={{ marginTop: 12 }}>
                      Kelompok ini belum membagi pekerjaan.
                    </div>
                  ) : (
                    <div className="tk-work-list">
                      {works.map((work) => {
                        const overdue = isOverdue(work.deadline, work.status);
                        const pics = work.penanggung_jawab ?? [];

                        return (
                          <div className="tk-work" key={work.id}>
                            <div className="tk-work-head">
                              <div>
                                <div className="tk-work-title">
                                  <h4>{work.title}</h4>
                                  <StatusBadge
                                    status={work.status}
                                    label={work.status_label}
                                  />
                                  {overdue && (
                                    <span className="tk-chip tk-chip--danger">
                                      Terlambat
                                    </span>
                                  )}
                                </div>
                                {work.description && (
                                  <p className="tk-work-description">
                                    {work.description}
                                  </p>
                                )}
                              </div>
                              <AvatarStack people={pics} />
                            </div>

                            <div className="tk-work-meta">
                              <span>
                                PIC:{" "}
                                <strong>
                                  {pics.map((pic) => pic.name).join(", ") || "-"}
                                </strong>
                              </span>
                              <span>
                                Deadline:{" "}
                                <strong>{formatDate(work.deadline)}</strong>
                              </span>
                              {work.deadline && (
                                <span>{deadlineLabel(work.deadline)}</span>
                              )}
                              <span>
                                Diperbarui:{" "}
                                <strong>{formatDateTime(work.updated_at)}</strong>
                              </span>
                            </div>

                            {(work.result_notes || work.result_link) && (
                              <div className="tk-result">
                                {work.result_notes || "Tidak ada catatan hasil."}
                                {work.result_link && (
                                  <>
                                    {" "}
                                    <a
                                      href={work.result_link}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      Buka hasil <ExternalLink size={11} />
                                    </a>
                                  </>
                                )}
                              </div>
                            )}

                            <div className="tk-work-actions">
                              <button
                                type="button"
                                className="tk-btn tk-btn--ghost tk-btn--sm"
                                onClick={() =>
                                  setFeedbackTarget({ group, work })
                                }
                              >
                                <MessageSquare size={13} />
                                Umpan Balik
                              </button>
                              <button
                                type="button"
                                className="tk-btn tk-btn--soft tk-btn--sm"
                                onClick={() =>
                                  setCorrectionTarget({ group, work })
                                }
                              >
                                <Settings2 size={13} />
                                Koreksi
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                    </>
                  )}

                  {activeTab === "progres" && (
                  <div className="tk-two-col" style={{ marginTop: 18 }}>
                    <div className="tk-panel" style={{ padding: 14 }}>
                      <div className="tk-section-head">
                        <div>
                          <h3>Umpan Balik Guru</h3>
                          <p>Catatan untuk kelompok dan pekerjaan.</p>
                        </div>
                        <MessageSquare size={17} />
                      </div>

                      {feedback.length === 0 ? (
                        <p className="tk-group-subtitle">
                          Belum ada umpan balik.
                        </p>
                      ) : (
                        <div className="tk-feedback-list">
                          {feedback.map((item) => (
                            <div className="tk-feedback" key={item.id}>
                              <div className="tk-feedback-head">
                                <strong>
                                  {item.teacher?.name ?? "Guru"}
                                  {item.pekerjaan?.title
                                    ? ` · ${item.pekerjaan.title}`
                                    : " · Kelompok"}
                                </strong>
                                <span>{formatDateTime(item.created_at)}</span>
                              </div>
                              <p>{item.message}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="tk-panel" style={{ padding: 14 }}>
                      <div className="tk-section-head">
                        <div>
                          <h3>Aktivitas Terbaru</h3>
                          <p>Jejak perubahan dan tindakan dalam kelompok.</p>
                        </div>
                        <Users size={17} />
                      </div>

                      {activities.length === 0 ? (
                        <p className="tk-group-subtitle">
                          Belum ada aktivitas.
                        </p>
                      ) : (
                        <div className="tk-activity-list">
                          {activities.slice(0, 12).map((activity) => (
                            <div className="tk-activity-item" key={activity.id}>
                              <span className="tk-activity-dot" />
                              <div className="tk-activity-copy">
                                <strong>{activity.description}</strong>
                                {activity.action === "koreksi_guru" &&
                                  activity.metadata?.reason && (
                                    <span>
                                      Alasan koreksi: {activity.metadata.reason}
                                    </span>
                                  )}
                                <span>
                                  {activity.actor?.name ?? "Sistem"} ·{" "}
                                  {formatDateTime(activity.created_at)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  )}
                </article>
              );
            })}
          </section>
        )}
          </>
        )}
      </div>

      {feedbackTarget && (
        <FeedbackForm
          kelompok={feedbackTarget.group}
          pekerjaan={feedbackTarget.work}
          onClose={() => setFeedbackTarget(null)}
          onSuccess={fetchData}
        />
      )}

      {correctionTarget && (
        <KoreksiForm
          kelompok={correctionTarget.group}
          pekerjaan={correctionTarget.work}
          onClose={() => setCorrectionTarget(null)}
          onSuccess={fetchData}
        />
      )}
    </main>
  );
}
