import { X } from "lucide-react";
import { useMemo, useState } from "react";

const labelKelas = (item) => {
  if (!item) return "-";

  return `${item.grade ?? ""} ${item.major_name ?? item.major?.name ?? ""} ${
    item.class_number ?? ""
  }`
    .replace(/\s+/g, " ")
    .trim();
};

export default function ClassPicker({ kelas = [], value = [], onChange }) {
  const [selectedGrade, setSelectedGrade] = useState("");
  const [selectedMajor, setSelectedMajor] = useState("");
  const [selectedClassNumber, setSelectedClassNumber] = useState("");

  const gradeOptions = useMemo(
    () =>
      [...new Set(kelas.map((item) => item.grade))]
        .filter((grade) => grade != null && grade !== "")
        .sort(),
    [kelas],
  );

  const majorOptions = useMemo(() => {
    const matching = kelas.filter(
      (item) => !selectedGrade || String(item.grade) === String(selectedGrade),
    );

    return [
      ...new Map(
        matching
          .map((item) => {
            const id = item.major_id ?? item.major?.id;
            const name = item.major_name ?? item.major?.name;

            return id != null && name
              ? [String(id), { id: String(id), name }]
              : null;
          })
          .filter(Boolean),
      ).values(),
    ].sort((a, b) => a.name.localeCompare(b.name));
  }, [kelas, selectedGrade]);

  const classNumberOptions = useMemo(() => {
    const matching = kelas.filter((item) => {
      const majorId = item.major_id ?? item.major?.id;

      return (
        (!selectedGrade || String(item.grade) === String(selectedGrade)) &&
        (!selectedMajor || String(majorId) === String(selectedMajor)) &&
        item.class_number != null
      );
    });

    return [...new Set(matching.map((item) => String(item.class_number)))].sort(
      (a, b) => Number(a) - Number(b),
    );
  }, [kelas, selectedGrade, selectedMajor]);

  const addClass = (classId) => {
    if (!classId || value.includes(classId)) return;

    onChange([...value, classId]);
  };

  const handleClassNumberChange = (classNumber) => {
    setSelectedClassNumber(classNumber);

    if (!classNumber) return;

    const target = kelas.find((item) => {
      const majorId = item.major_id ?? item.major?.id;

      return (
        String(item.grade) === String(selectedGrade) &&
        String(majorId) === String(selectedMajor) &&
        String(item.class_number) === String(classNumber)
      );
    });

    if (target) {
      addClass(target.id);
    }

    setSelectedClassNumber("");
  };

  const removeClass = (classId) => {
    onChange(value.filter((id) => id !== classId));
  };

  return (
    <div className="task-class-picker">
      <div className="task-form-row task-form-row--three">
        <div className="task-form-group">
          <label htmlFor="class-picker-grade">Tingkat</label>
          <select
            id="class-picker-grade"
            value={selectedGrade}
            onChange={(event) => {
              setSelectedGrade(event.target.value);
              setSelectedMajor("");
              setSelectedClassNumber("");
            }}
          >
            <option value="" disabled>
              Pilih tingkat
            </option>
            {gradeOptions.map((grade) => (
              <option key={grade} value={grade}>
                {grade}
              </option>
            ))}
          </select>
        </div>

        <div className="task-form-group">
          <label htmlFor="class-picker-major">Jurusan</label>
          <select
            id="class-picker-major"
            value={selectedMajor}
            onChange={(event) => {
              setSelectedMajor(event.target.value);
              setSelectedClassNumber("");
            }}
            disabled={!selectedGrade}
          >
            <option value="" disabled>
              Pilih jurusan
            </option>
            {majorOptions.map((major) => (
              <option key={major.id} value={major.id}>
                {major.name}
              </option>
            ))}
          </select>
        </div>

        <div className="task-form-group">
          <label htmlFor="class-picker-number">Nomor Kelas</label>
          <select
            id="class-picker-number"
            value={selectedClassNumber}
            onChange={(event) => handleClassNumberChange(event.target.value)}
            disabled={!selectedMajor}
          >
            <option value="" disabled>
              Pilih nomor kelas
            </option>
            {classNumberOptions.map((number) => (
              <option key={number} value={number}>
                {number}
              </option>
            ))}
          </select>
        </div>
      </div>

      {value.length > 0 ? (
        <div className="task-class-chips">
          {value.map((classId) => {
            const item = kelas.find((kelasItem) => kelasItem.id === classId);

            return (
              <span className="task-class-chip" key={classId}>
                {labelKelas(item) || `Kelas #${classId}`}
                <button
                  type="button"
                  onClick={() => removeClass(classId)}
                  aria-label={`Hapus ${labelKelas(item)} dari kelas tujuan`}
                >
                  <X size={12} />
                </button>
              </span>
            );
          })}
        </div>
      ) : (
        <p className="task-form-hint">
          Pilih tingkat, jurusan, lalu nomor kelas. Kamu bisa menambahkan lebih
          dari satu kelas.
        </p>
      )}
    </div>
  );
}
