/**
 * scheduleUtils.js
 */

const DAY_LABELS = { L:'Lun', M:'Mar', X:'Mié', J:'Jue', V:'Vie', S:'Sáb', D:'Dom' }
const DAY_ORDER  = ['L','M','X','J','V','S','D']

// Mapeo JS getDay() (0=Dom) → clave interna
const JS_DAY_MAP = { 0:'D', 1:'L', 2:'M', 3:'X', 4:'J', 5:'V', 6:'S' }

/** Parsea el string almacenado → objeto {days, start, end} o null */
export function parseSchedule(raw) {
  if (!raw) return null
  try {
    const obj = JSON.parse(raw)
    if (obj?.days && obj?.start && obj?.end) return obj
    return null
  } catch {
    return null  // texto libre legacy — no parseable
  }
}

/** Convierte objeto → string legible: "Lun-Vie 07:00–21:00" */
export function scheduleToString(obj) {
  if (!obj?.days?.length) return ''

  const sorted = obj.days.slice().sort(
    (a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b)
  )

  // Colapsar rangos consecutivos
  const runs = []
  let run = [sorted[0]]
  for (let i = 1; i < sorted.length; i++) {
    if (DAY_ORDER.indexOf(sorted[i]) === DAY_ORDER.indexOf(sorted[i-1]) + 1) {
      run.push(sorted[i])
    } else {
      runs.push(run); run = [sorted[i]]
    }
  }
  runs.push(run)

  const daysStr = runs.map(r =>
    r.length >= 3
      ? `${DAY_LABELS[r[0]]}-${DAY_LABELS[r[r.length-1]]}`
      : r.map(d => DAY_LABELS[d]).join(', ')
  ).join(', ')

  return `${daysStr} ${obj.start}–${obj.end}`
}

/** Devuelve true si el espacio está abierto en este momento */
export function isOpenNow(raw) {
  const obj = parseSchedule(raw)
  if (!obj?.days?.length) return null  // null = sin horario definido

  const now     = new Date()
  const dayKey  = JS_DAY_MAP[now.getDay()]
  if (!obj.days.includes(dayKey)) return false

  const [sh, sm] = obj.start.split(':').map(Number)
  const [eh, em] = obj.end.split(':').map(Number)
  const nowMins  = now.getHours() * 60 + now.getMinutes()
  const startMin = sh * 60 + sm
  const endMin   = eh * 60 + em

  return nowMins >= startMin && nowMins < endMin
}

/** Serializa objeto → JSON string para guardar en BD */
export function scheduleToJSON(obj) {
  if (!obj?.days?.length) return null
  return JSON.stringify({ days: obj.days, start: obj.start, end: obj.end })
}
