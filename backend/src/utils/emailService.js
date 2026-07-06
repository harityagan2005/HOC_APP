const nodemailer = require('nodemailer');

let transporter = null;

const getTransporter = () => {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host:   process.env.EMAIL_HOST || 'smtp.gmail.com',
    port:   parseInt(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: { rejectUnauthorized: false },
  });
  return transporter;
};

// Verify connection on first use and log clearly
const verifyConnection = async () => {
  try {
    await getTransporter().verify();
    console.log('✅ Email SMTP connected successfully');
    return true;
  } catch (err) {
    console.error('❌ Email SMTP connection failed:', err.message);
    if (err.code === 'EAUTH') {
      console.error('   → Use a Gmail App Password (16 chars), not your regular password.');
      console.error('   → Enable 2FA then visit: myaccount.google.com → Security → App Passwords');
    }
    return false;
  }
};

const SEV_COLOR = {
  High:     '#EA580C',
  Medium:   '#D97706',
  Low:      '#16A34A',
};

const formatDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
};

const sendReportAssignmentEmail = async ({ report, reportId, department }) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('⚠️  Email not configured in .env — skipping notification');
    return;
  }
  if (!department?.email) {
    console.log('ℹ️  No department email set — skipping notification');
    return;
  }

  const ok = await verifyConnection();
  if (!ok) {
    console.error('❌ Skipping email — SMTP not reachable. Check EMAIL_PASS in .env');
    return;
  }

  const sevColor = SEV_COLOR[report.severity] || '#64748B';
  const fromName = process.env.EMAIL_FROM || `HOC Safety App <${process.env.EMAIL_USER}>`;

  const rows = [
    ['Report ID',            `#${reportId}`],
    ['Job / Activity',       report.job_req_for],
    ['Company',              report.company],
    ['Observer',             report.observer_name],
    ['Observation Date',     formatDate(report.observation_date)],
    ['Severity',             report.severity],
    ['Stop Job',             report.stop_job],
    ['Observations',         report.observations],
    ['Corrective Actions',   report.corrective_actions],
    ['Responsible Person',   report.responsible_person],
    ['Remarks',              report.remarks],
  ].filter(([, v]) => v);

  const tableRows = rows.map(([label, value], i) => `
    <tr style="background:${i % 2 === 0 ? '#ffffff' : '#F8FAFC'};">
      <td style="padding:10px 16px;font-size:13px;font-weight:600;color:#64748B;border-top:1px solid #E2E8F0;width:38%;">${label}</td>
      <td style="padding:10px 16px;font-size:13px;color:#1E293B;border-top:1px solid #E2E8F0;">${value}</td>
    </tr>`).join('');

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#F0F4F8;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F0F4F8;padding:24px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

  <tr>
    <td style="background:#0D2B6E;padding:24px 32px;">
      <h1 style="margin:0;color:#fff;font-size:20px;font-weight:800;">HOC Safety App</h1>
      <p style="margin:4px 0 0;color:#93C5FD;font-size:13px;">Hazard Observation Card — Action Required</p>
    </td>
  </tr>

  <tr>
    <td style="background:${sevColor};padding:12px 32px;">
      <p style="margin:0;color:#fff;font-size:14px;font-weight:700;">
        ⚠️ ${(report.severity || 'UNKNOWN').toUpperCase()} SEVERITY — Report #${reportId}
        ${report.stop_job === 'Yes' ? '&nbsp;&nbsp;🛑 STOP JOB TRIGGERED' : ''}
      </p>
    </td>
  </tr>

  <tr>
    <td style="padding:28px 32px;">
      <p style="margin:0 0 20px;font-size:15px;color:#1E293B;">
        Dear <strong>${department.name}</strong> Team,
      </p>
      <p style="margin:0 0 24px;font-size:14px;color:#475569;line-height:1.6;">
        A new Hazard Observation Report has been raised and automatically assigned to your department for corrective action.
        Please review the details below and take the necessary steps promptly.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0"
        style="border:1px solid #E2E8F0;border-radius:8px;overflow:hidden;margin-bottom:24px;">
        <tr style="background:#F8FAFC;">
          <td style="padding:10px 16px;font-size:11px;font-weight:700;color:#94A3B8;text-transform:uppercase;letter-spacing:0.5px;width:38%;">Field</td>
          <td style="padding:10px 16px;font-size:11px;font-weight:700;color:#94A3B8;text-transform:uppercase;letter-spacing:0.5px;">Details</td>
        </tr>
        ${tableRows}
      </table>

      <div style="background:#FEF3C7;border:1px solid #FDE68A;border-radius:8px;padding:14px 18px;margin-bottom:24px;">
        <p style="margin:0;font-size:13px;color:#92400E;font-weight:700;">📋 Action Required</p>
        <p style="margin:6px 0 0;font-size:13px;color:#92400E;line-height:1.5;">
          Please take immediate corrective action as per your role and update the status in the HOC system.
        </p>
      </div>

      <p style="margin:0;font-size:13px;color:#64748B;">
        Regards,<br>
        <strong style="color:#0D2B6E;">HOC Safety Team</strong><br>
        <span style="color:#94A3B8;">Reliance Industries · KG-D6</span>
      </p>
    </td>
  </tr>

  <tr>
    <td style="background:#F8FAFC;padding:16px 32px;border-top:1px solid #E2E8F0;">
      <p style="margin:0;font-size:11px;color:#94A3B8;text-align:center;">
        This is an automated message from HOC Safety App. Do not reply to this email.
      </p>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>`;

  const info = await getTransporter().sendMail({
    from:    fromName,
    to:      department.email,
    subject: `[HOC] Action Required — ${report.severity} Severity Report #${reportId} Assigned to ${department.name}`,
    html,
  });

  console.log(`✅ Assignment email sent → ${department.email} (msgId: ${info.messageId})`);
};

module.exports = { sendReportAssignmentEmail };
