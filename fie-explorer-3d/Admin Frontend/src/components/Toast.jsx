export default function Toast({ message, type = 'success', onClose }) {
  const bg =
    type === 'error'
      ? '#dc2626'
      : type === 'warning'
      ? '#d97706'
      : '#16a34a'

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 9999,
        background: bg,
        color: '#fff',
        padding: '14px 18px',
        borderRadius: '12px',
        minWidth: '280px',
        boxShadow: '0 10px 25px rgba(0,0,0,.18)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        animation: 'toastIn .25s ease',
      }}
    >
      <span style={{ fontSize: '14px' }}>
        {message}
      </span>

      <button
        onClick={onClose}
        style={{
          background: 'transparent',
          border: 'none',
          color: '#fff',
          cursor: 'pointer',
          fontSize: '16px',
        }}
      >
        ✕
      </button>
    </div>
  )
}