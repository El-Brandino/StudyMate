import {
  Activity,
  ArrowLeft,
  CalendarDays,
  ClipboardList,
  ExternalLink,
  FileText,
  MessageSquare,
  Pencil,
  Plus,
  RefreshCw,
  Send,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import api from "../../../api/axios";
import storageUrl from "../../../api/storage";
import {
  Avatar,
  AvatarStack,
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
import PekerjaanForm from "./PekerjaanForm";

const getStoredUserId = () => {
  try {
    return JSON.parse(localStorage.getItem("user"))?.id ?? null;
  } catch {
    return null;
  }
};

export default function TugasKelompokDetailStd() {
  const { id } = useParams();
  const [assignment, setAssignment] = useState(null);
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [groupName, setGroupName] = useState("");
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [createError, setCreateError] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [availableStudents, setAvailableStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [inviteError, setInviteError] = useState("");
  const [inviting, setInviting] = useState(false);
  const [workFormOpen, setWorkFormOpen] = useState(false);
  const [editingWork, setEditingWork] = useState(null);
  const [processingInvitation, setProcessingInvitation] = useState(null);
  const [processingStatus, setProcessingStatus] = useState(null);
  const [currentUserId] = useState(getStoredUserId);
  const [activeTab, setActiveTab] = useState("informasi");

  const loadGroup = async (groupId) => {
    const response = await api.get(`/kelompok-tugas/${groupId}`);
    setGroup(response.data);
    return response.data;
  };

  const loadPage = async () => {
    try {
      const response = await api.get(`/tugas/${id}`);
      setAssignment(response.data);

      if (response.data.my_group?.id) {
        await loadGroup(response.data.my_group.id);
      } else {
        setGroup(null);
      }

      setError("");
    } catch (requestError) {
      console.error("Gagal memuat tugas kelompok:", requestError);
      setError(
        getErrorMessage(requestError, "Gagal memuat detail tugas kelompok."),
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- memuat data awal halaman
    loadPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cukup saat id berubah
  }, [id]);

  const refreshGroup = async () => {
    if (!group?.id) return;

    try {
      await loadGroup(group.id);
    } catch (requestError) {
      console.error("Gagal memuat ulang kelompok:", requestError);
      toast.error(getErrorMessage(requestError, "Gagal memuat ulang kelompok."));
    }
  };

  const handleCreateGroup = async (event) => {
    event.preventDefault();
    setCreateError("");
    setCreatingGroup(true);

    try {
      const response = await api.post(`/tugas/${id}/kelompok`, {
        name: groupName,
      });

      setGroup(response.data.kelompok);
      toast.success("Kelompok berhasil dibuat.");
      setGroupName("");
      await loadPage();
    } catch (requestError) {
      console.error("Gagal membuat kelompok:", requestError);
      setCreateError(
        getErrorMessage(requestError, "Gagal membuat kelompok."),
      );
    } finally {
      setCreatingGroup(false);
    }
  };

  const respondAssignmentInvitation = async (invitation, status) => {
    setProcessingInvitation(invitation.id);

    try {
      await api.patch(`/undangan-kelompok/${invitation.id}`, { status });
      toast.success(
        status === "diterima"
          ? "Undangan diterima. Kamu bergabung ke kelompok."
          : "Undangan ditolak.",
      );
      await loadPage();
    } catch (requestError) {
      console.error("Gagal menjawab undangan:", requestError);
      toast.error(getErrorMessage(requestError, "Gagal menjawab undangan."));
    } finally {
      setProcessingInvitation(null);
    }
  };

  const openInvitePanel = async () => {
    if (!group) return;

    setInviteOpen(true);
    setInviteError("");
    setSelectedStudentIds([]);

    if (availableStudents.length > 0) return;

    setLoadingStudents(true);

    try {
      const response = await api.get(
        `/kelompok-tugas/${group.id}/siswa-tersedia`,
      );
      setAvailableStudents(
        Array.isArray(response.data) ? response.data : [],
      );
    } catch (requestError) {
      console.error("Gagal memuat siswa:", requestError);
      setInviteError(
        getErrorMessage(requestError, "Gagal memuat daftar siswa."),
      );
    } finally {
      setLoadingStudents(false);
    }
  };

  const toggleStudent = (studentId) => {
    setSelectedStudentIds((current) =>
      current.includes(studentId)
        ? current.filter((id) => id !== studentId)
        : [...current, studentId],
    );
  };

  const submitInvitations = async (event) => {
    event.preventDefault();
    setInviteError("");

    if (selectedStudentIds.length === 0) {
      setInviteError("Pilih minimal satu siswa.");
      return;
    }

    setInviting(true);

    try {
      await api.post(`/kelompok-tugas/${group.id}/undangan`, {
        student_ids: selectedStudentIds,
      });
      toast.success("Undangan berhasil dikirim.");
      setInviteOpen(false);
      setSelectedStudentIds([]);
      setAvailableStudents([]);
      await refreshGroup();
    } catch (requestError) {
      console.error("Gagal mengirim undangan:", requestError);
      setInviteError(
        getErrorMessage(requestError, "Gagal mengirim undangan."),
      );
    } finally {
      setInviting(false);
    }
  };

  const cancelInvitation = async (invitationId) => {
    const confirmed = window.confirm("Batalkan undangan ini?");
    if (!confirmed) return;

    try {
      await api.delete(
        `/kelompok-tugas/${group.id}/undangan/${invitationId}`,
      );
      toast.success("Undangan dibatalkan.");
      setAvailableStudents([]);
      await refreshGroup();
    } catch (requestError) {
      console.error("Gagal membatalkan undangan:", requestError);
      toast.error(
        getErrorMessage(requestError, "Gagal membatalkan undangan."),
      );
    }
  };

  const updateWorkStatus = async (work, status) => {
    setProcessingStatus(work.id);

    try {
      await api.patch(
        `/kelompok-tugas/${group.id}/pekerjaan/${work.id}/status`,
        { status },
      );
      toast.success("Status pekerjaan diperbarui.");
      await refreshGroup();
    } catch (requestError) {
      console.error("Gagal mengubah status pekerjaan:", requestError);
      toast.error(
        getErrorMessage(requestError, "Gagal mengubah status pekerjaan."),
      );
    } finally {
      setProcessingStatus(null);
    }
  };

  const deleteWork = async (work) => {
    const confirmed = window.confirm(
      `Hapus pekerjaan "${work.title}"? Riwayat aktivitasnya tetap tersimpan.`,
    );
    if (!confirmed) return;

    try {
      await api.delete(`/kelompok-tugas/${group.id}/pekerjaan/${work.id}`);
      toast.success("Pekerjaan berhasil dihapus.");
      await refreshGroup();
    } catch (requestError) {
      console.error("Gagal menghapus pekerjaan:", requestError);
      toast.error(getErrorMessage(requestError, "Gagal menghapus pekerjaan."));
    }
  };

  if (loading) {
    return (
      <main className="tk-page">
        <div className="tk-shell">
          <div className="tk-loading">Memuat tugas kelompok...</div>
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

  if (assignment.mode !== "kelompok") {
    return (
      <main className="tk-page">
        <div className="tk-shell">
          <InfoAlert tone="danger">
            Tugas ini adalah tugas individu. Buka detailnya dari daftar tugas.
          </InfoAlert>
          <Link to="/tugas" className="tk-btn tk-btn--secondary">
            <ArrowLeft size={16} /> Kembali ke daftar tugas
          </Link>
        </div>
      </main>
    );
  }

  const pendingInvitations = assignment.undangan_saya ?? [];
  const members = (group?.anggota ?? [])
    .map((item) => ({ ...item.student, role: item.role }))
    .filter((member) => member.id);
  const pendingGroupInvites = (group?.undangan ?? []).filter(
    (invitation) => invitation.status === "menunggu",
  );
  const works = group?.pekerjaan ?? [];
  const feedback = group?.umpan_balik ?? [];
  const activities = group?.aktivitas ?? [];
  const maxReached =
    assignment.max_members &&
    group &&
    group.jumlah_anggota + pendingGroupInvites.length >= assignment.max_members;

  const tabs = [
    { id: "informasi", label: "Informasi Tugas", icon: FileText },
    { id: "kelompok", label: "Kelompok", icon: Users },
    { id: "pembagian", label: "Pembagian Tugas", icon: ClipboardList },
    { id: "progres", label: "Progres", icon: Activity },
  ];

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
            onClick={loadPage}
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
                {assignment.teacher?.name ?? "Guru"}
              </span>
              <span className="tk-chip tk-chip--muted">
                {(assignment.kelas ?? []).map(kelasLabel).join(", ")}
              </span>
            </div>
          </div>

          {group && (
            <div className="tk-group-progress">
              <ProgressBlock progress={group.progress} />
            </div>
          )}
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
                {tab.id === "kelompok" &&
                  !group &&
                  pendingInvitations.length > 0 && (
                    <span className="tk-tab-badge">
                      {pendingInvitations.length}
                    </span>
                  )}
              </button>
            );
          })}
        </nav>

        {activeTab === "informasi" && (
        <section className="tk-panel">
          <div className="tk-section-head">
            <div>
              <h3>Instruksi Tugas</h3>
              <p>Baca instruksi sebelum membagi pekerjaan kelompok.</p>
            </div>
          </div>
          <p className="tk-preserve">
            {assignment.instructions || "Tidak ada instruksi tambahan."}
          </p>

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

          <div className="tk-summary-grid" style={{ marginTop: 16 }}>
            <div className="tk-summary-card">
              <span>Deadline</span>
              <strong style={{ fontSize: "0.95rem" }}>
                {formatDate(assignment.deadline)}
              </strong>
              <small>{deadlineLabel(assignment.deadline)}</small>
            </div>
            <div className="tk-summary-card">
              <span>Target anggota</span>
              <strong style={{ fontSize: "0.95rem" }}>
                {assignment.min_members || assignment.max_members
                  ? `${assignment.min_members ?? "?"} - ${
                      assignment.max_members ?? "?"
                    }`
                  : "Bebas"}
              </strong>
              <small>
                {assignment.min_members
                  ? "Minimal anggota"
                  : "Tanpa batas minimal"}
              </small>
            </div>
            <div className="tk-summary-card">
              <span>Kelas</span>
              <strong style={{ fontSize: "0.95rem" }}>
                {(assignment.kelas ?? []).map(kelasLabel).join(", ") || "-"}
              </strong>
              <small>Kelas yang mengerjakan tugas</small>
            </div>
          </div>
        </section>
        )}

        {!group && activeTab === "kelompok" && pendingInvitations.length > 0 && (
          <section className="tk-invitation-panel">
            <div className="tk-section-head">
              <div>
                <h3>Undangan untuk Tugas Ini</h3>
                <p>Kamu diundang ke kelompok berikut.</p>
              </div>
            </div>
            <div className="tk-invitation-list">
              {pendingInvitations.map((invitation) => (
                <div className="tk-invitation" key={invitation.id}>
                  <div>
                    <strong>{invitation.kelompok?.name ?? "Kelompok"}</strong>
                    <p>
                      Diundang oleh {invitation.pengundang?.name ?? "teman"} ·{" "}
                      {invitation.kelompok?.pembuat?.name
                        ? `Ketua: ${invitation.kelompok.pembuat.name}`
                        : "Kelompok siswa"}
                    </p>
                  </div>
                  <div className="tk-invitation-actions">
                    <button
                      type="button"
                      className="tk-btn tk-btn--secondary tk-btn--sm"
                      onClick={() =>
                        respondAssignmentInvitation(invitation, "ditolak")
                      }
                      disabled={processingInvitation === invitation.id}
                    >
                      Tolak
                    </button>
                    <button
                      type="button"
                      className="tk-btn tk-btn--primary tk-btn--sm"
                      onClick={() =>
                        respondAssignmentInvitation(invitation, "diterima")
                      }
                      disabled={processingInvitation === invitation.id}
                    >
                      {processingInvitation === invitation.id
                        ? "Memproses..."
                        : "Terima Undangan"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {!group ? (
          activeTab === "kelompok" ? (
          <section className="tk-panel">
            <div className="tk-section-head">
              <div>
                <h3>Bentuk Kelompok</h3>
                <p>
                  Buat kelompok baru, lalu undang teman sekelas. Kamu hanya
                  boleh berada di satu kelompok untuk tugas ini.
                </p>
              </div>
              <Users size={22} aria-hidden="true" />
            </div>

            {createError && (
              <InfoAlert tone="danger">{createError}</InfoAlert>
            )}

            <form
              className="tk-form"
              onSubmit={handleCreateGroup}
              style={{ marginTop: 14 }}
            >
              <div className="tk-field">
                <label htmlFor="tk-group-name">Nama kelompok</label>
                <input
                  id="tk-group-name"
                  type="text"
                  value={groupName}
                  onChange={(event) => setGroupName(event.target.value)}
                  placeholder="Contoh: Kelompok Alpha"
                  maxLength={80}
                  required
                />
                <small>
                  {assignment.min_members || assignment.max_members
                    ? `Target anggota: ${assignment.min_members ?? "?"} - ${
                        assignment.max_members ?? "?"
                      } orang.`
                    : "Jumlah anggota tidak dibatasi."}
                </small>
              </div>
              <div className="tk-form-actions">
                <button
                  type="submit"
                  className="tk-btn tk-btn--primary"
                  disabled={creatingGroup || !groupName.trim()}
                >
                  <Plus size={16} />
                  {creatingGroup ? "Membuat..." : "Buat Kelompok"}
                </button>
              </div>
            </form>
          </section>
          ) : activeTab !== "informasi" ? (
            <section className="tk-panel">
              <div className="tk-empty">
                <strong>Belum Ada Kelompok</strong>
                <p>
                  Bentuk atau gabung ke kelompok terlebih dahulu melalui tab
                  Kelompok.
                </p>
                <button
                  type="button"
                  className="tk-btn tk-btn--soft"
                  onClick={() => setActiveTab("kelompok")}
                >
                  <Users size={15} />
                  Ke Tab Kelompok
                </button>
              </div>
            </section>
          ) : null
        ) : (
          <>
            {activeTab !== "informasi" && (
            <section className="tk-panel">
              <div className="tk-group-head">
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
                    {group.jumlah_anggota} anggota
                    {assignment.min_members
                      ? ` · minimal ${assignment.min_members}`
                      : ""}
                    {assignment.max_members
                      ? ` · maksimal ${assignment.max_members}`
                      : ""}
                  </p>
                </div>

                <div className="tk-group-progress">
                  <ProgressBlock progress={group.progress} />
                </div>
              </div>

              {group.status_kelompok === "belum_lengkap" && (
                <div style={{ marginTop: 12 }}>
                  <InfoAlert tone="warning">
                    Kelompok belum memenuhi jumlah anggota minimal. Kelompok
                    tetap bisa membagi pekerjaan, tetapi sebaiknya undang
                    anggota lagi.
                  </InfoAlert>
                </div>
              )}
            </section>
            )}

            <div
              className={`tk-two-col ${
                activeTab === "pembagian" || activeTab === "progres"
                  ? ""
                  : "tk-two-col--single"
              }`}
            >
              <div className="tk-stack">
                {activeTab === "pembagian" && (
                <section className="tk-panel">
                  <div className="tk-section-head">
                    <div>
                      <h3>Pembagian Pekerjaan</h3>
                      <p>
                        Bagi pekerjaan secara mandiri. Beberapa anggota bisa
                        menjadi PIC untuk pekerjaan yang sama.
                      </p>
                    </div>
                    {group.permissions?.can_create_work && (
                      <button
                        type="button"
                        className="tk-btn tk-btn--primary tk-btn--sm"
                        onClick={() => {
                          setEditingWork(null);
                          setWorkFormOpen(true);
                        }}
                      >
                        <Plus size={14} />
                        Tambah Pekerjaan
                      </button>
                    )}
                  </div>

                  {works.length === 0 ? (
                    <div className="tk-empty" style={{ marginTop: 14 }}>
                      <strong>Belum Ada Pembagian Tugas</strong>
                      <p>
                        Tambahkan pekerjaan pertama, lalu tentukan siapa saja
                        penanggung jawabnya.
                      </p>
                      {group.permissions?.can_create_work && (
                        <button
                          type="button"
                          className="tk-btn tk-btn--soft"
                          onClick={() => {
                            setEditingWork(null);
                            setWorkFormOpen(true);
                          }}
                        >
                          <Plus size={15} />
                          Tambah Pekerjaan
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="tk-work-list">
                      {works.map((work) => {
                        const pics = work.penanggung_jawab ?? [];
                        const overdue = isOverdue(work.deadline, work.status);
                        const permissions = work.permissions ?? {};
                        const isProcessing = processingStatus === work.id;

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
                                Update:{" "}
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
                              {work.status === "belum_dikerjakan" &&
                                permissions.can_update_status && (
                                  <button
                                    type="button"
                                    className="tk-btn tk-btn--primary tk-btn--sm"
                                    onClick={() =>
                                      updateWorkStatus(
                                        work,
                                        "sedang_dikerjakan",
                                      )
                                    }
                                    disabled={isProcessing}
                                  >
                                    Mulai Kerjakan
                                  </button>
                                )}

                              {work.status === "sedang_dikerjakan" &&
                                permissions.can_update_status && (
                                  <button
                                    type="button"
                                    className="tk-btn tk-btn--primary tk-btn--sm"
                                    onClick={() =>
                                      updateWorkStatus(work, "menunggu_review")
                                    }
                                    disabled={isProcessing}
                                  >
                                    <Send size={13} />
                                    Ajukan Review
                                  </button>
                                )}

                              {work.status === "menunggu_review" &&
                                permissions.can_review && (
                                  <>
                                    <button
                                      type="button"
                                      className="tk-btn tk-btn--primary tk-btn--sm"
                                      onClick={() =>
                                        updateWorkStatus(work, "selesai")
                                      }
                                      disabled={isProcessing}
                                    >
                                      Selesaikan
                                    </button>
                                    <button
                                      type="button"
                                      className="tk-btn tk-btn--secondary tk-btn--sm"
                                      onClick={() =>
                                        updateWorkStatus(
                                          work,
                                          "sedang_dikerjakan",
                                        )
                                      }
                                      disabled={isProcessing}
                                    >
                                      Kembalikan ke Dikerjakan
                                    </button>
                                  </>
                                )}

                              {work.status === "selesai" &&
                                permissions.can_reopen && (
                                  <button
                                    type="button"
                                    className="tk-btn tk-btn--secondary tk-btn--sm"
                                    onClick={() =>
                                      updateWorkStatus(work, "sedang_dikerjakan")
                                    }
                                    disabled={isProcessing}
                                  >
                                    Buka Kembali
                                  </button>
                                )}

                              {permissions.can_edit && (
                                <button
                                  type="button"
                                  className="tk-btn tk-btn--ghost tk-btn--sm"
                                  onClick={() => {
                                    setEditingWork(work);
                                    setWorkFormOpen(true);
                                  }}
                                >
                                  <Pencil size={13} />
                                  Edit
                                </button>
                              )}

                              {permissions.can_delete && (
                                <button
                                  type="button"
                                  className="tk-btn tk-btn--danger tk-btn--sm"
                                  onClick={() => deleteWork(work)}
                                >
                                  <Trash2 size={13} />
                                  Hapus
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
                )}

                {activeTab === "progres" && (
                <>
                <section className="tk-panel">
                  <div className="tk-section-head">
                    <div>
                      <h3>Umpan Balik Guru</h3>
                      <p>Catatan monitoring yang diberikan gurumu.</p>
                    </div>
                    <MessageSquare size={18} />
                  </div>

                  {feedback.length === 0 ? (
                    <p className="tk-group-subtitle" style={{ marginTop: 10 }}>
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
                </section>

                <section className="tk-panel">
                  <div className="tk-section-head">
                    <div>
                      <h3>Aktivitas Kelompok</h3>
                      <p>
                        Riwayat pembuatan kelompok, perubahan PIC, status, dan
                        tindakan guru.
                      </p>
                    </div>
                  </div>

                  {activities.length === 0 ? (
                    <p className="tk-group-subtitle" style={{ marginTop: 10 }}>
                      Belum ada aktivitas.
                    </p>
                  ) : (
                    <div className="tk-activity-list">
                      {activities.map((activity) => (
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
                </section>
                </>
                )}
              </div>

              {activeTab === "kelompok" && (
              <div className="tk-stack tk-aside-stack">
                <section className="tk-panel">
                  <div className="tk-section-head">
                    <div>
                      <h3>Anggota Kelompok</h3>
                      <p>{members.length} siswa bergabung.</p>
                    </div>
                    {group.permissions?.can_manage_invitations && (
                      <button
                        type="button"
                        className="tk-btn tk-btn--soft tk-btn--sm"
                        onClick={openInvitePanel}
                        disabled={maxReached}
                        title={
                          maxReached
                            ? "Kelompok sudah mencapai batas maksimal."
                            : undefined
                        }
                      >
                        <UserPlus size={14} />
                        Undang
                      </button>
                    )}
                  </div>

                  <div className="tk-invitation-list" style={{ marginTop: 12 }}>
                    {members.map((member) => (
                      <div
                        className="tk-invitation"
                        key={member.id}
                        style={{ padding: 10 }}
                      >
                        <span className="tk-member" style={{ border: 0 }}>
                          <Avatar person={member} size="sm" />
                          {member.name}
                          {member.id === currentUserId && <small>Kamu</small>}
                          {member.role === "ketua" && <small>Ketua</small>}
                        </span>
                        <span className="tk-toolbar-note">
                          {member.role === "ketua" ? "Pembuat kelompok" : "Anggota"}
                        </span>
                      </div>
                    ))}
                  </div>

                  {pendingGroupInvites.length > 0 && (
                    <div style={{ marginTop: 14 }}>
                      <span className="tk-label">
                        Undangan menunggu ({pendingGroupInvites.length})
                      </span>
                      <div className="tk-invitation-list">
                        {pendingGroupInvites.map((invitation) => (
                          <div className="tk-invitation" key={invitation.id}>
                            <span className="tk-member" style={{ border: 0 }}>
                              <Avatar person={invitation.student} size="sm" />
                              {invitation.student?.name ?? "Siswa"}
                            </span>
                            <button
                              type="button"
                              className="tk-icon-btn"
                              onClick={() => cancelInvitation(invitation.id)}
                              aria-label={`Batalkan undangan ${invitation.student?.name ?? "siswa"}`}
                            >
                              <X size={15} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {inviteOpen && (
                    <form
                      className="tk-form"
                      onSubmit={submitInvitations}
                      style={{ marginTop: 14 }}
                    >
                      <div className="tk-field">
                        <span className="tk-label">
                          Teman sekelas yang bisa diundang
                        </span>

                        {inviteError && (
                          <InfoAlert tone="danger">{inviteError}</InfoAlert>
                        )}

                        {loadingStudents ? (
                          <small>Memuat siswa...</small>
                        ) : availableStudents.length === 0 ? (
                          <small>
                            Tidak ada teman sekelas yang tersedia. Semua sudah
                            masuk kelompok atau diundang.
                          </small>
                        ) : (
                          <div className="tk-check-grid">
                            {availableStudents.map((student) => (
                              <label
                                className={`tk-check ${
                                  student.sudah_diundang
                                    ? "tk-check--disabled"
                                    : ""
                                }`}
                                key={student.id}
                              >
                                <input
                                  type="checkbox"
                                  checked={
                                    student.sudah_diundang ||
                                    selectedStudentIds.includes(student.id)
                                  }
                                  onChange={() => toggleStudent(student.id)}
                                  disabled={student.sudah_diundang}
                                />
                                <span>
                                  {student.name}
                                  {student.sudah_diundang
                                    ? " (sudah diundang)"
                                    : ""}
                                </span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="tk-form-actions">
                        <button
                          type="button"
                          className="tk-btn tk-btn--secondary tk-btn--sm"
                          onClick={() => {
                            setInviteOpen(false);
                            setInviteError("");
                            setSelectedStudentIds([]);
                          }}
                        >
                          Tutup
                        </button>
                        <button
                          type="submit"
                          className="tk-btn tk-btn--primary tk-btn--sm"
                          disabled={
                            inviting ||
                            loadingStudents ||
                            selectedStudentIds.length === 0
                          }
                        >
                          <Send size={13} />
                          {inviting ? "Mengirim..." : "Kirim Undangan"}
                        </button>
                      </div>
                    </form>
                  )}

                  {!inviteOpen && maxReached && (
                    <p className="tk-form-hint" style={{ marginTop: 10 }}>
                      Kelompok sudah mencapai batas maksimal anggota dan
                      undangan aktif.
                    </p>
                  )}
                </section>
              </div>
              )}
            </div>
          </>
        )}
      </div>

      {workFormOpen && group && (
        <PekerjaanForm
          kelompok={group}
          pekerjaan={editingWork}
          currentUserId={currentUserId}
          onClose={() => {
            setWorkFormOpen(false);
            setEditingWork(null);
          }}
          onSuccess={refreshGroup}
        />
      )}
    </main>
  );
}
