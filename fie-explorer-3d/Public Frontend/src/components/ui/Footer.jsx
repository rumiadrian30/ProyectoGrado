import { Link } from 'react-router-dom';

function Arrow() {
  return (
    <svg
      width="9"
      height="9"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}

function PrimaryBtnWhite({ to, children }) {
  return (
    <Link to={to} className="primary-btn-white">
      {children}
    </Link>
  );
}

/* ─── Datos de navegación ──────────────────────────────────────────────────── */
const NAV = [
  {
    heading: 'Navegación',
    links: [
      { label: 'Inicio', href: '/' },
      { label: 'Explorar campus', href: '/explorar' },
      { label: 'Edificios', href: '/directorio' },
      { label: 'Laboratorios', href: '/directorio' },
    ],
  },
  {
    heading: 'Institución',
    links: [
      { label: 'ESPOCH', href: 'https://www.espoch.edu.ec', ext: true },
      { label: 'FIE', href: 'https://fie.espoch.edu.ec', ext: true },
      { label: 'Aula Virtual', href: 'https://elearning.espoch.edu.ec', ext: true },
      { label: 'Balcón de Servicios', href: 'https://servicios.espoch.edu.ec/ServicioEspoch/academico.jsp', ext: true },
    ],
  },
  {
    heading: 'Proyecto',
    links: [
      { label: 'Tecnología usada', href: '/acerca-de' },
      { label: 'Documentación', href: '/ayuda' },
    ],
  },
];

/* ─── Componente exportable ────────────────────────────────────────────────── */
export default function Footer() {
  return (
    <footer style={{ background: '#BC0613', color: '#fff', fontFamily: "'Outfit',sans-serif" }}>
      {/* CTA Banner */}
      <section
        style={{
          borderTop: '1px solid rgba(255,255,255,.12)',
          background: '#BC0613',
          padding: '5rem 5vw',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: '-80px',
            right: '-60px',
            width: 300,
            height: 300,
            borderRadius: '50%',
            background: 'rgba(255,255,255,.05)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div
            className="ab-cta-inner"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '2.5rem',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ flex: 1, maxWidth: 520 }}>
              <p
                style={{
                  fontSize: '.68rem',
                  fontWeight: 700,
                  letterSpacing: '.15em',
                  textTransform: 'uppercase',
                  color: 'rgba(255,255,255,.55)',
                  marginBottom: '.6rem',
                }}
              >
                ¿Todo listo?
              </p>

              <h2
                style={{
                  fontWeight: 800,
                  fontSize: 'clamp(1.6rem, 3.5vw, 2.8rem)',
                  letterSpacing: '-.025em',
                  color: '#fff',
                  lineHeight: 1.08,
                  margin: '0 0 .75rem',
                }}
              >
                Comienza a explorar
                <br />
                <span
                  style={{
                    color: 'rgba(255,255,255,.65)',
                    fontWeight: 300,
                  }}
                >
                  los edificios de la FIE
                </span>
              </h2>
            </div>

            <div
              style={{
                display: 'flex',
                gap: '.85rem',
                flexWrap: 'wrap',
                flexShrink: 0,
              }}
            >
              <Link
                to="/explorar"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '.45rem',
                  padding: '.85rem 1.9rem',
                  background: '#fff',
                  border: '1.5px solid rgba(255,255,255,.4)',
                  color: '#BC0613',
                  textDecoration: 'none',
                  fontWeight: 800,
                  fontSize: '.88rem',
                  letterSpacing: '.02em',
                  transition: 'transform .2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                Explorar 3D
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12h14" />
                  <path d="M13 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Línea divisoria */}
      <div
        style={{
          width: '100%',
          height: 1,
          background: 'rgba(255,255,255,.10)',
        }}
      />

      {/* Cuerpo principal */}
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '4rem 5vw 3rem' }}>
        <div
          className="footer-cols"
          style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr 1fr 1fr',
            gap: '3rem',
          }}
        >
          <div className="footer-brand-col">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.75rem' }}>
              <span style={{ fontWeight: 800, fontSize: '1.35rem', letterSpacing: '-.025em', lineHeight: 1 }}>
                FIE Explorer 3D
              </span>

              <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
                <span className="footer-badge">
                  <span
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: '50%',
                      background: 'rgba(255,255,255,.8)',
                      display: 'block',
                    }}
                  />
                  ESPOCH
                </span>
                <span className="footer-badge">WebGL</span>
                <span className="footer-badge">Three.js</span>
              </div>
            </div>

            <p
              style={{
                fontSize: '.86rem',
                fontWeight: 300,
                lineHeight: 1.75,
                color: 'rgba(255,255,255,.6)',
                maxWidth: '34ch',
                margin: '0 0 2rem',
              }}
            >
              Plataforma de orientación espacial 3D para el campus de la Facultad de Informática y Electrónica — ESPOCH.
            </p>
          </div>

          {NAV.map(col => (
            <div key={col.heading}>
              <p
                style={{
                  fontSize: '.62rem',
                  fontWeight: 700,
                  letterSpacing: '.16em',
                  textTransform: 'uppercase',
                  color: 'rgba(255,255,255,.4)',
                  marginBottom: '1.25rem',
                }}
              >
                {col.heading}
              </p>

              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '.65rem' }}>
                {col.links.map(l => (
                  <li key={l.label}>
                    {l.ext ? (
                      <a href={l.href} target="_blank" rel="noreferrer" className="footer-link">
                        {l.label}
                        <Arrow />
                      </a>
                    ) : (
                      <Link to={l.href} className="footer-link">
                        {l.label}
                        <Arrow />
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div style={{ borderTop: '1px solid rgba(255,255,255,.12)' }} />

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '1.25rem 5vw' }}>
        <div
          className="footer-bottom"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1.5rem',
          }}
        >
          <p style={{ fontSize: '.76rem', fontWeight: 300, color: 'rgba(255,255,255,.45)', margin: 0 }}>
            © {new Date().getFullYear()} · Escuela Superior Politécnica de Chimborazo
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '.65rem', flexShrink: 0 }}>
            <span style={{ width: 1, height: 14, background: 'rgba(255,255,255,.2)', display: 'block' }} />
            <span style={{ fontSize: '.72rem', fontWeight: 600, color: 'rgba(255,255,255,.5)', letterSpacing: '.04em' }}>
              Grefa Rivadeneyra Rumi Adrian
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}