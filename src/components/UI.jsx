import { AlertCircle, CheckCircle2, Inbox, LoaderCircle, X } from 'lucide-react';
import { useApp } from '../contexts/AppContext';

export function PageHeader({ eyebrow, title, description, actions }) {
  return <header className="page-header">
    <div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1>{description && <p>{description}</p>}</div>
    {actions && <div className="page-actions">{actions}</div>}
  </header>;
}

export function EmptyState({ icon: Icon = Inbox, title, description, action }) {
  return <div className="empty-state"><span className="empty-icon"><Icon size={28} /></span><h3>{title}</h3><p>{description}</p>{action}</div>;
}

export function LoadingState({ label = 'Loading your workspace' }) {
  return <div className="loading-state"><LoaderCircle className="spin" /><span>{label}</span></div>;
}

export function Toasts() {
  const { toasts } = useApp();
  return <div className="toast-stack" aria-live="polite">{toasts.map((toast) => <div className={`toast ${toast.tone}`} key={toast.id}>
    {toast.tone === 'error' ? <AlertCircle /> : <CheckCircle2 />}<span>{toast.message}</span>
  </div>)}</div>;
}

export function Modal({ title, description, children, onClose, wide = false }) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <header className="modal-header"><div><h2 id="modal-title">{title}</h2>{description && <p>{description}</p>}</div><button className="icon-button" onClick={onClose} aria-label="Close dialog"><X /></button></header>
      {children}
    </section>
  </div>;
}

export function ConfirmDialog({ title, description, confirmLabel = 'Delete', onConfirm, onCancel }) {
  return <Modal title={title} description={description} onClose={onCancel}>
    <div className="modal-actions"><button className="button secondary" onClick={onCancel}>Cancel</button><button className="button danger" onClick={onConfirm}>{confirmLabel}</button></div>
  </Modal>;
}
