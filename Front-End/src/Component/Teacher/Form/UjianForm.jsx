
import { useEffect, useRef, useState } from "react";
import { CalendarDays, X, FileText, Upload, Trash2 } from "lucide-react";
import api from "../../../api/axios";

export default function UjianForm({
  isOpen = true,
  initialExam = null,
  onClose,
  onSuccess,
}) {
  const [subjects, setSubjects] = useState([]);
  const [kelasList, setKelasList] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [documentFile, setDocumentFile] = useState(null);
  const [removeDocument, setRemoveDocument] = useState(false);
  const [isNumberOpen, setIsNumberOpen] = useState(false);
  const numberDropdownRef = useRef(null);

  const firstClass = initialExam?.kelas?.[0];

  // Pilih semua nomor kelas yang tingkat & jurusannya sama
  // dengan kelas pertama jadwal yang diedit.
  const initialNumbers = initialExam?.kelas?.length
    ? [
        ...new Set(
          initialExam.kelas
            .filter(
              (kelas) =>
                String(kelas.grade) === String(firstClass?.grade) &&
                String(kelas.major_id) === String(firstClass?.major_id),
            )
            .map((kelas) => String(kelas.class_number)),
        ),
      ]
    : [];

  const [form, setForm] = useState({
    title: initialExam?.title ?? "",
    subject_id: initialExam?.subject_id
      ? String(initialExam.subject_id)
      : "",
    grade: firstClass?.grade ? String(firstClass.grade) : "semua",
    major_id: firstClass?.major_id
      ? String(firstClass.major_id)
      : "semua",
    class_numbers: initialNumbers,
    exam_date: initialExam?.exam_date?.slice(0, 10) ?? "",
    start_time: initialExam?.start_time?.slice(0, 5) ?? "",
    duration: initialExam ? String(initialExam.duration) : "90",
    description: initialExam?.description ?? "",
  });

  useEffect(() => {
    if (!isOpen) return;

    let active = true;

    async function loadOptions() {
      setLoadingData(true);
      setError("");

      try {
        const [subjectResponse, kelasResponse] = await Promise.all([
          api.get("/my-subjects"),
          api.get("/kelas"),
        ]);

        if (!active) return;

        const subjectData = subjectResponse.data;
        const kelasData = kelasResponse.data;

        setSubjects(
          Array.isArray(subjectData)
            ? subjectData
            : subjectData.data ?? subjectData.subjects ?? []
        );

        setKelasList(
          Array.isArray(kelasData)
            ? kelasData
            : kelasData.data ?? kelasData.kelas ?? []
        );
      } catch (err) {
        if (active) {
          setError(
            err.response?.data?.message ??
              "Gagal memuat mata pelajaran atau daftar kelas."
          );
        }
      } finally {
        if (active) setLoadingData(false);
      }
    }

    loadOptions();

    return () => {
      active = false;
    };
  }, [isOpen]);

  // Tutup dropdown nomor kelas saat klik di luar area.
  useEffect(() => {
    if (!isNumberOpen) return undefined;

    const handleClickOutside = (event) => {
      if (
        numberDropdownRef.current &&
        !numberDropdownRef.current.contains(event.target)
      ) {
        setIsNumberOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isNumberOpen]);

  // Satu kelas dianggap cocok bila lolos semua filter yang aktif.
  const cocokFilter = (kelas) => {
    const gradeMatch =
      form.grade === "semua" || String(kelas.grade) === form.grade;

    const majorMatch =
      form.major_id === "semua" ||
      String(kelas.major_id) === form.major_id;

    const numberMatch =
      form.class_numbers.length === 0 ||
      form.class_numbers.includes(String(kelas.class_number));

    return gradeMatch && majorMatch && numberMatch;
  };

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
      // Nomor kelas bisa berbeda antar tingkat/jurusan, jadi reset saat
      // filter utama berubah.
      ...(name === "grade" || name === "major_id"
        ? { class_numbers: [] }
        : {}),
    }));
    setError("");
  }

  function handleDocumentChange(event) {
    const file = event.target.files?.[0] ?? null;
    setError("");

    if (!file) {
      setDocumentFile(null);
      return;
    }

    const allowedExtension = /\.(pdf|doc|docx)$/i.test(file.name);
    const maxSize = 10 * 1024 * 1024;

    if (!allowedExtension) {
      setError("Dokumen harus berformat PDF, DOC, atau DOCX.");
      event.target.value = "";
      setDocumentFile(null);
      return;
    }

    if (file.size > maxSize) {
      setError("Ukuran dokumen maksimal 10 MB.");
      event.target.value = "";
      setDocumentFile(null);
      return;
    }

    setDocumentFile(file);
    setRemoveDocument(false);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const selectedClasses = kelasList.filter(cocokFilter);

    if (!form.subject_id) {
      setError("Pilih mata pelajaran terlebih dahulu.");
      return;
    }

    if (selectedClasses.length === 0) {
      setError("Tidak ada kelas yang cocok dengan pilihanmu.");
      return;
    }

    setSubmitting(true);

    try {
      const payload = new FormData();

      payload.append("title", form.title.trim());
      payload.append("subject_id", form.subject_id);
      payload.append("description", form.description.trim());
      payload.append("exam_date", form.exam_date);
      payload.append("start_time", form.start_time);
      payload.append("duration", form.duration);

      selectedClasses.forEach((kelas) => {
        payload.append("class_ids[]", String(kelas.id));
      });

      if (documentFile) {
        payload.append("document", documentFile);
      }

      if (initialExam && removeDocument) {
        payload.append("remove_document", "1");
      }

      if (initialExam) {
        // Laravel dapat memproses multipart melalui POST + _method.
        payload.append("_method", "PUT");
        await api.post(`/ujian/${initialExam.id}`, payload);
      } else {
        await api.post("/ujian", payload);
      }

      await onSuccess?.();
      onClose?.();
    } catch (err) {
      const response = err.response?.data;
      const validationErrors = response?.errors
        ? Object.values(response.errors).flat().join(" ")
        : "";

      setError(
        validationErrors ||
          response?.message ||
          "Jadwal ujian gagal disimpan."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!isOpen) return null;

  // API /kelas mengembalikan major secara flat (major_id & major_name).
  const majors = [
    ...new Map(
      kelasList
        .filter((kelas) => kelas.major_id && kelas.major_name)
        .map((kelas) => [
          String(kelas.major_id),
          { id: String(kelas.major_id), name: kelas.major_name },
        ]),
    ).values(),
  ];

  // Tingkat mengikuti data kelas dari backend, bukan daftar statis.
  const grades = [
    ...new Set(
      kelasList
        .map((kelas) => String(kelas.grade ?? "").trim())
        .filter(Boolean),
    ),
  ].sort((a, b) => a.localeCompare(b, "id", { numeric: true }));

  // Nomor kelas hanya menampilkan pilihan yang sesuai filter aktif.
  const nomorKelas = [
    ...new Set(
      kelasList
        .filter(
          (kelas) =>
            form.grade === "semua" || String(kelas.grade) === form.grade,
        )
        .filter(
          (kelas) =>
            form.major_id === "semua" ||
            String(kelas.major_id) === form.major_id,
        )
        .map((kelas) => String(kelas.class_number)),
    ),
  ].sort((a, b) => Number(a) - Number(b));

  const filteredClasses = kelasList.filter(cocokFilter);
  const subjectAllowed = subjects.some(
    (subject) => String(subject.id) === String(form.subject_id),
  );
  const showCurrentSubjectOption =
    Boolean(initialExam?.subject) &&
    Boolean(form.subject_id) &&
    !subjectAllowed;

  return (
    <div
      className="exam-modal-overlay"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="exam-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ujian-form-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="exam-modal-header">
          <h2 id="ujian-form-title" className="exam-form-title">
            {initialExam ? "Edit Jadwal Ujian" : "Tambah Ujian Baru"}
          </h2>

          <button
            type="button"
            className="exam-modal-close"
            aria-label="Tutup form"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        <form className="exam-modal-form" onSubmit={handleSubmit}>
          <div className="exam-form-group">
            <label htmlFor="nama-ujian">Nama Ujian</label>
            <input
              id="nama-ujian"
              name="title"
              value={form.title}
              onChange={handleChange}
              placeholder="Contoh: Ujian Pemrograman Web"
              maxLength={255}
              required
            />
          </div>

          <div className="exam-form-group">
            <label htmlFor="mata-pelajaran">Mata Pelajaran</label>
            <select
              id="mata-pelajaran"
              name="subject_id"
              value={form.subject_id}
              onChange={handleChange}
              required
            >
              <option value="">Pilih Mata Pelajaran</option>
              {showCurrentSubjectOption && (
                <option value={form.subject_id}>
                  {initialExam.subject?.name ?? "Mapel saat ini"} (tidak lagi
                  diampu)
                </option>
              )}
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>

            {!loadingData && subjects.length === 0 && (
              <p className="exam-form-hint">
                Belum ada pengkhususan mata pelajaran. Hubungi admin untuk
                mengatur mapel yang Anda ampu.
              </p>
            )}

            {!loadingData &&
              subjects.length > 0 &&
              form.subject_id &&
              !subjectAllowed && (
                <p className="exam-form-hint">
                  Mapel ujian ini tidak lagi termasuk pengkhususan Anda. Pilih
                  salah satu mapel yang diampu untuk menyimpan perubahan.
                </p>
              )}
          </div>

          <div className="exam-form-row exam-form-row--three">
            <div className="exam-form-group">
              <label htmlFor="tingkat-ujian">Tingkat</label>
              <select
                id="tingkat-ujian"
                name="grade"
                value={form.grade}
                onChange={handleChange}
              >
                <option value="semua">Semua Tingkat</option>
                {grades.map((grade) => (
                  <option key={grade} value={grade}>
                    {grade}
                  </option>
                ))}
              </select>
            </div>

            <div className="exam-form-group">
              <label htmlFor="jurusan-ujian">Jurusan</label>
              <select
                id="jurusan-ujian"
                name="major_id"
                value={form.major_id}
                onChange={handleChange}
              >
                <option value="semua">Semua Jurusan</option>
                {majors.map((major) => (
                  <option key={major.id} value={major.id}>
                    {major.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="exam-form-group">
              <label>Nomor Kelas</label>

              <div className="task-multiselect" ref={numberDropdownRef}>
                <button
                  type="button"
                  className="task-multiselect-button"
                  onClick={() => setIsNumberOpen((prev) => !prev)}
                  aria-haspopup="true"
                  aria-expanded={isNumberOpen}
                >
                  {form.class_numbers.length > 0
                    ? [...form.class_numbers]
                        .sort((a, b) => Number(a) - Number(b))
                        .join(", ")
                    : "Semua Kelas"}

                  <span>▼</span>
                </button>

                {isNumberOpen && (
                  <div className="task-multiselect-dropdown">
                    {nomorKelas.length === 0 && (
                      <p className="task-multiselect-empty">
                        Belum ada data kelas.
                      </p>
                    )}

                    {nomorKelas.map((number) => (
                      <label key={number} className="task-multiselect-option">
                        <input
                          type="checkbox"
                          checked={form.class_numbers.includes(number)}
                          onChange={() =>
                            setForm((current) => ({
                              ...current,
                              class_numbers: current.class_numbers.includes(
                                number,
                              )
                                ? current.class_numbers.filter(
                                    (item) => item !== number,
                                  )
                                : [...current.class_numbers, number],
                            }))
                          }
                        />

                        <span>Kelas {number}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <p className="exam-form-hint">
                Bisa pilih lebih dari satu. Kosongkan untuk semua nomor kelas.
              </p>
            </div>
          </div>

          <p className="exam-form-hint">
            Kelas yang cocok dengan pilihan dropdown akan menerima jadwal ini.
          </p>

          <div className="exam-form-group">
            <label>Kelas yang dipilih</label>
            <p>
              {filteredClasses.length
                ? filteredClasses
                    .map(
                      (kelas) =>
                        `${kelas.grade} ${kelas.major_name ?? kelas.major?.name ?? ""} Kelas ${kelas.class_number}`,
                    )
                    .join(", ")
                : "Tidak ada kelas yang cocok."}
            </p>
          </div>

          <div className="exam-form-row exam-form-row--three">
            <div className="exam-form-group">
              <label htmlFor="tanggal-ujian">Tanggal</label>
              <div className="exam-date-input-wrap">
                <input
                  id="tanggal-ujian"
                  name="exam_date"
                  type="date"
                  value={form.exam_date}
                  onChange={handleChange}
                  required
                />
                <CalendarDays size={16} className="exam-date-icon" />
              </div>
            </div>

            <div className="exam-form-group">
              <label htmlFor="jam-ujian">Jam</label>
              <input
                id="jam-ujian"
                name="start_time"
                type="time"
                value={form.start_time}
                onChange={handleChange}
                required
              />
            </div>

            <div className="exam-form-group">
              <label htmlFor="durasi-ujian">Durasi (menit)</label>
              <input
                id="durasi-ujian"
                name="duration"
                type="number"
                min="1"
                max="600"
                value={form.duration}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="exam-form-group">
            <label htmlFor="deskripsi-ujian">Deskripsi</label>
            <textarea
              id="deskripsi-ujian"
              name="description"
              rows="5"
              value={form.description}
              onChange={handleChange}
            />
          </div>

          <div className="exam-form-group">
            <label htmlFor="ujian-document">
              Dokumen Kisi-Kisi (PDF, DOC, DOCX)
            </label>

            {initialExam?.document_path && !removeDocument && (
              <div className="exam-document-current">
                <FileText size={20} />
                <span>Dokumen kisi-kisi sudah terpasang</span>
                <button
                  type="button"
                  onClick={() => {
                    setRemoveDocument(true);
                    setDocumentFile(null);
                  }}
                >
                  <Trash2 size={16} />
                  Hapus
                </button>
              </div>
            )}

            {removeDocument && (
              <p role="status">
                Dokumen lama akan dihapus setelah perubahan disimpan.
              </p>
            )}

            <input
              id="ujian-document"
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={handleDocumentChange}
            />

            <p className="exam-form-hint">
              Maksimal 10 MB. Pilih file baru untuk menambahkan atau mengganti
              dokumen. Jika tidak memilih file, dokumen lama tetap tersimpan.
            </p>

            {documentFile && (
              <p>
                <Upload size={16} /> {documentFile.name}
              </p>
            )}
          </div>

          {loadingData && (
            <p role="status">Memuat mata pelajaran dan kelas...</p>
          )}

          {error && <p role="alert">{error}</p>}

          <button
            type="submit"
            className="exam-submit-button"
            disabled={
              loadingData ||
              submitting ||
              subjects.length === 0 ||
              (Boolean(form.subject_id) && !subjectAllowed)
            }
          >
            {submitting
              ? "Menyimpan..."
              : initialExam
                ? "Simpan Perubahan"
                : "Simpan Ujian"}
          </button>
        </form>
      </div>
    </div>
  );
}
