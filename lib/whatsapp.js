/**
 * BAJAJ PEST CONTROL — Twilio WhatsApp Service
 * Sends WhatsApp messages to customers and admin on new leads.
 * Gracefully skips if Twilio credentials are not set.
 */

'use strict';

let twilioClient = null;

function getTwilio() {
  if (twilioClient) return twilioClient;
  const sid   = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) return null;
  try {
    twilioClient = require('twilio')(sid, token);
    return twilioClient;
  } catch {
    return null;
  }
}

/* ── SEND WHATSAPP MESSAGE ────────────────────────────────────── */
async function sendWhatsApp({ phone, message }) {
  const client = getTwilio();
  if (!client) {
    console.warn('[WhatsApp] Twilio not configured — message skipped.');
    return { success: false, skipped: true };
  }

  const from = process.env.TWILIO_WHATSAPP_NUMBER || '+14155238886'; // Twilio sandbox default
  // Normalize phone: ensure it starts with country code
  const to = phone.startsWith('+') ? phone : `+91${phone.replace(/\D/g, '')}`;

  try {
    const result = await client.messages.create({
      body:  message,
      from: `whatsapp:${from}`,
      to:   `whatsapp:${to}`,
    });
    console.log('[WhatsApp] ✅ Sent to:', to, '| SID:', result.sid);
    return { success: true, messageId: result.sid };
  } catch (err) {
    console.error('[WhatsApp] ❌ Failed:', err.message);
    return { success: false, error: err.message };
  }
}

/* ── MESSAGE TEMPLATES ───────────────────────────────────────── */
const WHATSAPP_MESSAGES = {

  customerConfirmation: (name, phone) => `
👋 Hi ${name}!

Thank you for contacting *Bajaj Pest Control*! ✅

We've received your *free inspection request* and our team is on it.

⏱️ *What happens next:*
• We'll call you within *2 hours*
• Free on-site inspection scheduled
• No hidden charges, no pressure

📞 Need help now? Call us:
+91 99901 46147

🌐 bajajpestcontrol.in

_EST. 1999 · Government Approved · Family Safe_`.trim(),

  adminAlert: (name, city, phone, service) => `
🔔 *NEW LEAD — Bajaj Pest Control*

👤 *${name}*
📍 ${city}
🛡️ ${service}
📞 ${phone}

Quick actions:
• Call: ${phone}
• WA: https://wa.me/91${phone.replace(/\D/g,'')}

⏰ ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST`.trim(),

};

module.exports = { sendWhatsApp, WHATSAPP_MESSAGES };
