export default function Toast({ message, type = 'success', onClose }) {
  return (
    <div className={`toast toast-${type}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
      <span>{message}</span>
      {onClose && (
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '16px',
            lineHeight: 1,
            padding: '0 2px',
            opacity: 0.8,
          }}
        >
          ✕
        </button>
      )}
    </div>
  )
}