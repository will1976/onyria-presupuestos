import { Modal } from './Modal'
import { Button } from './index'

export function ConfirmDialog({ title, message, onConfirm, onCancel, confirmLabel = 'Confirmar', danger = false }) {
  return (
    <Modal title={title} onClose={onCancel} width={420}>
      <p style={{ color: '#7A7885', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>{message}</p>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <Button variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm}
          style={danger ? { background: '#EF444415', borderColor: '#EF4444' } : {}}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}
