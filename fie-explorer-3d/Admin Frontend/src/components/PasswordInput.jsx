import { useState } from 'react'

const RULES = [
  { id:'length',    test: p => p.length >= 8,                label:'Mínimo 8 caracteres'   },
  { id:'uppercase', test: p => /[A-Z]/.test(p),              label:'Una mayúscula (A-Z)'   },
  { id:'lowercase', test: p => /[a-z]/.test(p),              label:'Una minúscula (a-z)'   },
  { id:'number',    test: p => /[0-9]/.test(p),              label:'Un número (0-9)'       },
  { id:'symbol',    test: p => /[^A-Za-z0-9]/.test(p),       label:'Un símbolo (!@#$...)' },
  { id:'nospace',   test: p => p.length > 0 && !/\s/.test(p), label:'Sin espacios'         },
]

export function isPasswordValid(pwd) {
  return RULES.every(r => r.test(pwd))
}

export default function PasswordInput({ value, onChange, label = 'Contraseña', autocomplete = 'new-password' }) {
  const [show, setShow] = useState(false)

  const score    = value ? RULES.filter(r => r.test(value)).length : 0
  const pct      = Math.round((score / RULES.length) * 100)
  const color    = score <= 2 ? '#dc2626' : score <= 4 ? '#d97706' : '#16a34a'
  const strength = score <= 2 ? 'Débil' : score <= 4 ? 'Regular' : 'Segura ✓'

  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <div style={{ position:'relative' }}>
        <input
          type={show ? 'text' : 'password'}
          name="password"
          className="form-input"
          style={{ paddingRight:'36px' }}
          value={value}
          onChange={e => onChange(e.target.value)}
          autoComplete={autocomplete}
        />
        <button type="button" onClick={() => setShow(s => !s)}
          style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)',
            background:'none', border:'none', cursor:'pointer', fontSize:'14px', padding:'2px' }}>
          {show ? '🙈' : '👁️'}
        </button>
      </div>

      {value.length > 0 && (
        <div style={{ marginTop:'7px' }}>
          <div style={{ display:'flex', justifyContent:'space-between',
            fontSize:'10px', marginBottom:'3px', color:'var(--muted)' }}>
            <span>Fortaleza de contraseña</span>
            <span style={{ color, fontWeight:600 }}>{strength}</span>
          </div>
          <div style={{ height:4, background:'#f1f5f9', borderRadius:9999, overflow:'hidden', marginBottom:'6px' }}>
            <div style={{
              height:'100%', borderRadius:9999,
              width:`${pct}%`, background:color,
              transition:'width .2s, background .2s',
            }}/>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'2px' }}>
            {RULES.map(r => {
              const ok = r.test(value)
              return (
                <div key={r.id} style={{
                  display:'flex', alignItems:'center', gap:'4px',
                  fontSize:'10px', color: ok ? '#15803d' : '#9ca3af',
                }}>
                  <span style={{ fontWeight:700 }}>{ok ? '✓' : '○'}</span>
                  <span>{r.label}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
