import { useState, useEffect } from 'react'
import { parseSchedule, scheduleToString, scheduleToJSON } from '../utils/scheduleUtils'

const DAYS = [
  { key: 'L', label: 'L' },
  { key: 'M', label: 'M' },
  { key: 'X', label: 'X' },
  { key: 'J', label: 'J' },
  { key: 'V', label: 'V' },
  { key: 'S', label: 'S' },
  { key: 'D', label: 'D' },
]

function timeToMins(t) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

const PRESETS = [
  { label: 'Lun–Vie',  days: ['L','M','X','J','V'] },
  { label: 'Lun–Sáb',  days: ['L','M','X','J','V','S'] },
  { label: 'Todos',    days: ['L','M','X','J','V','S','D'] },
]

function initBlock(raw) {
  const parsed = parseSchedule(raw)
  return parsed ?? { days: ['L','M','X','J','V'], start: '07:00', end: '21:00' }
}

/**
 * SchedulePicker
 * Props:
 *   value    {string}  — JSON string almacenado en BD
 *   onChange {fn}      — callback(newJSONString | null)
 */
export default function SchedulePicker({ value, onChange }) {
  const [block,     setBlock]     = useState(() => initBlock(value))
  const [enabled,   setEnabled]   = useState(() => !!parseSchedule(value))
  const [timeError, setTimeError] = useState('')

  useEffect(() => {
    onChange(enabled ? scheduleToJSON(block) : null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [block, enabled])

  function toggleDay(key) {
    setBlock(b => ({
      ...b,
      days: b.days.includes(key)
        ? b.days.filter(d => d !== key)
        : [...b.days, key],
    }))
  }

  return (
    <div className="form-group">
      {/* Label + toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
        <label className="form-label" style={{ margin: 0 }}>Horario</label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '12px', color: 'var(--muted)' }}>
          <span>{enabled ? 'Definido' : 'Sin horario'}</span>
          <div onClick={() => setEnabled(e => !e)} style={{
            width: 36, height: 20, borderRadius: 10,
            background: enabled ? 'var(--primary, #BC0613)' : '#d1d5db',
            position: 'relative', cursor: 'pointer', transition: 'background .2s',
          }}>
            <div style={{
              position: 'absolute', top: 3,
              left: enabled ? 19 : 3,
              width: 14, height: 14, borderRadius: '50%',
              background: '#fff', transition: 'left .2s',
              boxShadow: '0 1px 3px rgba(0,0,0,.2)',
            }}/>
          </div>
        </label>
      </div>

      {enabled ? (
        <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>

          {/* Días */}
          <div style={{ padding: '0.6rem 0.75rem', borderBottom: '1px solid var(--border-soft, #f0f0f0)', background: 'var(--bg-soft, #f9fafb)' }}>
            <p style={{ fontSize: '11px', color: 'var(--muted)', margin: '0 0 6px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Días</p>

            <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
              {DAYS.map(d => {
                const active = block.days.includes(d.key)
                return (
                  <button key={d.key} type="button" onClick={() => toggleDay(d.key)} style={{
                    flex: 1, padding: '5px 0', fontSize: '12px', fontWeight: 700,
                    borderRadius: 6, border: '1.5px solid', cursor: 'pointer', transition: 'all .15s',
                    background:  active ? 'var(--primary, #BC0613)' : '#fff',
                    color:       active ? '#fff' : 'var(--muted)',
                    borderColor: active ? 'var(--primary, #BC0613)' : 'var(--border)',
                  }}>{d.label}</button>
                )
              })}
            </div>

            {/* Presets rápidos */}
            <div style={{ display: 'flex', gap: 4 }}>
              {PRESETS.map(p => (
                <button key={p.label} type="button"
                  onClick={() => setBlock(b => ({ ...b, days: p.days }))}
                  style={{
                    padding: '2px 10px', fontSize: '11px', fontWeight: 500,
                    borderRadius: 4, border: '1px solid var(--border)',
                    background: 'transparent', color: 'var(--muted)', cursor: 'pointer',
                  }}>{p.label}</button>
              ))}
              <button type="button"
                onClick={() => setBlock(b => ({ ...b, days: [] }))}
                style={{
                  padding: '2px 10px', fontSize: '11px', fontWeight: 500,
                  borderRadius: 4, border: '1px solid var(--border)',
                  background: 'transparent', color: 'var(--muted)', cursor: 'pointer',
                }}>Limpiar</button>
            </div>
          </div>

          {/* Rango de horas */}
          <div style={{ padding: '0.6rem 0.75rem', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '11px', color: 'var(--muted)', display: 'block', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Desde</label>
              <input
                type="time"
                value={block.start}
                onChange={e => {
                  const newStart = e.target.value
                  setTimeError('')
                  setBlock(b => ({
                    ...b,
                    start: newStart,
                    // Si end <= nuevo start, adelantar end 1 hora
                    end: timeToMins(b.end) <= timeToMins(newStart)
                      ? `${String(Math.min(timeToMins(newStart) / 60 + 1, 23)).padStart(2,'0')}:00`
                      : b.end,
                  }))
                }}
                style={{
                  width: '100%', padding: '6px 8px',
                  border: '1px solid var(--border)', borderRadius: 6,
                  fontSize: '14px', fontWeight: 600,
                  background: '#fff', color: 'var(--text)',
                }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '11px', color: 'var(--muted)', display: 'block', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Hasta</label>
              <input
                type="time"
                value={block.end}
                min={block.start}
                onChange={e => {
                  const newEnd = e.target.value
                  if (timeToMins(newEnd) <= timeToMins(block.start)) {
                    setTimeError(`La hora de cierre (${newEnd}) debe ser posterior a la de apertura (${block.start}).`)
                    return
                  }
                  setTimeError('')
                  setBlock(b => ({ ...b, end: newEnd }))
                }}
                style={{
                  width: '100%', padding: '6px 8px',
                  border: `1px solid ${timeToMins(block.end) <= timeToMins(block.start) ? '#dc2626' : 'var(--border)'}`,
                  borderRadius: 6, fontSize: '14px', fontWeight: 600,
                  background: '#fff', color: 'var(--text)',
                }}
              />
            </div>
          </div>

          {/* Error de validación de horas */}
          {timeError && (
            <div style={{
              margin: '0 0.75rem',
              padding: '0.45rem 0.65rem',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: 6,
              fontSize: '12px',
              color: '#b91c1c',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}>
              <span>⚠️</span> {timeError}
            </div>
          )}

          {/* Preview */}
          <div style={{
            padding: '0.45rem 0.75rem',
            background: block.days.length ? 'var(--primary-50, #fff1f2)' : 'var(--bg-soft)',
            borderTop: '1px solid var(--border-soft, #f0f0f0)',
            fontSize: '12px', fontWeight: 600,
            color: block.days.length ? 'var(--primary, #BC0613)' : 'var(--muted)',
          }}>
            {block.days.length ? `🕐 ${scheduleToString(block)}` : 'Selecciona al menos un día'}
          </div>
        </div>
      ) : (
        <div style={{
          padding: '0.6rem 0.75rem', border: '1px dashed var(--border)',
          borderRadius: 8, fontSize: '13px', color: 'var(--muted)', textAlign: 'center',
        }}>
          Sin horario — activa el toggle para definirlo
        </div>
      )}
    </div>
  )
}