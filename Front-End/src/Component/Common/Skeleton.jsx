export function Skeleton({
  width = "100%",
  height = 14,
  radius = 8,
  circle = false,
  className = "",
  style,
}) {
  return (
    <span
      className={`skeleton${circle ? " skeleton--circle" : ""}${
        className ? ` ${className}` : ""
      }`}
      style={{
        width,
        height,
        borderRadius: circle ? "50%" : radius,
        ...style,
      }}
      aria-hidden="true"
    />
  );
}

export function SkeletonText({
  lines = 2,
  widths = ["100%", "78%"],
  height = 12,
  className = "",
}) {
  return (
    <span className={`skeleton-text${className ? ` ${className}` : ""}`}>
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton
          key={index}
          width={widths[index % widths.length]}
          height={height}
        />
      ))}
    </span>
  );
}

function StatCardsSkeleton({ count = 4 }) {
  return (
    <div className="stats-grid">
      {Array.from({ length: count }, (_, index) => (
        <div className="stats-card" key={index}>
          <Skeleton width={56} height={56} radius={14} />
          <div className="skeleton-stack">
            <Skeleton width={38} height={24} />
            <Skeleton width={92} height={12} />
          </div>
        </div>
      ))}
    </div>
  );
}

function ProgressSkeleton() {
  return (
    <div className="progress-div skeleton-panel">
      <div className="progress-header">
        <Skeleton width={148} height={18} />
        <Skeleton width={38} height={16} />
      </div>
      <Skeleton height={12} radius={999} />
    </div>
  );
}

function InfoPanelSkeleton({ rows = 3 }) {
  return (
    <div className="card-info skeleton-panel">
      <div className="card-info-header">
        <Skeleton width={148} height={18} />
        <Skeleton width={66} height={12} />
      </div>

      <div className="skeleton-list">
        {Array.from({ length: rows }, (_, index) => (
          <div className="skeleton-list-item" key={index}>
            <Skeleton width={40} height={40} radius={12} />
            <div className="skeleton-stack skeleton-list-copy">
              <Skeleton
                width={`${48 + ((index * 13) % 28)}%`}
                height={12}
              />
              <Skeleton
                width={`${30 + ((index * 17) % 24)}%`}
                height={10}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DashboardSkeleton({ variant = "student" }) {
  const isAdmin = variant === "admin";
  const isTeacher = variant === "teacher";
  const wrapperClass = isAdmin
    ? "admin-page admin-dashboard-page"
    : `main-dashboard${isTeacher ? " teacher-dashboard" : ""}`;

  return (
    <section
      className={wrapperClass}
      aria-busy="true"
      aria-label="Memuat dashboard"
    >
      <div
        className={`greeting-card skeleton-greeting${
          isAdmin ? " admin-greeting" : ""
        }`}
      >
        {isAdmin ? (
          <>
            <div className="skeleton-greeting-copy">
              <Skeleton width={116} height={10} />
              <Skeleton width="min(360px, 80%)" height={30} />
              <Skeleton width="min(560px, 100%)" height={14} />
            </div>

            <div className="skeleton-actions">
              <Skeleton width={142} height={42} radius={12} />
              <Skeleton width={132} height={42} radius={12} />
            </div>
          </>
        ) : (
          <>
            <Skeleton width="min(420px, 60%)" height={30} />
            <Skeleton width="min(280px, 42%)" height={14} />
          </>
        )}
      </div>

      <StatCardsSkeleton count={isTeacher ? 3 : 4} />

      {isTeacher ? (
        <div className="dashboard-grid">
          <div className="dashboard-panel progress-panel skeleton-panel">
            <div className="skeleton-panel-header">
              <Skeleton width={160} height={18} />
              <Skeleton width={240} height={38} radius={10} />
            </div>

            <div className="skeleton-progress-content">
              <Skeleton circle width={112} height={112} />

              <div className="skeleton-stack skeleton-progress-copy">
                <Skeleton width="82%" height={14} />
                <Skeleton height={12} radius={999} />
                <Skeleton width="46%" height={12} />
              </div>
            </div>
          </div>

          <InfoPanelSkeleton rows={3} />
          <InfoPanelSkeleton rows={3} />
        </div>
      ) : (
        <>
          {!isAdmin && <ProgressSkeleton />}

          <div
            className={`dashboard-info${
              isAdmin ? " admin-dashboard-info" : ""
            }`}
          >
            <InfoPanelSkeleton rows={isAdmin ? 4 : 2} />
            <InfoPanelSkeleton rows={isAdmin ? 5 : 2} />
          </div>
        </>
      )}
    </section>
  );
}

export function TaskListSkeleton({ variant = "student", rows = 4 }) {
  if (variant === "teacher") {
    return (
      <main
        className="main-tugas-box teacher-tugas"
        aria-busy="true"
        aria-label="Memuat daftar tugas"
      >
        <Skeleton width={190} height={42} radius={10} />

        <div className="task-filter-panel skeleton-filter-panel">
          {Array.from({ length: 7 }, (_, index) => (
            <Skeleton
              key={index}
              width={index === 0 ? 290 : 158}
              height={38}
              radius={10}
            />
          ))}
        </div>

        <section className="task-list">
          {Array.from({ length: rows }, (_, index) => (
            <article className="task-card skeleton-task-card" key={index}>
              <div className="task-card-main">
                <Skeleton width={88} height={10} />
                <Skeleton
                  width={`${58 + ((index * 8) % 24)}%`}
                  height={24}
                />
                <Skeleton width={118} height={12} />
              </div>

              <div className="task-card-meta">
                <div className="skeleton-stack">
                  <Skeleton width={42} height={9} />
                  <Skeleton width={104} height={14} />
                </div>

                <div className="skeleton-stack">
                  <Skeleton width={62} height={9} />
                  <Skeleton width={90} height={14} />
                </div>
              </div>

              <div className="task-card-side">
                <Skeleton width={70} height={26} radius={999} />
                <Skeleton width="100%" height={8} radius={999} />
                <Skeleton width={150} height={11} />
                <div className="skeleton-actions">
                  <Skeleton width={78} height={32} radius={9} />
                  <Skeleton width={60} height={32} radius={9} />
                </div>
              </div>
            </article>
          ))}
        </section>
      </main>
    );
  }

  return (
    <main
      className="main-tugas-box student-task-page"
      aria-busy="true"
      aria-label="Memuat daftar tugas"
    >
      <Skeleton width={180} height={28} className="skeleton-heading" />

      <div className="student-sort-bar skeleton-sort-bar">
        <Skeleton width={78} height={14} />
        <Skeleton width={150} height={38} radius={10} />
      </div>

      <div className="student-task-list">
        {Array.from({ length: rows }, (_, index) => (
          <article
            className="student-task-card skeleton-task-card"
            key={index}
          >
            <div className="student-task-teacher">
              <Skeleton circle width={50} height={50} />

              <div className="skeleton-stack">
                <Skeleton width={104} height={13} />
                <Skeleton width={78} height={11} />
              </div>
            </div>

            <div className="student-task-main">
              <Skeleton
                width={`${56 + ((index * 9) % 26)}%`}
                height={18}
              />
              <Skeleton width="84%" height={12} />

              <div className="skeleton-inline">
                <Skeleton width={82} height={12} />
                <Skeleton width={68} height={12} />
              </div>
            </div>

            <div className="skeleton-stack">
              <Skeleton width={102} height={12} />
              <Skeleton width={72} height={26} radius={999} />
            </div>

            <div className="student-task-actions">
              <Skeleton width={118} height={28} />
              <Skeleton width={92} height={34} radius={10} />
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}

export function ExamListSkeleton({ rows = 3 }) {
  return (
    <div className="exam-list" aria-busy="true" aria-label="Memuat jadwal ujian">
      {Array.from({ length: rows }, (_, index) => (
        <article className="exam-card skeleton-exam-card" key={index}>
          <div className="exam-card-header">
            <div className="skeleton-stack skeleton-exam-heading">
              <Skeleton width={84} height={10} />
              <Skeleton
                width={`${44 + ((index * 11) % 26)}%`}
                height={20}
              />
            </div>

            <Skeleton width={70} height={26} radius={999} />
          </div>

          <div className="exam-card-info">
            {Array.from({ length: 5 }, (_, itemIndex) => (
              <Skeleton
                key={itemIndex}
                width={`${52 + ((itemIndex * 9) % 32)}%`}
                height={12}
              />
            ))}
          </div>

          <div className="exam-card-actions">
            <Skeleton width={86} height={36} radius={10} />
          </div>
        </article>
      ))}
    </div>
  );
}

export function AnnouncementListSkeleton({ rows = 3, showFilter = false }) {
  return (
    <>
      {showFilter && (
        <section className="announcement-filter-panel skeleton-filter-panel">
          <Skeleton width={190} height={38} radius={8} />
        </section>
      )}

      <section
        className="announcement-list"
        aria-busy="true"
        aria-label="Memuat pengumuman"
      >
        {Array.from({ length: rows }, (_, index) => (
          <article
            className="announcement-card skeleton-announcement-card"
            key={index}
          >
            <div className="announcement-card__header">
              <div className="skeleton-stack skeleton-announcement-heading">
                <Skeleton
                  width={`${46 + ((index * 12) % 26)}%`}
                  height={20}
                />
                <Skeleton width={164} height={11} />
              </div>

              <div className="skeleton-actions">
                <Skeleton width={82} height={26} radius={999} />
                <Skeleton width={62} height={36} radius={10} />
              </div>
            </div>

            <div className="skeleton-stack skeleton-announcement-body">
              <Skeleton width="100%" height={12} />
              <Skeleton width="94%" height={12} />
              <Skeleton width="62%" height={12} />
            </div>

            <div className="skeleton-announcement-footer">
              <Skeleton width={122} height={12} />
            </div>
          </article>
        ))}
      </section>
    </>
  );
}

export function LegacyScheduleSkeleton({
  title = "Jadwal",
  columns = 4,
  days = 3,
}) {
  return (
    <main
      className="main-content"
      aria-busy="true"
      aria-label={`Memuat ${title}`}
    >
      <section className="table-section">
        <h2>{title}</h2>

        {Array.from({ length: days }, (_, dayIndex) => (
          <div className="jadwal-group" key={dayIndex}>
            <Skeleton width={72} height={16} />

            <div className="table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    {Array.from({ length: columns }, (_, columnIndex) => (
                      <th key={columnIndex}>
                        <Skeleton width="55%" height={10} />
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {[0, 1].map((rowIndex) => (
                    <tr key={rowIndex}>
                      {Array.from({ length: columns }, (_, columnIndex) => (
                        <td key={columnIndex}>
                          <Skeleton
                            width={`${54 + ((columnIndex * 12) % 28)}%`}
                            height={12}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}

export function TableSkeleton({
  rows = 4,
  columns = 4,
  firstCell = "user",
  lastCell = "action",
}) {
  return (
    <div className="admin-table-wrap" aria-busy="true" aria-label="Memuat data">
      <table className="admin-data-table">
        <thead>
          <tr>
            {Array.from({ length: columns }, (_, index) => (
              <th key={index}>
                <Skeleton
                  width={index === 0 ? "48%" : "56%"}
                  height={9}
                />
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {Array.from({ length: rows }, (_, rowIndex) => (
            <tr key={rowIndex}>
              {Array.from({ length: columns }, (_, columnIndex) => {
                const isFirst = columnIndex === 0;
                const isLast = columnIndex === columns - 1;

                if (isFirst && firstCell === "user") {
                  return (
                    <td key={columnIndex}>
                      <div className="skeleton-user-cell">
                        <Skeleton circle width={38} height={38} />

                        <div className="skeleton-stack">
                          <Skeleton
                            width={112 + ((rowIndex * 17) % 42)}
                            height={12}
                          />
                          <Skeleton width={144} height={10} />
                        </div>
                      </div>
                    </td>
                  );
                }

                if (isFirst && firstCell === "icon") {
                  return (
                    <td key={columnIndex}>
                      <div className="skeleton-user-cell">
                        <Skeleton width={32} height={32} radius={9} />
                        <Skeleton
                          width={118 + ((rowIndex * 15) % 38)}
                          height={13}
                        />
                      </div>
                    </td>
                  );
                }

                if (isLast && lastCell === "action") {
                  return (
                    <td key={columnIndex}>
                      <div className="skeleton-row-actions">
                        <Skeleton width={34} height={34} radius={10} />
                      </div>
                    </td>
                  );
                }

                return (
                  <td key={columnIndex}>
                    <Skeleton
                      width={`${46 + ((rowIndex + columnIndex) % 3) * 16}%`}
                      height={12}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AdminScheduleSkeleton({ days = 2, rows = 2 }) {
  return (
    <>
      {Array.from({ length: days }, (_, dayIndex) => (
        <section
          className="admin-card admin-schedule-card"
          key={dayIndex}
          aria-busy="true"
          aria-label="Memuat jadwal"
        >
          <div className="admin-card-header">
            <div className="skeleton-stack">
              <Skeleton width={72} height={20} />
              <Skeleton width={132} height={12} />
            </div>
          </div>

          <div className="admin-schedule-list">
            {Array.from({ length: rows }, (_, rowIndex) => (
              <div
                className="admin-schedule-item skeleton-schedule-row"
                key={rowIndex}
              >
                <Skeleton width={110} height={14} />

                <div className="skeleton-stack">
                  <Skeleton
                    width={`${44 + ((rowIndex * 12) % 24)}%`}
                    height={14}
                  />
                  <Skeleton width="36%" height={11} />
                </div>

                <Skeleton width={72} height={24} radius={999} />

                <div className="skeleton-row-actions">
                  <Skeleton width={34} height={34} radius={10} />
                  <Skeleton width={34} height={34} radius={10} />
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}

export function ProfileSkeleton({ variant = "student" }) {
  const isAdmin = variant === "admin";
  const isTeacher = variant === "teacher";

  const card = (
    <div className="profil-card">
      <div className="profil-left">
        <div className="avatar-section">
          <Skeleton circle width={140} height={140} />
          <Skeleton width={150} height={20} />
          <Skeleton width={104} height={13} />
          <Skeleton width={108} height={38} radius={8} />
          <Skeleton width={172} height={10} />
        </div>
      </div>

      <div className="profil-divider" />

      <div className="profil-right">
        <Skeleton width={142} height={20} />

        <div className="form-row">
          <div className="form-group">
            <Skeleton width={54} height={12} />
            <Skeleton height={46} radius={8} />
          </div>

          <div className="form-group">
            <Skeleton width={48} height={12} />
            <Skeleton height={46} radius={8} />
          </div>
        </div>

        <div className="form-group full-width">
          <Skeleton width={58} height={12} />
          <Skeleton height={46} radius={8} />
        </div>

        <div className="profil-password-row">
          <div className="form-group profil-password-field">
            <Skeleton width={64} height={12} />
            <Skeleton height={46} radius={8} />
          </div>

          <Skeleton width={150} height={46} radius={8} />
        </div>

        <Skeleton width={100} height={44} radius={8} />
      </div>
    </div>
  );

  return (
    <div
      className={`profil-container${
        isAdmin ? " admin-profile-page" : ""
      }`}
      aria-busy="true"
      aria-label="Memuat profil"
    >
      {isTeacher ? (
        <div className="profil-content">
          {card}

          <div className="teacher-subjects-section skeleton-panel">
            <Skeleton width={240} height={20} />

            <div className="skeleton-chip-row">
              {[92, 128, 108].map((width, index) => (
                <Skeleton
                  key={index}
                  width={width}
                  height={32}
                  radius={999}
                />
              ))}
            </div>

            <div className="skeleton-form-row">
              <Skeleton height={46} radius={8} />
              <Skeleton width={190} height={46} radius={8} />
            </div>
          </div>
        </div>
      ) : (
        card
      )}
    </div>
  );
}
