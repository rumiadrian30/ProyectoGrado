// Backend/utils/emailService.js

const nodemailer = require('nodemailer');

const {
  escapeHtml,
  pill,
  infoRow,
  alertBox,
  actionButton,
  baseTemplate,
} = require('../templates/emailTemplate');

const log = (msg) => {
  console.log(`  \x1b[34m[EMAIL]\x1b[0m ${msg}`);
};

const APP_NAME = process.env.APP_NAME || 'Explorador 3D FIE';
const APP_URL = process.env.APP_URL || 'http://localhost:5173';

let _transporter = null;

function getTransporter() {
  if (_transporter) {
    return _transporter;
  }

  if (
    !process.env.SMTP_HOST ||
    !process.env.SMTP_USER ||
    !process.env.SMTP_PASS
  ) {
    log(
      'SMTP no configurado. Las notificaciones por correo están desactivadas.'
    );

    return null;
  }

  _transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',

    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },

    tls: {
      rejectUnauthorized: false,
    },
  });

  return _transporter;
}

async function sendMail({
  to,
  subject,
  html,
  text,
}) {
  const transporter = getTransporter();

  if (!transporter) {
    return;
  }

  const from =
    process.env.SMTP_FROM ||
    `"${APP_NAME}" <${process.env.SMTP_USER}>`;

  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      html,
      text,
    });

    log(`Enviado a ${to} — ${subject} (${info.messageId})`);
  } catch (err) {
    log(`Error al enviar a ${to}: ${err.message}`);
  }
}

function formatDate() {
  return new Date().toLocaleString('es-EC', {
    timeZone: 'America/Guayaquil',
    dateStyle: 'long',
    timeStyle: 'short',
  });
}

function renderTemplate(content) {
  return baseTemplate({
    appName: APP_NAME,
    content,
  });
}

async function notifyPasswordReset({
  targetUser,
  changedBy,
  ip,
}) {
  const date = formatDate();

  const subject =
    `[${APP_NAME}] Tu contraseña ha sido restablecida`;

  const html = renderTemplate(`
    <p
      style="
        margin:0 0 7px;
        color:#BC0613;
        font-size:11px;
        font-weight:700;
        line-height:1.4;
        letter-spacing:0.12em;
        text-transform:uppercase;
      "
    >
      Seguridad de la cuenta
    </p>

    <h1
      style="
        margin:0 0 12px;
        color:#111827;
        font-size:24px;
        font-weight:700;
        line-height:1.3;
      "
    >
      Contraseña restablecida
    </h1>

    <p
      style="
        margin:0 0 28px;
        color:#5F6875;
        font-size:14px;
        line-height:1.75;
      "
    >
      La contraseña de tu cuenta de administración fue cambiada
      por un superadministrador.
    </p>

    <table
      role="presentation"
      width="100%"
      cellpadding="0"
      cellspacing="0"
      border="0"
      style="
        width:100%;
        margin:0 0 25px;
        border-collapse:collapse;
      "
    >
      ${infoRow('Tu cuenta', targetUser.email)}
      ${infoRow('Modificado por', changedBy.email)}
      ${infoRow('Fecha y hora', date)}
    </table>

    ${alertBox(`
      <strong>Si no reconoces esta acción</strong>, contacta
      inmediatamente al administrador del sistema.
    `)}
  `);

  const text = [
    'Contraseña restablecida',
    '',
    `La contraseña de la cuenta ${targetUser.email} fue restablecida.`,
    `Modificado por: ${changedBy.email}`,
    `Fecha y hora: ${date}`,
  ].join('\n');

  await sendMail({
    to: targetUser.email,
    subject,
    html,
    text,
  });
}

async function notifyAccountDeactivated({
  targetUser,
  changedBy,
  ip,
}) {
  const date = formatDate();

  const subject =
    `[${APP_NAME}] Tu cuenta ha sido desactivada`;

  const html = renderTemplate(`
    <p
      style="
        margin:0 0 7px;
        color:#BC0613;
        font-size:11px;
        font-weight:700;
        line-height:1.4;
        letter-spacing:0.12em;
        text-transform:uppercase;
      "
    >
      Estado de la cuenta
    </p>

    <h1
      style="
        margin:0 0 12px;
        color:#111827;
        font-size:24px;
        font-weight:700;
        line-height:1.3;
      "
    >
      Cuenta desactivada
    </h1>

    <p
      style="
        margin:0 0 28px;
        color:#5F6875;
        font-size:14px;
        line-height:1.75;
      "
    >
      Tu cuenta de administración fue
      <strong>desactivada</strong>.
    </p>

    <table
      role="presentation"
      width="100%"
      cellpadding="0"
      cellspacing="0"
      border="0"
      style="
        width:100%;
        margin:0 0 25px;
        border-collapse:collapse;
      "
    >
      ${infoRow('Tu cuenta', targetUser.email)}

      ${infoRow(
        'Estado',
        pill('Inactiva', '#6B7280'),
        true
      )}

      ${infoRow('Desactivada por', changedBy.email)}
      ${infoRow('Fecha y hora', date)}
    </table>
  `);

  const text = [
    'Cuenta desactivada',
    '',
    `La cuenta ${targetUser.email} fue desactivada.`,
    `Desactivada por: ${changedBy.email}`,
    `Fecha y hora: ${date}`,
  ].join('\n');

  await sendMail({
    to: targetUser.email,
    subject,
    html,
    text,
  });
}

async function notifyAccountActivated({
  targetUser,
  changedBy,
  ip,
}) {
  const date = formatDate();

  const subject =
    `[${APP_NAME}] Tu cuenta ha sido reactivada`;

  const html = renderTemplate(`
    <p
      style="
        margin:0 0 7px;
        color:#16803A;
        font-size:11px;
        font-weight:700;
        line-height:1.4;
        letter-spacing:0.12em;
        text-transform:uppercase;
      "
    >
      Acceso restaurado
    </p>

    <h1
      style="
        margin:0 0 12px;
        color:#111827;
        font-size:24px;
        font-weight:700;
        line-height:1.3;
      "
    >
      Cuenta reactivada
    </h1>

    <p
      style="
        margin:0 0 28px;
        color:#5F6875;
        font-size:14px;
        line-height:1.75;
      "
    >
      Tu cuenta fue reactivada correctamente.
    </p>

    <table
      role="presentation"
      width="100%"
      cellpadding="0"
      cellspacing="0"
      border="0"
      style="
        width:100%;
        margin:0 0 28px;
        border-collapse:collapse;
      "
    >
      ${infoRow('Tu cuenta', targetUser.email)}

      ${infoRow(
        'Estado',
        pill('Activa', '#16803A'),
        true
      )}

      ${infoRow('Reactivada por', changedBy.email)}
      ${infoRow('Fecha y hora', date)}
    </table>

    ${actionButton('Ingresar al sistema', APP_URL)}
  `);

  const text = [
    'Cuenta reactivada',
    '',
    `La cuenta ${targetUser.email} fue reactivada.`,
    `Reactivada por: ${changedBy.email}`,
    `Fecha y hora: ${date}`,
    '',
    `Puedes iniciar sesión en: ${APP_URL}`,
  ].join('\n');

  await sendMail({
    to: targetUser.email,
    subject,
    html,
    text,
  });
}

async function notifyAccountDeleted({
  targetUser,
  changedBy,
  ip,
}) {
  const date = formatDate();

  const subject =
    `[${APP_NAME}] Tu cuenta ha sido eliminada`;

  const html = renderTemplate(`
    <p
      style="
        margin:0 0 7px;
        color:#BC0613;
        font-size:11px;
        font-weight:700;
        line-height:1.4;
        letter-spacing:0.12em;
        text-transform:uppercase;
      "
    >
      Eliminación de cuenta
    </p>

    <h1
      style="
        margin:0 0 12px;
        color:#111827;
        font-size:24px;
        font-weight:700;
        line-height:1.3;
      "
    >
      Cuenta eliminada
    </h1>

    <p
      style="
        margin:0 0 28px;
        color:#5F6875;
        font-size:14px;
        line-height:1.75;
      "
    >
      Tu cuenta de administración fue
      <strong>eliminada permanentemente</strong>.
    </p>

    <table
      role="presentation"
      width="100%"
      cellpadding="0"
      cellspacing="0"
      border="0"
      style="
        width:100%;
        margin:0 0 25px;
        border-collapse:collapse;
      "
    >
      ${infoRow('Cuenta', targetUser.email)}
      ${infoRow('Nombre', targetUser.full_name || '—')}
      ${infoRow('Eliminada por', changedBy.email)}
      ${infoRow('Fecha y hora', date)}
    </table>

    ${alertBox(`
      Si consideras que la eliminación fue realizada por error,
      contacta inmediatamente al responsable del sistema.
    `)}
  `);

  const text = [
    'Cuenta eliminada',
    '',
    `La cuenta ${targetUser.email} fue eliminada.`,
    `Nombre: ${targetUser.full_name || '—'}`,
    `Eliminada por: ${changedBy.email}`,
    `Fecha y hora: ${date}`,
  ].join('\n');

  await sendMail({
    to: targetUser.email,
    subject,
    html,
    text,
  });
}

module.exports = {
  notifyPasswordReset,
  notifyAccountDeactivated,
  notifyAccountActivated,
  notifyAccountDeleted,
};