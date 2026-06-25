require('dotenv').config({ path: './.env' });
const nodemailer = require('nodemailer');

const user = process.env.EMAIL_USER;
const pass = process.env.EMAIL_PASS;

console.log('Email config:');
console.log('  USER:', user);
console.log('  PASS:', pass ? `(set — ${pass.replace(/\S/g, '*')})` : '(NOT SET)');
console.log('');

const configs = [
  { label: 'Port 465 SSL',      host: 'smtp.gmail.com', port: 465, secure: true  },
  { label: 'Port 587 STARTTLS', host: 'smtp.gmail.com', port: 587, secure: false },
];

(async () => {
  for (const cfg of configs) {
    process.stdout.write(`Testing ${cfg.label}... `);
    const t = nodemailer.createTransport({
      host: cfg.host, port: cfg.port, secure: cfg.secure,
      auth: { user, pass },
      tls: { rejectUnauthorized: false },
      connectionTimeout: 8000,
      greetingTimeout: 8000,
    });
    try {
      await t.verify();
      console.log('✅ CONNECTED');
      console.log('\nSending test email to yourself...');
      const info = await t.sendMail({
        from:    process.env.EMAIL_FROM || user,
        to:      user,
        subject: 'HOC App — SMTP Test ✅',
        html:    '<h2 style="color:#0D2B6E">Email is working!</h2><p>HOC App SMTP connection is configured correctly.</p>',
      });
      console.log('✅ Email sent! Message ID:', info.messageId);
      console.log('\n→ Update .env: EMAIL_PORT=' + cfg.port + ' EMAIL_SECURE=' + cfg.secure);
      process.exit(0);
    } catch (err) {
      console.log('❌ FAILED —', err.code || err.message);
    }
  }
  console.log('\n❌ Both ports failed. Possible causes:');
  console.log('   1. Network/firewall is blocking SMTP (try on a different WiFi/hotspot)');
  console.log('   2. Wrong App Password — must be 16 chars from myaccount.google.com → App Passwords');
  console.log('   3. 2FA not enabled on the account');
  process.exit(1);
})();
