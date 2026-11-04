import { useEffect, useRef, useState } from "react";
import { CalendarDays, X } from "lucide-react";
import api from "../../../api/axios";
import storageUrl from "../../../api/storage";

function toDateTimeLocal(value) {
  if (!value) return "";

  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60000;

  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

/**
 * Ubah data kelas dari API menjadi array. Backend mengirim `kelas`
 * sebagai array (relasi pivot), tetapi data lama bisa berupa objek.
 */
function toKelasArray(value) {
  if (Array.isArray(value)) return value;
  if (value) return [value];
  return [];
}

export default function PengumumanForm({
  isOpen = false,
  initialAnnouncement = null,
  onClose,
  onCreated,
}) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [target, setTarget] = useState("semua");
  const [selectedGrade, setSelectedGrade] = useState("");
  const [selectedMajor, setSelectedMajor] = useState("");
  const [selectedNumbers, setSelectedNumbers] = useState([]);
  const [isNumberOpen, setIsNumberOpen] = useState(false);
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [kelasList, setKelasList] = useState([]);
  const numberDropdownRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    let active = true;

    api
      .get("/kelas")
      .then((response) => {
        if (active) {
          setKelasList(Array.isArray(response.data) ? response.data : []);
        }
      })
      .catch((err) => {
        if (active) {
          console.error("Gagal mengambil daftar kelas:", err);
        }
      });

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

  useEffect(() => {
    if (!isOpen) return;

    setError("");
    setFieldErrors({});
    setAttachment(null);
    setIsNumberOpen(false);

    if (initialAnnouncement) {
      setTitle(initialAnnouncement.title ?? "");
      setContent(initialAnnouncement.content ?? "");
      setTarget(initialAnnouncement.target ?? "semua");
      setStartAt(toDateTimeLocal(initialAnnouncement.start_at));
      setEndAt(toDateTimeLocal(initialAnnouncement.end_at));
    } else {
      setTitle("");
      setContent("");
      setTarget("semua");
      setStartAt("");
      setEndAt("");
      setSelectedGrade("");
      setSelectedMajor("");
      setSelectedNumbers([]);
    }
  }, [isOpen, initialAnnouncement]);

  // Isi pilihan tingkat, jurusan, dan nomor kelas dari pengumuman yang diedit.
  useEffect(() => {
    if (!isOpen || !initialAnnouncement || kelasList.length === 0) {
      return;
    }

    const daftarKelas = toKelasArray(initialAnnouncement.kelas);
    const pertama = daftarKelas[0];

    if (!pertama) {
      setSelectedGrade("");
      setSelectedMajor("");
      setSelectedNumbers([]);
      return;
    }

    setSelectedGrade(String(pertama.grade));
    setSelectedMajor(String(pertama.major_id));

    setSelectedNumbers([
      ...new Set(
        daftarKelas
          .filter(
            (kelas) =>
              String(kelas.grade) === String(pertama.grade) &&
              String(kelas.major_id) === String(pertama.major_id),
          )
          .map((kelas) => String(kelas.class_number)),
      ),
    ]);
  }, [isOpen, initialAnnouncement, kelasList]);

  const kelasTarget = kelasList.filter(
    (kelas) =>
      String(kelas.grade) === String(selectedGrade) &&
      String(kelas.major_id) === String(selectedMajor),
  );

  const nomorTersedia = [
    ...new Set(kelasTarget.map((kelas) => String(kelas.class_number))),
  ].sort((a, b) => Number(a) - Number(b));

  const kelasTerpilih = kelasTarget.filter((kelas) =>
    selectedNumbers.includes(String(kelas.class_number)),
  );

  const labelKelas = (kelas) =>
    `${kelas.grade} ${kelas.major_name ?? kelas.major?.name ?? ""} ${
      kelas.class_number
    }`.trim();

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setFieldErrors({});

    if (
      target === "kelas" &&
      (!selectedGrade || !selectedMajor || kelasTerpilih.length === 0)
    ) {
      setFieldErrors({
        class_ids: [
          "Pilih tingkat, jurusan, dan minimal satu nomor kelas.",
        ],
      });
      return;
    }

    const formData = new FormData();

    formData.append("title", title.trim());
    formData.append("content", content.trim());
    formData.append("target", target);

    if (target === "kelas") {
      kelasTerpilih.forEach((kelas) => {
        formData.append("class_ids[]", String(kelas.id));
      });
    }

    if (startAt) formData.append("start_at", startAt);
    if (endAt) formData.append("end_at", endAt);
    if (attachment) formData.append("attachment", attachment);

    try {
      setLoading(true);

      if (initialAnnouncement) {
        // Laravel menerima method spoofing untuk form multipart.
        formData.append("_method", "PUT");

        await api.post(`/pengumuman/${initialAnnouncement.id}`, formData);
      } else {
        await api.post("/pengumuman", formData);
      }

      await onCreated?.();
      onClose?.();
    } catch (err) {
      const response = err.response?.data;
      const validationErrors = response?.errors
        ? Object.values(response.errors).flat().join(" ")
        : "";

      setError(validationErrors || response?.message || "Pengumuman gagal disimpan.");
    } finally {
      setLoading(false);
    }
  };

  const getFieldError = (field) => fieldErrors[field]?.[0];

  if (!isOpen) return null;

  return (
    <div
      className="announcement-modal-overlay"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="announcement-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pengumuman-form-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="announcement-modal-header">
          <h2 id="pengumuman-form-title" className="announcement-form-title">
            {initialAnnouncement ? "Edit Pengumuman" : "Tambah Pengumuman Baru"}
          </h2>

          <button
            type="button"
            className="announcement-modal-close"
            aria-label="Tutup form"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        <form className="announcement-modal-form" onSubmit={handleSubmit}>
          {error && (
            <p className="announcement-form-error" role="alert">
              {error}
            </p>
          )}

          <div className="announcement-form-group">
            <label htmlFor="judul-pengumuman">Judul Pengumuman</label>
            <input
              id="judul-pengumuman"
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={255}
              required
            />
            {getFieldError("title") && (
              <small role="alert">{getFieldError("title")}</small>
            )}
          </div>

          <div className="announcement-form-group">
            <label htmlFor="isi-pengumuman">Isi Pengumuman</label>
            <textarea
              id="isi-pengumuman"
              rows="6"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              required
            />
            {getFieldError("content") && (
              <small role="alert">{getFieldError("content")}</small>
            )}
          </div>

          <div className="announcement-form-row announcement-form-row--three">
            <div className="announcement-form-group">
              <label htmlFor="tanggal-mulai">Tanggal Mulai</label>
              <div className="announcement-date-input-wrap">
                <input
                  id="tanggal-mulai"
                  type="datetime-local"
                  value={startAt}
                  onChange={(event) => setStartAt(event.target.value)}
                />
                <CalendarDays size={16} className="announcement-date-icon" />
              </div>
              {getFieldError("start_at") && (
                <small role="alert">{getFieldError("start_at")}</small>
              )}
            </div>

            <div className="announcement-form-group">
              <label htmlFor="tanggal-berakhir">Tanggal Berakhir</label>
              <div className="announcement-date-input-wrap">
                <input
                  id="tanggal-berakhir"
                  type="datetime-local"
                  value={endAt}
                  min={startAt || undefined}
                  onChange={(event) => setEndAt(event.target.value)}
                />
                <CalendarDays size={16} className="announcement-date-icon" />
              </div>
              {getFieldError("end_at") && (
                <small role="alert">{getFieldError("end_at")}</small>
              )}
            </div>
          </div>

          <div className="announcement-form-group">
            <label>Lampiran (opsional)</label>
            <div className="task-upload-wrap">
              <input
                id="lampiran-pengumuman"
                className="task-file-input"
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={(event) =>
                  setAttachment(event.target.files?.[0] || null)
                }
              />

              <label
                htmlFor="lampiran-pengumuman"
                className="task-upload-button"
              >
                Choose File
              </label>

              <span className="task-upload-filename">
                {attachment?.name ||
                  (initialAnnouncement?.attachment
                    ? initialAnnouncement.attachment.split("/").pop()
                    : "No file chosen")}
              </span>
            </div>

            <p className="task-upload-note">
              PDF, DOC, DOCX, JPG, JPEG, PNG (Maks. 5MB)
            </p>

            {initialAnnouncement?.attachment && (
              <p className="announcement-card__attachment">
                <a
                  href={storageUrl(initialAnnouncement.attachment)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Lihat Lampiran Saat Ini
                </a>
              </p>
            )}

            {getFieldError("attachment") && (
              <small role="alert">{getFieldError("attachment")}</small>
            )}
          </div>

          <div className="announcement-target-block">
            <h3>Target Pengumuman</h3>

            <div className="announcement-form-group">
              <label htmlFor="target-pengumuman">Target</label>
              <select
                id="target-pengumuman"
                value={target}
                onChange={(event) => {
                  setTarget(event.target.value);
                  setSelectedGrade("");
                  setSelectedMajor("");
                  setSelectedNumbers([]);
                  setIsNumberOpen(false);
                  setError("");
                  setFieldErrors({});
                }}
              >
                <option value="semua">Semua Kelas</option>
                <option value="kelas">Kelas Tertentu</option>
              </select>
            </div>

            {target === "kelas" && (
              <>
                <div className="announcement-form-row announcement-form-row--three">
                  <div className="announcement-form-group">
                    <label htmlFor="tingkat-pengumuman">Tingkat</label>
                    <select
                      id="tingkat-pengumuman"
                      value={selectedGrade}
                      onChange={(event) => {
                        setSelectedGrade(event.target.value);
                        setSelectedNumbers([]);
                        setIsNumberOpen(false);
                        setFieldErrors({});
                      }}
                      required
                    >
                      <option value="">Pilih Tingkat</option>
                      {[
                        ...new Set(kelasList.map((kelas) => kelas.grade)),
                      ].map((grade) => (
                        <option key={grade} value={grade}>
                          {grade}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="announcement-form-group">
                    <label htmlFor="jurusan-pengumuman">Jurusan</label>
                    <select
                      id="jurusan-pengumuman"
                      value={selectedMajor}
                      onChange={(event) => {
                        setSelectedMajor(event.target.value);
                        setSelectedNumbers([]);
                        setIsNumberOpen(false);
                        setFieldErrors({});
                      }}
                      required
                    >
                      <option value="">Pilih Jurusan</option>
                      {[
                        ...new Map(
                          kelasList.map((kelas) => [
                            String(kelas.major_id),
                            {
                              id: String(kelas.major_id),
                              name: kelas.major_name,
                            },
                          ]),
                        ).values(),
                      ].map((major) => (
                        <option key={major.id} value={major.id}>
                          {major.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="announcement-form-group">
                    <label>Nomor Kelas</label>

                    <div className="task-multiselect" ref={numberDropdownRef}>
                      <button
                        type="button"
                        className="task-multiselect-button"
                        onClick={() => setIsNumberOpen((prev) => !prev)}
                        disabled={!selectedGrade || !selectedMajor}
                        aria-haspopup="true"
                        aria-expanded={isNumberOpen}
                      >
                        {!selectedGrade || !selectedMajor
                          ? "Pilih tingkat & jurusan"
                          : selectedNumbers.length > 0
                            ? [...selectedNumbers]
                                .sort((a, b) => Number(a) - Number(b))
                                .join(", ")
                            : "Pilih Nomor"}

                        <span>▼</span>
                      </button>

                      {isNumberOpen && (
                        <div className="task-multiselect-dropdown">
                          {nomorTersedia.length === 0 && (
                            <p className="task-multiselect-empty">
                              Tidak ada nomor kelas untuk tingkat dan jurusan
                              ini.
                            </p>
                          )}

                          {nomorTersedia.map((number) => (
                            <label
                              key={number}
                              className="task-multiselect-option"
                            >
                              <input
                                type="checkbox"
                                checked={selectedNumbers.includes(number)}
                                onChange={() =>
                                  setSelectedNumbers((prev) =>
                                    prev.includes(number)
                                      ? prev.filter((item) => item !== number)
                                      : [...prev, number],
                                  )
                                }
                              />
                              <span>Kelas {number}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>

                    {getFieldError("class_ids") && (
                      <small role="alert">{getFieldError("class_ids")}</small>
                    )}
                  </div>
                </div>
              </>
            )}

            {target === "kelas" && (
              <p className="announcement-target-preview">
                {kelasTerpilih.length > 0
                  ? `Kelas tujuan: ${kelasTerpilih.map(labelKelas).join(", ")}`
                  : "Pilih kelas yang akan menerima pengumuman ini."}
              </p>
            )}
          </div>

          <button
            type="submit"
            className="announcement-submit-button"
            disabled={loading}
          >
            {loading
              ? "Menyimpan..."
              : initialAnnouncement
                ? "Simpan Perubahan"
                : "Simpan Pengumuman"}
          </button>
        </form>
      </div>
    </div>
  );
}
