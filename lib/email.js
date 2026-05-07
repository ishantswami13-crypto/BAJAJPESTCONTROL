/**
 * BAJAJ PEST CONTROL — SendGrid Email Service
 * Replaces Nodemailer with SendGrid for reliable delivery.
 * Falls back to Nodemailer if SENDGRID_API_KEY is not set.
 */

'use strict';

const nodemailer = require('nodemailer');

let sgMail = null;

// Lazy-load SendGrid only if key is present
function getSendGrid() {
  if (sgMail) return sgMail;
  if (!process.env.SENDGRID_API_KEY) return null;
  try {
    sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    return sgMail;
  } catch {
    return null;
  }
}

/* ── SEND VIA SENDGRID ─────────────────────────────────────────── */
async function sendViaSendGrid({ to, subject, html }) {
  const sg = getSendGrid();
  if (!sg) throw new Error('SendGrid not configured');

  await sg.send({
    to,
    from: {
      email: process.env.SENDGRID_FROM_EMAIL || process.env.FROM_EMAIL || 'noreply@bajajpestcontrol.in',
      name:  process.env.FROM_NAME || 'Bajaj Pest Control',
    },
    subject,
    html,
  });
}

/* ── SEND VIA NODEMAILER (fallback) ───────────────────────────── */
async function sendViaNodemailer({ to, subject, html }) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('[Email] No SMTP credentials — email skipped.');
    return;
  }
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  await transporter.sendMail({
    from: `"${process.env.FROM_NAME || 'Bajaj Pest Control'}" <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`,
    to, subject, html,
  });
}

/* ── MAIN SEND FUNCTION ───────────────────────────────────────── */
async function sendEmail({ to, subject, html }) {
  try {
    if (process.env.SENDGRID_API_KEY) {
      await sendViaSendGrid({ to, subject, html });
      console.log('[Email] ✅ Sent via SendGrid to:', to);
    } else {
      await sendViaNodemailer({ to, subject, html });
      console.log('[Email] ✅ Sent via Nodemailer to:', to);
    }
    return { success: true };
  } catch (err) {
    console.error('[Email] ❌ Send failed:', err.message);
    return { success: false, error: err.message };
  }
}

/* ── EMAIL TEMPLATES ──────────────────────────────────────────── */

function getCustomerConfirmationEmail(name) {
  return `
<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:20px">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,.1)">
  <div style="background:#1B7D4B;padding:32px 40px;text-align:center">
    <div style="display:inline-block;background:#fff;border-radius:10px;padding:8px 16px;margin-bottom:16px">
      <span style="font-family:Georgia,serif;font-weight:700;font-size:1.1rem;color:#1B7D4B">BPC</span>
    </div>
    <h1 style="color:#fff;margin:0;font-size:1.5rem">Inspection Request Confirmed!</h1>
  </div>
  <div style="padding:40px">
    <h2 style="color:#1A2332;margin-top:0">Hi ${name}! 👋</h2>
    <p style="color:#4A4A4A;line-height:1.7">We've received your <strong>free pest control inspection</strong> request and our team is already on it.</p>
    <div style="background:#F0FAF5;border-left:4px solid #1B7D4B;border-radius:8px;padding:20px;margin:24px 0">
      <p style="margin:0;font-weight:700;color:#1A2332;margin-bottom:12px">⏱️ What happens next:</p>
      <ul style="color:#4A4A4A;margin:0;padding-left:20px;line-height:2">
        <li>Our team will <strong>call you within 2 hours</strong></li>
        <li>We'll schedule your <strong>FREE on-site inspection</strong></li>
        <li><strong>No hidden charges</strong>, no pressure</li>
        <li>Same-day service available</li>
      </ul>
    </div>
    <div style="background:#1A2332;border-radius:10px;padding:20px;text-align:center;margin:24px 0">
      <p style="color:rgba(255,255,255,.7);margin:0 0 8px;font-size:.9rem">Need to talk right now?</p>
      <a href="tel:+919990146147" style="color:#D4AF37;font-size:1.3rem;font-weight:700;text-decoration:none">📞 +91 99901 46147</a>
    </div>
    <div style="display:flex;gap:16px;margin-top:20px">
      <div style="flex:1;text-align:center;padding:16px;background:#f9f9f9;border-radius:8px">
        <div style="font-size:1.5rem">25+</div>
        <div style="font-size:.8rem;color:#666">Years Experience</div>
      </div>
      <div style="flex:1;text-align:center;padding:16px;background:#f9f9f9;border-radius:8px">
        <div style="font-size:1.5rem">10K+</div>
        <div style="font-size:.8rem;color:#666">Properties Protected</div>
      </div>
      <div style="flex:1;text-align:center;padding:16px;background:#f9f9f9;border-radius:8px">
        <div style="font-size:1.5rem">4.8★</div>
        <div style="font-size:.8rem;color:#666">Google Rating</div>
      </div>
    </div>
  </div>
  <div style="background:#f5f5f5;padding:20px 40px;text-align:center;border-top:1px solid #E8E8E8">
    <p style="color:#999;font-size:.8rem;margin:0">Bajaj Pest Control · EST. 1999 · Pan-India</p>
    <p style="color:#999;font-size:.75rem;margin:6px 0 0">bajajpeastcontol1@gmail.com · bajajpestcontrol.in</p>
  </div>
</div>
</body>
</html>`;
}

function getAdminAlertEmail(lead) {
  return `
<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:20px">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,.1)">
  <div style="background:#1A2332;padding:24px 32px;display:flex;align-items:center;gap:16px">
    <div style="background:#1B7D4B;border-radius:50%;width:48px;height:48px;display:flex;align-items:center;justify-content:center;font-size:1.4rem;flex-shrink:0">🔔</div>
    <div>
      <h2 style="color:#fff;margin:0;font-size:1.2rem">NEW LEAD ALERT</h2>
      <p style="color:rgba(255,255,255,.5);margin:4px 0 0;font-size:.85rem">${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</p>
    </div>
  </div>
  <div style="padding:32px">
    <div style="background:#F0FAF5;border-radius:10px;padding:20px;margin-bottom:24px">
      <h3 style="color:#1B7D4B;margin:0 0 16px;font-size:1rem">📋 Lead Details</h3>
      <table style="width:100%;border-collapse:collapse">
        <tr style="border-bottom:1px solid #E8E8E8">
          <td style="padding:10px 12px;color:#666;font-size:.85rem;width:100px">Name</td>
          <td style="padding:10px 12px;color:#1A2332;font-weight:600">${lead.name}</td>
        </tr>
        <tr style="border-bottom:1px solid #E8E8E8">
          <td style="padding:10px 12px;color:#666;font-size:.85rem">Phone</td>
          <td style="padding:10px 12px"><a href="tel:${lead.phone}" style="color:#1B7D4B;font-weight:700;text-decoration:none">${lead.phone}</a></td>
        </tr>
        <tr style="border-bottom:1px solid #E8E8E8">
          <td style="padding:10px 12px;color:#666;font-size:.85rem">City</td>
          <td style="padding:10px 12px;color:#1A2332">📍 ${lead.city}</td>
        </tr>
        <tr style="border-bottom:1px solid #E8E8E8">
          <td style="padding:10px 12px;color:#666;font-size:.85rem">Service</td>
          <td style="padding:10px 12px;color:#1A2332">🛡️ ${lead.service}</td>
        </tr>
        ${lead.email ? `<tr><td style="padding:10px 12px;color:#666;font-size:.85rem">Email</td><td style="padding:10px 12px;color:#1A2332">${lead.email}</td></tr>` : ''}
      </table>
    </div>
    <div style="text-align:center;margin-top:20px">
      <a href="tel:${lead.phone}" style="display:inline-block;background:#1B7D4B;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;margin-right:12px">📞 Call Now</a>
      <a href="https://wa.me/91${lead.phone.replace(/\D/g,'')}?text=Hi%20${encodeURIComponent(lead.name)}%2C%20this%20is%20Bajaj%20Pest%20Control..."
         style="display:inline-block;background:#25D366;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700">💬 WhatsApp</a>
    </div>
  </div>
</div>
</body>
</html>`;
}

module.exports = { sendEmail, getCustomerConfirmationEmail, getAdminAlertEmail };
