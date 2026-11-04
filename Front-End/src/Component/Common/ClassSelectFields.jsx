import {
  findKelasBySelection,
  getClassNumberOptions,
  getGradeOptions,
  getMajorOptions,
} from "../../utils/kelas";

const DEFAULT_LABELS = {
  grade: "Tingkat",
  major: "Jurusan",
  number: "Nomor Kelas",
};

const FORM_PLACEHOLDERS = {
  grade: "Pilih tingkat",
  major: "Pilih jurusan",
  number: "Pilih nomor kelas",
};

const FILTER_PLACEHOLDERS = {
  grade: "Semua Tingkat",
  major: "Semua Jurusan",
  number: "Semua Nomor Kelas",
};

export default function ClassSelectFields({
  kelas = [],
  value = {},
  onChange,
  mode = "form",
  idPrefix = "class",
  labels = {},
  placeholders = {},
  showLabels = mode !== "filter",
  required = false,
  disabled = false,
  className = "class-select-fields",
  fieldClassName = "class-select-field",
  selectClassName = "",
  numberOptionPrefix = "",
}) {
  const isFilter = mode === "filter";
  const grade = value.grade ?? "";
  const major = value.major ?? "";
  const number = value.number ?? "";

  const grades = getGradeOptions(kelas);
  const majors = getMajorOptions(kelas, grade);
  const numbers = getClassNumberOptions(kelas, grade, major);

  const mergedLabels = { ...DEFAULT_LABELS, ...labels };
  const mergedPlaceholders = {
    ...(isFilter ? FILTER_PLACEHOLDERS : FORM_PLACEHOLDERS),
    ...placeholders,
  };

  const emit = (next) => {
    onChange?.(next, findKelasBySelection(kelas, next));
  };

  const handleGradeChange = (event) => {
    emit({ grade: event.target.value, major: "", number: "" });
  };

  const handleMajorChange = (event) => {
    emit({ grade, major: event.target.value, number: "" });
  };

  const handleNumberChange = (event) => {
    emit({ grade, major, number: event.target.value });
  };

  const majorDisabled = disabled || (!isFilter && !grade);
  const numberDisabled = disabled || (!isFilter && !major);

  return (
    <div className={className}>
      <div className={fieldClassName}>
        {showLabels && (
          <label htmlFor={`${idPrefix}-grade`}>{mergedLabels.grade}</label>
        )}

        <select
          id={`${idPrefix}-grade`}
          className={selectClassName}
          value={grade}
          onChange={handleGradeChange}
          aria-label={mergedLabels.grade}
          required={required}
          disabled={disabled}
        >
          <option value="">{mergedPlaceholders.grade}</option>

          {grades.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>

      <div className={fieldClassName}>
        {showLabels && (
          <label htmlFor={`${idPrefix}-major`}>{mergedLabels.major}</label>
        )}

        <select
          id={`${idPrefix}-major`}
          className={selectClassName}
          value={major}
          onChange={handleMajorChange}
          aria-label={mergedLabels.major}
          required={required}
          disabled={majorDisabled}
        >
          <option value="">{mergedPlaceholders.major}</option>

          {majors.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </div>

      <div className={fieldClassName}>
        {showLabels && (
          <label htmlFor={`${idPrefix}-number`}>{mergedLabels.number}</label>
        )}

        <select
          id={`${idPrefix}-number`}
          className={selectClassName}
          value={number}
          onChange={handleNumberChange}
          aria-label={mergedLabels.number}
          required={required}
          disabled={numberDisabled}
        >
          <option value="">{mergedPlaceholders.number}</option>

          {numbers.map((item) => (
            <option key={item} value={item}>
              {numberOptionPrefix}
              {item}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
