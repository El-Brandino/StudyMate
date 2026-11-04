import { X } from "lucide-react";
import { placeholder } from "../../assets.js";
import storageUrl from "../../api/storage";
import { STATUS_LABELS } from "./utils";

export function Avatar({ person, size = "md" }) {
  const photo = person?.profile_photo
    ? storageUrl(person.profile_photo)
    : placeholder;

  return (
    <img
      className={`tk-avatar tk-avatar--${size}`}
      src={photo}
      alt={`Foto ${person?.name ?? "pengguna"}`}
      title={person?.name ?? "Pengguna"}
    />
  );
}

export function AvatarStack({ people = [], limit = 4 }) {
  const visible = people.slice(0, limit);
  const rest = people.length - visible.length;

  return (
    <span className="tk-avatar-stack">
      {visible.map((person) => (
        <Avatar key={person.id} person={person} size="sm" />
      ))}
      {rest > 0 && <span className="tk-avatar-more">+{rest}</span>}
    </span>
  );
}

export function StatusBadge({ status, label }) {
  const value = status ?? "belum_dikerjakan";

  return (
    <span className={`tk-status tk-status--${value}`}>
      {label ?? STATUS_LABELS[value] ?? value}
    </span>
  );
}

export function ProgressBlock({ progress, compact = false }) {
  if (!progress) return null;

  const hasWork = progress.sudah_ada_pembagian && progress.total > 0;
  const percentage = progress.persentase ?? 0;

  return (
    <div className={`tk-progress ${compact ? "tk-progress--compact" : ""}`}>
      <div className="tk-progress-head">
        <span>
          {hasWork
            ? `${progress.selesai} dari ${progress.total} pekerjaan selesai`
            : "Belum Ada Pembagian Tugas"}
        </span>
        {hasWork && <strong>{percentage}%</strong>}
      </div>
      {hasWork && (
        <div className="tk-progress-track" aria-hidden="true">
          <span style={{ width: `${percentage}%` }} />
        </div>
      )}
    </div>
  );
}

export function Modal({ title, subtitle, onClose, children, wide = false }) {
  return (
    <div className="tk-modal-overlay" onClick={onClose} role="presentation">
      <div
        className={`tk-modal ${wide ? "tk-modal--wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="tk-modal-head">
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button
            type="button"
            className="tk-icon-btn"
            onClick={onClose}
            aria-label="Tutup"
          >
            <X size={20} />
          </button>
        </header>
        <div className="tk-modal-body">{children}</div>
      </div>
    </div>
  );
}

export function EmptyState({ title, message, action }) {
  return (
    <div className="tk-empty">
      <strong>{title}</strong>
      {message && <p>{message}</p>}
      {action}
    </div>
  );
}

export function InfoAlert({ tone = "info", children }) {
  return <div className={`tk-alert tk-alert--${tone}`}>{children}</div>;
}
