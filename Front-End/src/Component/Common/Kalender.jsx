import { useEffect, useMemo, useState } from "react";
import api from "../../api/axios";
import { formatExamTime } from "../../utils/ujian";

const MONTH_NAMES = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const DAY_NAMES = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

const TYPE_LABELS = {
  ujian: "Ujian",
  tugas: "Tugas",
  pengumuman: "Pengumuman",
};

const EVENT_TYPE_ORDER = Object.keys(TYPE_LABELS);

const LEGEND_ITEMS = EVENT_TYPE_ORDER.map((type) => ({
  type,
  label: TYPE_LABELS[type],
}));

const pad = (value) => String(value).padStart(2, "0");

const toArray = (value) => (Array.isArray(value) ? value : value?.data ?? []);

/**
 * Ambil bagian tanggal "YYYY-MM-DD" tanpa terpengaruh timezone.
 * Backend bisa mengirim "2026-10-20", "2026-10-20 00:00:00",
 * atau ISO "2026-10-20T00:00:00.000000Z".
 */
function getDateKey(value) {
  const text = String(value ?? "").trim();
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (match) return `${match[1]}-${match[2]}-${match[3]}`;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}`;
}

function getTodayKey() {
  const today = new Date();

  return `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(
    today.getDate(),
  )}`;
}

function formatDateKey(key) {
  if (!key) return "-";

  return new Date(`${key}T00:00:00`).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const describeEvent = (event) =>
  `${TYPE_LABELS[event.type] ?? "Agenda"}: ${event.title}${
    event.meta ? `, ${event.meta}` : ""
  }`;

export default function Kalender() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tugas, setTugas] = useState([]);
  const [ujians, setUjians] = useState([]);
  const [pengumuman, setPengumuman] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tooltip, setTooltip] = useState(null);

  useEffect(() => {
    let active = true;

    const getAgenda = async () => {
      const results = await Promise.allSettled([
        api.get("/tugas"),
        api.get("/ujian"),
        api.get("/pengumuman"),
      ]);

      if (!active) return;

      const [tugasResult, ujianResult, pengumumanResult] = results;

      if (tugasResult.status === "fulfilled") {
        setTugas(toArray(tugasResult.value.data));
      } else {
        console.error("Gagal mengambil tugas:", tugasResult.reason);
      }

      if (ujianResult.status === "fulfilled") {
        setUjians(toArray(ujianResult.value.data));
      } else {
        console.error("Gagal mengambil ujian:", ujianResult.reason);
      }

      if (pengumumanResult.status === "fulfilled") {
        setPengumuman(toArray(pengumumanResult.value.data));
      } else {
        console.error("Gagal mengambil pengumuman:", pengumumanResult.reason);
      }

      if (results.every((result) => result.status === "rejected")) {
        setError("Agenda gagal dimuat.");
      }

      setLoading(false);
    };

    getAgenda();

    return () => {
      active = false;
    };
  }, []);

  // Tooltip memakai posisi fixed, jadi sembunyikan saat halaman digulir/resize.
  useEffect(() => {
    const closeTooltip = () => setTooltip(null);

    window.addEventListener("scroll", closeTooltip, true);
    window.addEventListener("resize", closeTooltip);

    return () => {
      window.removeEventListener("scroll", closeTooltip, true);
      window.removeEventListener("resize", closeTooltip);
    };
  }, []);

  const eventsByDate = useMemo(() => {
    const map = new Map();

    const addEvent = (value, event) => {
      const key = getDateKey(value);

      if (!key) return;

      const events = map.get(key) ?? [];
      events.push(event);
      map.set(key, events);
    };

    tugas.forEach((item) => {
      addEvent(item.deadline, {
        type: "tugas",
        title: item.title ?? "Tugas",
        meta: item.subject?.name ?? "",
      });
    });

    ujians.forEach((item) => {
      const time = formatExamTime(item.start_time);
      const meta = [item.subject?.name, time !== "-" ? `Jam ${time}` : null]
        .filter(Boolean)
        .join(" • ");

      addEvent(item.exam_date, {
        type: "ujian",
        title: item.title ?? "Ujian",
        meta,
      });
    });

    pengumuman.forEach((item) => {
      const startKey = getDateKey(item.start_at ?? item.created_at);
      const endKey = getDateKey(item.end_at);
      let period = "";

      if (startKey && endKey) {
        period =
          startKey === endKey
            ? `Berlaku ${formatDateKey(startKey)}`
            : `Berlaku ${formatDateKey(startKey)} – ${formatDateKey(endKey)}`;
      }

      addEvent(item.start_at ?? item.created_at, {
        type: "pengumuman",
        title: item.title ?? "Pengumuman",
        meta: period,
      });

      // Tandai juga tanggal berakhirnya jika berbeda dari tanggal mulai.
      if (endKey && startKey && endKey !== startKey) {
        addEvent(item.end_at, {
          type: "pengumuman",
          title: item.title ?? "Pengumuman",
          meta: `Berakhir ${formatDateKey(endKey)}`,
        });
      }
    });

    return map;
  }, [tugas, ujians, pengumuman]);

  const upcomingDeadlines = useMemo(() => {
    const todayKey = getTodayKey();

    return tugas
      .map((item) => ({
        ...item,
        dateKey: getDateKey(item.deadline),
      }))
      .filter((item) => item.dateKey && item.dateKey >= todayKey)
      .sort(
        (a, b) =>
          a.dateKey.localeCompare(b.dateKey) ||
          String(a.title ?? "").localeCompare(String(b.title ?? "")),
      )
      .slice(0, 5);
  }, [tugas]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const monthKey = `${year}-${pad(month + 1)}`;

  const days = [
    ...Array.from({ length: firstDay }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];

  const getDayKey = (day) => `${monthKey}-${pad(day)}`;

  const getDayEvents = (day) =>
    day ? eventsByDate.get(getDayKey(day)) ?? [] : [];

  const isToday = (day) => {
    const today = new Date();

    return (
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
    );
  };

  const showDayTooltip = (event, day, dayEvents) => {
    if (!day || dayEvents.length === 0) {
      setTooltip(null);
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const tooltipWidth = 260;
    const tooltipHeight = 220;
    const margin = 10;
    const left = Math.min(
      Math.max(rect.left + rect.width / 2, tooltipWidth / 2 + margin),
      window.innerWidth - tooltipWidth / 2 - margin,
    );
    const placeAbove =
      rect.bottom + tooltipHeight > window.innerHeight &&
      rect.top > tooltipHeight;

    setTooltip({
      day,
      events: dayEvents,
      style: {
        left: `${left}px`,
        top: placeAbove
          ? `${rect.top - margin}px`
          : `${rect.bottom + margin}px`,
        transform: placeAbove
          ? "translate(-50%, -100%)"
          : "translate(-50%, 0)",
      },
    });
  };

  const handlePrevMonth = () => {
    setTooltip(null);
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setTooltip(null);
    setCurrentDate(new Date(year, month + 1, 1));
  };

  return (
    <div className="kalender-container">
      <div className="kalender-header">
        <h1>Kalender</h1>
        <div className="kalender-nav">
          <button
            className="nav-btn"
            type="button"
            onClick={handlePrevMonth}
            aria-label="Bulan sebelumnya"
          >
            ◀
          </button>
          <div className="month-year">
            <h2>
              {MONTH_NAMES[month]} {year}
            </h2>
          </div>
          <button
            className="nav-btn"
            type="button"
            onClick={handleNextMonth}
            aria-label="Bulan berikutnya"
          >
            ▶
          </button>
        </div>
      </div>

      <div className="kalender-content">
        <div className="kalender-main">
          <div className="calendar-legend" aria-label="Keterangan penanda kalender">
            {LEGEND_ITEMS.map((item) => (
              <span className="calendar-legend-item" key={item.type}>
                <span
                  className={`calendar-legend-dot calendar-event-dot--${item.type}`}
                  aria-hidden="true"
                />
                {item.label}
              </span>
            ))}
          </div>

          <div className="calendar-grid-container">
            <div className="day-headers">
              {DAY_NAMES.map((day) => (
                <div key={day} className="day-header">
                  {day}
                </div>
              ))}
            </div>

            <div className="calendar-grid" onMouseLeave={() => setTooltip(null)}>
              {days.map((day, index) => {
                const dayEvents = getDayEvents(day);
                const eventTypes = EVENT_TYPE_ORDER.filter((type) =>
                  dayEvents.some((event) => event.type === type),
                );

                return (
                  <div
                    key={index}
                    className={`calendar-day ${day ? "has-day" : "empty"} ${
                      isToday(day) ? "today" : ""
                    } ${dayEvents.length > 0 ? "has-event" : ""}`}
                    tabIndex={dayEvents.length > 0 ? 0 : undefined}
                    onMouseEnter={(event) =>
                      showDayTooltip(event, day, dayEvents)
                    }
                    onFocus={(event) => showDayTooltip(event, day, dayEvents)}
                    onBlur={() => setTooltip(null)}
                    aria-label={
                      day
                        ? `${day} ${MONTH_NAMES[month]} ${year}${
                            dayEvents.length > 0
                              ? `: ${dayEvents.map(describeEvent).join(", ")}`
                              : ""
                          }`
                        : undefined
                    }
                  >
                    {day}
                    {eventTypes.length > 0 && (
                      <span className="calendar-event-dots" aria-hidden="true">
                        {eventTypes.map((type) => (
                          <span
                            key={type}
                            className={`calendar-event-dot calendar-event-dot--${type}`}
                          />
                        ))}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <aside className="deadline-sidebar">
          <h3>Deadline Terdekat</h3>
          <div className="deadline-list">
            {loading ? (
              <div className="empty-state">
                <p>Memuat deadline...</p>
              </div>
            ) : upcomingDeadlines.length === 0 ? (
              <div className="empty-state">
                <p>{error || "Belum ada deadline."}</p>
              </div>
            ) : (
              upcomingDeadlines.map((item) => (
                <div className="deadline-item" key={item.id}>
                  <span className="deadline-item-title">{item.title}</span>
                  <span className="deadline-item-date">
                    {item.subject?.name ? `${item.subject.name} • ` : ""}
                    {formatDateKey(item.dateKey)}
                  </span>
                </div>
              ))
            )}
          </div>
        </aside>
      </div>

      {tooltip && (
        <div className="calendar-day-tooltip" style={tooltip.style} role="tooltip">
          <div className="calendar-day-tooltip__date">
            {tooltip.day} {MONTH_NAMES[month]} {year}
          </div>

          <ul className="calendar-day-tooltip__list">
            {tooltip.events.map((event, index) => (
              <li
                className="calendar-day-tooltip__item"
                key={`${event.type}-${index}`}
              >
                <span
                  className={`calendar-day-tooltip__badge calendar-day-tooltip__badge--${event.type}`}
                >
                  {TYPE_LABELS[event.type] ?? event.type}
                </span>

                <span className="calendar-day-tooltip__body">
                  <strong>{event.title}</strong>
                  {event.meta && <small>{event.meta}</small>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
