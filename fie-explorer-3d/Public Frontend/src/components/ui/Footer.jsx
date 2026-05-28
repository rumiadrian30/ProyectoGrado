import { useEffect } from 'react';
import { Link } from 'react-router-dom';

/* ─── Estilos ──────────────────────────────────────────────────────────────── */
const FOOTER_CSS = `
  .footer-link {
    display: inline-flex;
    align-items: center;
    gap: .35rem;
    font-family: 'Outfit', sans-serif;
    font-size: .82rem;
    font-weight: 500;
    color: rgba(255,255,255,.6);
    text-decoration: none;
    transition: color .2s cubic-bezier(.16,1,.3,1), gap .2s cubic-bezier(.16,1,.3,1);
    letter-spacing: .01em;
  }
  .footer-link:hover { color: #fff; gap: .55rem; }
  .footer-link svg {
    opacity: 0;
    transform: translateX(-4px);
    transition: opacity .2s, transform .2s cubic-bezier(.16,1,.3,1);
  }
  .footer-link:hover svg { opacity: 1; transform: translateX(0); }

  .footer-badge {
    display: inline-flex;
    align-items: center;
    gap: .45rem;
    padding: .3rem .75rem;
    background: rgba(255,255,255,.1);
    border: 1px solid rgba(255,255,255,.18);
    font-family: 'Outfit', sans-serif;
    font-size: .65rem;
    font-weight: 700;
    color: rgba(255,255,255,.7);
    letter-spacing: .12em;
    text-transform: uppercase;
  }

  @media (max-width: 767px) {
    .footer-cols      { grid-template-columns: 1fr 1fr !important; }
    .footer-brand-col { grid-column: span 2 !important; }
    .footer-bottom    { flex-direction: column; align-items: flex-start !important; gap: 1rem !important; }
  }
  @media (max-width: 480px) {
    .footer-cols      { grid-template-columns: 1fr !important; }
    .footer-brand-col { grid-column: span 1 !important; }
  }
`;

function InjectCSS() {
  useEffect(() => {
    const id = 'fie-footer-css';
    if (document.getElementById(id)) return;
    const el = Object.assign(document.createElement('style'), { id, textContent: FOOTER_CSS });
    document.head.appendChild(el);
    return () => el.remove();
  }, []);
  return null;
}

function Arrow() {
  return (
    <svg width="9" height="9" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M5 12h14M12 5l7 7-7 7"/>
    </svg>
  );
}

/* ─── Datos de navegación ──────────────────────────────────────────────────── */
const NAV = [
    {
    heading: 'Navegación',
    links: [
        { label: 'Inicio',       href: '/' },
        { label: 'Explorar campus', href: '/explorar' },
        { label: 'Edificios',    href: '/directorio' },
        { label: 'Laboratorios', href: '/directorio' },
        ],
    },
    {
    heading: 'Institución',
    links: [
        { label: 'ESPOCH',             href: 'https://www.espoch.edu.ec', ext: true },
        { label: 'FIE',                href: 'https://fie.espoch.edu.ec', ext: true },
        { label: 'Aula Virtual',       href: 'https://elearning.espoch.edu.ec', ext: true },
        { label: 'Balcón de Servicios',   href: 'https://servicios.espoch.edu.ec/ServicioEspoch/academico.jsp', ext: true },
     ],
    },
    {
    heading: 'Proyecto',
    links: [
        { label: 'Tecnología usada',   href: '/acerca-de' },
        { label: 'Documentación',      href: '/ayuda' },
        ],
    },
];

/* ─── Componente exportable ────────────────────────────────────────────────── */
export default function Footer() {
  return (
    <footer style={{ background: '#BC0613', color: '#fff', fontFamily: "'Outfit',sans-serif" }}>
      <InjectCSS />

      {/* Cuerpo principal */}
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '4rem 5vw 3rem' }}>
        <div className="footer-cols" style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr 1fr 1fr',
          gap: '3rem',
        }}>

          {/* Columna brand */}
          <div className="footer-brand-col">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.75rem' }}>
              <span style={{ fontWeight: 800, fontSize: '1.35rem', letterSpacing: '-.025em', lineHeight: 1 }}>
                FIE Explorer 3D
              </span>
              <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
                <span className="footer-badge">
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(255,255,255,.8)', display: 'block' }}/>
                  ESPOCH
                </span>
                <span className="footer-badge">WebGL</span>
                <span className="footer-badge">Three.js</span>
              </div>
            </div>

            <p style={{ fontSize: '.86rem', fontWeight: 300, lineHeight: 1.75, color: 'rgba(255,255,255,.6)', maxWidth: '34ch', margin: '0 0 2rem' }}>
              Plataforma de orientación espacial 3D para el campus de la
              Facultad de Informática y Electrónica — ESPOCH.
            </p>
          </div>

          {/* Columnas de links */}
          {NAV.map(col => (
            <div key={col.heading}>
              <p style={{ fontSize: '.62rem', fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,.4)', marginBottom: '1.25rem' }}>
                {col.heading}
              </p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '.65rem' }}>
                {col.links.map(l => (
                  <li key={l.label}>
                    {l.ext
                      ? <a href={l.href} target="_blank" rel="noreferrer" className="footer-link">{l.label}<Arrow/></a>
                      : <Link to={l.href} className="footer-link">{l.label}<Arrow/></Link>
                    }
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Divisor */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,.12)' }}/>

      {/* Bottom bar */}
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '1.25rem 5vw' }}>
        <div className="footer-bottom" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1.5rem' }}>
          <p style={{ fontSize: '.76rem', fontWeight: 300, color: 'rgba(255,255,255,.45)', margin: 0 }}>
            © {new Date().getFullYear()} · Escuela Superior Politécnica de Chimborazo
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.65rem', flexShrink: 0 }}>
            <span style={{ width: 1, height: 14, background: 'rgba(255,255,255,.2)', display: 'block' }}/>
            <span style={{ fontSize: '.72rem', fontWeight: 600, color: 'rgba(255,255,255,.5)', letterSpacing: '.04em' }}>Grefa Rivadeneyra Rumi Adrian</span>
          </div>
        </div>
      </div>
    </footer>
  );
}