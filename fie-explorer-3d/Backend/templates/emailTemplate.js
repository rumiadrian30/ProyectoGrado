// Backend/templates/emailTemplate.js

function escapeHtml(value) {
  if (value === null || value === undefined) {
    return '—';
  }

  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function pill(text, color = '#BC0613') {
  return `
    <span
      style="
        display:inline-block;
        padding:5px 12px;
        border-radius:999px;
        background-color:${color}18;
        color:${color};
        border:1px solid ${color}35;
        font-family:Arial,sans-serif;
        font-size:11px;
        font-weight:700;
        line-height:1.2;
        letter-spacing:0.08em;
        text-transform:uppercase;
      "
    >
      ${escapeHtml(text)}
    </span>
  `;
}

function infoRow(label, value, isHtml = false) {
  const renderedValue = isHtml ? value : escapeHtml(value);

  return `
    <tr>
      <td
        valign="top"
        style="
          width:38%;
          padding:13px 12px 13px 0;
          border-bottom:1px solid #E5E7EB;
          color:#6B7280;
          font-family:Arial,sans-serif;
          font-size:12px;
          line-height:1.5;
        "
      >
        ${escapeHtml(label)}
      </td>

      <td
        valign="top"
        style="
          padding:13px 0 13px 12px;
          border-bottom:1px solid #E5E7EB;
          color:#111827;
          font-family:Arial,sans-serif;
          font-size:13px;
          font-weight:700;
          line-height:1.5;
          word-break:break-word;
        "
      >
        ${renderedValue}
      </td>
    </tr>
  `;
}

function alertBox(content) {
  return `
    <table
      role="presentation"
      width="100%"
      cellpadding="0"
      cellspacing="0"
      border="0"
      style="
        width:100%;
        margin:0 0 24px;
        border-collapse:separate;
        border-spacing:0;
        background-color:#FFF7F7;
        border:1px solid #FECACA;
        border-radius:10px;
      "
    >
      <tr>
        <td
          width="5"
          style="
            width:5px;
            background-color:#BC0613;
            border-radius:10px 0 0 10px;
            font-size:0;
            line-height:0;
          "
        >
          &nbsp;
        </td>

        <td style="padding:16px 18px;">
          <p
            style="
              margin:0;
              color:#991B1B;
              font-family:Arial,sans-serif;
              font-size:13px;
              line-height:1.7;
            "
          >
            ${content}
          </p>
        </td>
      </tr>
    </table>
  `;
}

function actionButton(text, url) {
  return `
    <table
      role="presentation"
      cellpadding="0"
      cellspacing="0"
      border="0"
      style="margin:0;"
    >
      <tr>
        <td
          align="center"
          bgcolor="#BC0613"
          style="
            background-color:#BC0613;
            border-radius:8px;
          "
        >
          <a
            href="${escapeHtml(url)}"
            target="_blank"
            style="
              display:inline-block;
              padding:13px 24px;
              color:#FFFFFF;
              font-family:Arial,sans-serif;
              font-size:13px;
              font-weight:700;
              line-height:1;
              text-decoration:none;
            "
          >
            ${escapeHtml(text)}
          </a>
        </td>
      </tr>
    </table>
  `;
}

function baseTemplate({
  appName,
  content,
}) {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  />

  <meta name="color-scheme" content="light"/>
  <meta name="supported-color-schemes" content="light"/>

  <title>${escapeHtml(appName)}</title>

  <style>
    :root {
      color-scheme: light;
      supported-color-schemes: light;
    }

    body,
    table,
    td,
    p,
    h1,
    h2,
    a {
      font-family: Arial, Helvetica, sans-serif;
    }

    @media only screen and (max-width: 620px) {
      .email-container {
        width: 100% !important;
        border-radius: 0 !important;
      }

      .email-wrapper {
        padding: 0 !important;
      }

      .header-cell {
        padding: 24px 20px !important;
      }

      .content-cell {
        padding: 30px 22px !important;
      }

      .footer-cell {
        padding: 22px !important;
      }

      .header-column {
        display: block !important;
        width: 100% !important;
        text-align: left !important;
      }

      .header-meta {
        padding-top: 18px !important;
        text-align: left !important;
      }
    }
  </style>
</head>

<body
  style="
    margin:0;
    padding:0;
    background-color:#EEF0F3;
    color:#111827;
    font-family:Arial,Helvetica,sans-serif;
  "
>
  <table
    role="presentation"
    width="100%"
    cellpadding="0"
    cellspacing="0"
    border="0"
    bgcolor="#EEF0F3"
    style="
      width:100%;
      background-color:#EEF0F3;
      border-collapse:collapse;
    "
  >
    <tr>
      <td
        class="email-wrapper"
        align="center"
        style="padding:40px 16px;"
      >
        <table
          role="presentation"
          width="580"
          cellpadding="0"
          cellspacing="0"
          border="0"
          bgcolor="#FFFFFF"
          class="email-container"
          style="
            width:100%;
            max-width:580px;
            background-color:#FFFFFF;
            border-collapse:separate;
            border-spacing:0;
            border-radius:16px;
            overflow:hidden;
            box-shadow:0 12px 32px rgba(17,24,39,0.10);
          "
        >
          <tr>
            <td
              bgcolor="#BC0613"
              style="
                height:8px;
                background-color:#BC0613;
                font-size:0;
                line-height:0;
              "
            >
              &nbsp;
            </td>
          </tr>

          <tr>
            <td
              class="header-cell"
              bgcolor="#17191C"
              style="
                padding:28px 32px;
                background-color:#17191C;
                border-bottom:1px solid #34373C;
              "
            >
              <table
                role="presentation"
                width="100%"
                cellpadding="0"
                cellspacing="0"
                border="0"
                style="width:100%;border-collapse:collapse;"
              >
                <tr>
                  <td
                    class="header-column"
                    valign="middle"
                    style="text-align:left;"
                  >
                    <table
                      role="presentation"
                      cellpadding="0"
                      cellspacing="0"
                      border="0"
                      style="border-collapse:collapse;"
                    >
                      <tr>
                        <td
                          width="54"
                          height="54"
                          align="center"
                          valign="middle"
                          bgcolor="#BC0613"
                          style="
                            width:54px;
                            height:54px;
                            background-color:#BC0613;
                            border-radius:12px;
                            border:1px solid #D91424;
                            color:#FFFFFF;
                            font-family:Arial,sans-serif;
                            font-size:20px;
                            font-weight:800;
                            line-height:54px;
                            letter-spacing:-1px;
                            text-align:center;
                          "
                        >
                          3D
                        </td>

                        <td
                          valign="middle"
                          style="padding-left:15px;"
                        >
                          <p
                            style="
                              margin:0 0 4px;
                              color:#FFFFFF;
                              font-family:Arial,sans-serif;
                              font-size:18px;
                              font-weight:700;
                              line-height:1.25;
                            "
                          >
                            Explorador 3D FIE
                          </p>

                          <p
                            style="
                              margin:0;
                              color:#B6BBC4;
                              font-family:Arial,sans-serif;
                              font-size:11px;
                              line-height:1.5;
                              letter-spacing:0.13em;
                              text-transform:uppercase;
                            "
                          >
                            Recorrido virtual 3D
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>

                  <td
                    class="header-column header-meta"
                    align="right"
                    valign="middle"
                    style="
                      padding-left:18px;
                      text-align:right;
                    "
                  >
                    <p
                      style="
                        margin:0 0 6px;
                        color:#FF5A63;
                        font-family:Arial,sans-serif;
                        font-size:11px;
                        font-weight:700;
                        line-height:1.4;
                        letter-spacing:0.13em;
                        text-transform:uppercase;
                      "
                    >
                      Notificación del sistema
                    </p>

                    <p
                      style="
                        margin:0;
                        color:#AEB4BE;
                        font-family:Arial,sans-serif;
                        font-size:12px;
                        line-height:1.5;
                      "
                    >
                      Panel de administración
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td
              bgcolor="#F9FAFB"
              style="
                padding:11px 32px;
                background-color:#F9FAFB;
                border-bottom:1px solid #E5E7EB;
              "
            >
              <table
                role="presentation"
                width="100%"
                cellpadding="0"
                cellspacing="0"
                border="0"
              >
                <tr>
                  <td
                    style="
                      color:#6B7280;
                      font-family:Arial,sans-serif;
                      font-size:11px;
                      line-height:1.4;
                    "
                  >
                    Mensaje automático de seguridad y administración
                  </td>

                  <td
                    align="right"
                    style="
                      color:#BC0613;
                      font-family:Arial,sans-serif;
                      font-size:11px;
                      font-weight:700;
                      line-height:1.4;
                    "
                  >
                    FIE · ESPOCH
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td
              class="content-cell"
              bgcolor="#FFFFFF"
              style="
                padding:36px 32px 34px;
                background-color:#FFFFFF;
              "
            >
              ${content}
            </td>
          </tr>

          <tr>
            <td
              class="footer-cell"
              bgcolor="#F9FAFB"
              style="
                padding:24px 32px;
                background-color:#F9FAFB;
                border-top:1px solid #E5E7EB;
                text-align:center;
              "
            >
              <p
                style="
                  margin:0 0 7px;
                  color:#1F2937;
                  font-family:Arial,sans-serif;
                  font-size:12px;
                  font-weight:700;
                  line-height:1.5;
                "
              >
                ${escapeHtml(appName)}
              </p>

              <p
                style="
                  margin:0;
                  color:#8B93A1;
                  font-family:Arial,sans-serif;
                  font-size:11px;
                  line-height:1.7;
                "
              >
                Este mensaje fue generado automáticamente por el sistema
                de administración.<br/>

                Si no reconoces esta acción, comunícate con el
                administrador responsable.
              </p>
            </td>
          </tr>

          <tr>
            <td
              bgcolor="#BC0613"
              style="
                height:4px;
                background-color:#BC0613;
                font-size:0;
                line-height:0;
              "
            >
              &nbsp;
            </td>
          </tr>
        </table>

        <p
          style="
            max-width:580px;
            margin:18px auto 0;
            color:#8B93A1;
            font-family:Arial,sans-serif;
            font-size:10px;
            line-height:1.6;
            text-align:center;
          "
        >
          Por seguridad, no respondas directamente a este correo.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

module.exports = {
  escapeHtml,
  pill,
  infoRow,
  alertBox,
  actionButton,
  baseTemplate,
};