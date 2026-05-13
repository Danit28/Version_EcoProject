import { X } from 'lucide-react';

export function Modal({ title, children, onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <h3>{title}</h3>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Cerrar modal">
            <X size={18} />
          </button>
        </header>
        <div>{children}</div>
      </div>
    </div>
  );
}
