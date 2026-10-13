import { X, AlertTriangle } from 'lucide-react';

const ConfirmDialog = ({ title, message, onConfirm, onCancel, loading }) => (
  <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
    <div className="modal" style={{ maxWidth: 420 }} role="alertdialog" aria-modal="true" aria-labelledby="confirm-title">
      <div className="modal-header">
        <h2 id="confirm-title" style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-danger)' }}>
          <AlertTriangle size={20} />{title}
        </h2>
        <button className="btn btn-ghost" onClick={onCancel} aria-label="Close dialog">
          <X size={18} />
        </button>
      </div>
      <div className="modal-body">
        <p className="confirm-text">{message}</p>
      </div>
      <div className="modal-footer">
        <button className="btn btn-secondary" onClick={onCancel} disabled={loading}>
          Cancel
        </button>
        <button className="btn btn-danger" onClick={onConfirm} disabled={loading} autoFocus>
          {loading ? <><span className="spinner" style={{ borderColor: 'rgba(255,255,255,0.4)', borderTopColor: '#fff', width: 14, height: 14 }} /> Deleting…</> : 'Delete'}
        </button>
      </div>
    </div>
  </div>
);

export default ConfirmDialog;
