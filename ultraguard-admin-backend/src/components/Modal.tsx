"use client";

export function Modal({
  title,
  onClose,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="ug-modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="ug-modal">
        <div className="ug-modal-header">
          <h2 className="ug-modal-title">{title}</h2>
          <button className="ug-icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="ug-modal-body">{children}</div>
        {footer ? <div className="ug-modal-footer">{footer}</div> : null}
      </div>
    </div>
  );
}
