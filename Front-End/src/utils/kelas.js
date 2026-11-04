const normalize = (value) => (value == null ? "" : String(value).trim());

export const getMajorId = (item) => normalize(item?.major_id ?? item?.major?.id);

export const getMajorName = (item) =>
  normalize(item?.major_name ?? item?.major?.name);

export const getGradeOptions = (kelas = []) => {
  const grades = new Set();

  (kelas ?? []).forEach((item) => {
    const grade = normalize(item?.grade);

    if (grade) grades.add(grade);
  });

  return [...grades].sort((a, b) =>
    a.localeCompare(b, "id", { numeric: true }),
  );
};

export const getMajorOptions = (kelas = [], grade = "") => {
  const targetGrade = normalize(grade);
  const majors = new Map();

  (kelas ?? []).forEach((item) => {
    if (targetGrade && normalize(item?.grade) !== targetGrade) return;

    const id = getMajorId(item);
    const name = getMajorName(item);

    if (id && name && !majors.has(id)) {
      majors.set(id, { id, name });
    }
  });

  return [...majors.values()].sort((a, b) =>
    a.name.localeCompare(b.name, "id"),
  );
};

export const getClassNumberOptions = (kelas = [], grade = "", major = "") => {
  const targetGrade = normalize(grade);
  const targetMajor = normalize(major);
  const numbers = new Set();

  (kelas ?? []).forEach((item) => {
    if (targetGrade && normalize(item?.grade) !== targetGrade) return;
    if (targetMajor && getMajorId(item) !== targetMajor) return;

    const number = normalize(item?.class_number);

    if (number) numbers.add(number);
  });

  return [...numbers].sort(
    (a, b) => Number(a) - Number(b) || a.localeCompare(b, "id"),
  );
};

export const findKelasBySelection = (kelas = [], selection = {}) => {
  const targetGrade = normalize(selection.grade);
  const targetMajor = normalize(selection.major);
  const targetNumber = normalize(selection.number);

  if (!targetGrade || !targetMajor || !targetNumber) return null;

  return (
    (kelas ?? []).find(
      (item) =>
        normalize(item?.grade) === targetGrade &&
        getMajorId(item) === targetMajor &&
        normalize(item?.class_number) === targetNumber,
    ) ?? null
  );
};

export const findKelasById = (kelas = [], id) => {
  const targetId = normalize(id);

  if (!targetId) return null;

  return (
    (kelas ?? []).find((item) => normalize(item?.id) === targetId) ?? null
  );
};

export const getSelectionFromKelas = (item) => ({
  grade: normalize(item?.grade),
  major: getMajorId(item),
  number: normalize(item?.class_number),
});

export const matchesKelasSelection = (item, selection = {}) => {
  const targetGrade = normalize(selection.grade);
  const targetMajor = normalize(selection.major);
  const targetNumber = normalize(selection.number);

  if (!targetGrade && !targetMajor && !targetNumber) return true;
  if (!item) return false;

  return (
    (!targetGrade || normalize(item?.grade) === targetGrade) &&
    (!targetMajor || getMajorId(item) === targetMajor) &&
    (!targetNumber || normalize(item?.class_number) === targetNumber)
  );
};
