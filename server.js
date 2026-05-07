/**
 * BAJAJ PEST CONTROL — Production Server
 * Express.js backend with:
 *  - Static file serving
 *  - Lead capture API (/api/leads)
 *  - Admin dashboard API (/api/admin/*)
 *  - Email notifications (Nodemailer)
 *  - CSV lead export
 *  - Security headers (Helmet)
 *  - Request logging (Morgan)
 *  - Webhook forwarding
 */

'use strict';

require('dotenv').config();

const express    = require('express');
const helmet     = require('helmet');
const morgan     = require('morgan');
const cors       = require('cors');
const path       = require('path');
const fs         = require('fs');
const { v4: uuidv4 } = require('uuid');

const app  = express();
const PORT = process.env.PORT || 8083;

/* ── DATA DIRECTORY ──────────────────────────────────────────── */
const DATA_DIR  = path.join(__dirname, 'data');
const LEADS_FILE = path.join(DATA_DIR, 'leads.json');
const LOG_FILE   = path.join(DATA_DIR, 'server.log');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(LEADS_FILE)) fs.writeFileSync(LEADS_FILE, '[]');

/* ── SECURITY HEADERS ────────────────────────────────────────── */
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:  ["'self'"],
      scriptSrc:   ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com',
                    'https://www.googletagmanager.com', 'https://www.google-analytics.com'],
      styleSrc:    ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc:     ["'self'", 'https://fonts.gstatic.com'],
      imgSrc:      ["'self'", 'data:', 'https:'],
      connectSrc:  ["'self'", 'https://www.google-analytics.com', 'https://analytics.google.com'],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  next();
});

/* ── MIDDLEWARE ──────────────────────────────────────────────── */
app.use(cors({ origin: '*', methods: ['GET', 'POST'] }));
app.use(morgan('combined', {
  stream: fs.createWriteStream(LOG_FILE, { flags: 'a' })
}));
app.use(morgan('dev')); // Console output
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

/* ── STATIC FILES ────────────────────────────────────────────── */
// Cache static assets
app.use(express.static(__dirname, {
  maxAge: '1d',
  setHeaders(res, filePath) {
    // No cache for HTML files
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  }
}));

/* ── HELPERS ─────────────────────────────────────────────────── */
function readLeads() {
  try {
    return JSON.parse(fs.readFileSync(LEADS_FILE, 'utf8'));
  } catch { return []; }
}

function writeLeads(leads) {
  fs.writeFileSync(LEADS_FILE, JSON.stringify(leads, null, 2));
}

function sanitize(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[<>"'&]/g, '').trim().slice(0, 500);
}

function validatePhone(phone) {
  return /^[\d\s\+\-\(\)]{7,20}$/.test(phone);
}

function leadsToCSV(leads) {
  if (!leads.length) return 'ID,Name,Phone,City,Service,Date,Time,Status,Source\n';
  const header = 'ID,Name,Phone,City,Service,Date,Time,Status,Source\n';
  const rows = leads.map(l => [
    l.id,
    `"${(l.name  || '').replace(/"/g, '""')}"`,
    `"${(l.phone || '').replace(/"/g, '""')}"`,
    `"${(l.city  || '').replace(/"/g, '""')}"`,
    `"${(l.service || '').replace(/"/g, '""')}"`,
    l.date || '',
    l.time || '',
    l.status || 'new',
    l.source || 'website',
  ].join(',')).join('\n');
  return header + rows;
}

/* ── SEND EMAIL NOTIFICATION ─────────────────────────────────── */
async function sendNotification(lead) {
  const { SMTP_HOST, SMTP_USER, SMTP_PASS, NOTIFY_EMAIL } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !NOTIFY_EMAIL) {
    console.log('[EMAIL] SMTP not configured — skipping notification');
    return;
  }

  let nodemailer;
  try { nodemailer = require('nodemailer'); } catch { return; }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  // Notify team
  await transporter.sendMail({
    from: `"${process.env.FROM_NAME}" <${process.env.FROM_EMAIL || SMTP_USER}>`,
    to: NOTIFY_EMAIL,
    subject: `🆕 New Lead: ${lead.name} — ${lead.city} (${lead.service})`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#1B7D4B;padding:20px;border-radius:8px 8px 0 0">
          <h2 style="color:#fff;margin:0">New Inspection Request</h2>
        </div>
        <div style="background:#f9f9f9;padding:24px;border:1px solid #e8e8e8;border-radius:0 0 8px 8px">
          <table style="width:100%;border-collapse:collapse">
            <tr><td style="padding:8px 0;color:#666;width:140px">Name</td><td style="padding:8px 0;font-weight:600">${lead.name}</td></tr>
            <tr><td style="padding:8px 0;color:#666">Phone</td><td style="padding:8px 0;font-weight:600"><a href="tel:${lead.phone}">${lead.phone}</a></td></tr>
            <tr><td style="padding:8px 0;color:#666">City</td><td style="padding:8px 0">${lead.city}</td></tr>
            <tr><td style="padding:8px 0;color:#666">Service</td><td style="padding:8px 0">${lead.service}</td></tr>
            <tr><td style="padding:8px 0;color:#666">Received</td><td style="padding:8px 0">${lead.date} at ${lead.time}</td></tr>
            <tr><td style="padding:8px 0;color:#666">Lead ID</td><td style="padding:8px 0;font-family:monospace;font-size:12px">${lead.id}</td></tr>
          </table>
          <div style="margin-top:20px">
            <a href="http://localhost:${PORT}/admin/" style="background:#1B7D4B;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600">
              View in Admin Dashboard →
            </a>
          </div>
        </div>
      </div>
    `,
  }).catch(err => console.error('[EMAIL] Team notification failed:', err.message));

  // Auto-reply to customer (if email provided)
  if (lead.email) {
    await transporter.sendMail({
      from: `"${process.env.FROM_NAME}" <${process.env.FROM_EMAIL || SMTP_USER}>`,
      to: lead.email,
      subject: `We've received your request — Bajaj Pest Control`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
          <div style="background:#1B7D4B;padding:20px;border-radius:8px 8px 0 0">
            <h2 style="color:#fff;margin:0">Thank you, ${lead.name}!</h2>
          </div>
          <div style="padding:24px;border:1px solid #e8e8e8;border-radius:0 0 8px 8px">
            <p>We've received your inspection request and our team will call you within <strong>2 hours</strong>.</p>
            <p><strong>Your Request Summary:</strong><br>Service: ${lead.service}<br>City: ${lead.city}</p>
            <p>Need immediate assistance? Call us: <a href="tel:+919990146147">+91 99901 46147</a> | Email: <a href="mailto:bajajpeastcontol1@gmail.com">bajajpeastcontol1@gmail.com</a></p>
            <p style="color:#888;font-size:12px">© Bajaj Pest Control | India's Trusted Pest Protection</p>
          </div>
        </div>
      `,
    }).catch(err => console.error('[EMAIL] Auto-reply failed:', err.message));
  }
}

/* ── WEBHOOK FORWARD ─────────────────────────────────────────── */
async function sendWebhook(lead) {
  const url = process.env.WEBHOOK_URL;
  if (!url) return;
  try {
    const { default: fetch } = await import('node-fetch').catch(() => ({ default: null }));
    if (!fetch) return;
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(lead),
    });
    console.log('[WEBHOOK] Lead forwarded successfully');
  } catch (err) {
    console.error('[WEBHOOK] Forward failed:', err.message);
  }
}

/* ══════════════════════════════════════════════════════════════
   API ROUTES
══════════════════════════════════════════════════════════════ */

/* ── POST /api/leads — Submit new lead ───────────────────────── */
app.post('/api/leads', async (req, res) => {
  try {
    const { name, phone, city, service, email, message } = req.body;

    // Validate
    const errors = [];
    if (!name  || name.trim().length  < 2) errors.push('Name is required (min 2 chars)');
    if (!phone || !validatePhone(phone))    errors.push('Valid phone number is required');
    if (!city  || city.trim().length  < 2) errors.push('City is required');
    if (!service || service.trim().length < 2) errors.push('Service type is required');

    if (errors.length) {
      return res.status(400).json({ success: false, errors });
    }

    const now = new Date();
    const lead = {
      id:        uuidv4(),
      name:      sanitize(name),
      phone:     sanitize(phone),
      city:      sanitize(city),
      service:   sanitize(service),
      email:     sanitize(email || ''),
      message:   sanitize(message || ''),
      status:    'new',
      source:    sanitize(req.headers['x-source'] || 'website'),
      ip:        req.ip,
      userAgent: req.headers['user-agent'] || '',
      date:      now.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }),
      time:      now.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' }),
      createdAt: now.toISOString(),
    };

    // Save
    const leads = readLeads();
    leads.unshift(lead);
    writeLeads(leads);

    console.log(`[LEAD] New: ${lead.name} | ${lead.phone} | ${lead.city} | ${lead.service}`);

    // Async notifications (don't block response)
    sendNotification(lead).catch(console.error);
    sendWebhook(lead).catch(console.error);

    res.status(201).json({
      success: true,
      message: "Request received! We'll call you within 2 hours.",
      leadId: lead.id,
    });

  } catch (err) {
    console.error('[API] Lead submission error:', err);
    res.status(500).json({ success: false, message: 'Server error. Please call us directly.' });
  }
});

/* ── GET /api/health — Health check ─────────────────────────── */
app.get('/api/health', (req, res) => {
  const leads = readLeads();
  res.json({
    status:    'ok',
    uptime:    process.uptime(),
    timestamp: new Date().toISOString(),
    leads:     leads.length,
    memory:    process.memoryUsage().heapUsed,
    node:      process.version,
    env:       process.env.NODE_ENV,
  });
});

/* ── ADMIN AUTH MIDDLEWARE ───────────────────────────────────── */
function adminAuth(req, res, next) {
  const token = req.headers['x-admin-token'] || req.query.token;
  const pass  = process.env.ADMIN_PASSWORD || 'bajaj@admin2024';
  if (token === pass) return next();
  res.status(401).json({ success: false, message: 'Unauthorized' });
}

/* ── GET /api/admin/leads — Get all leads (admin) ────────────── */
app.get('/api/admin/leads', adminAuth, (req, res) => {
  const leads  = readLeads();
  const { status, city, service, q } = req.query;
  let filtered = leads;

  if (status)  filtered = filtered.filter(l => l.status === status);
  if (city)    filtered = filtered.filter(l => l.city === city);
  if (service) filtered = filtered.filter(l => l.service === service);
  if (q) {
    const query = q.toLowerCase();
    filtered = filtered.filter(l =>
      l.name?.toLowerCase().includes(query) ||
      l.phone?.includes(query) ||
      l.city?.toLowerCase().includes(query)
    );
  }

  const stats = {
    total:     leads.length,
    new:       leads.filter(l => l.status === 'new').length,
    contacted: leads.filter(l => l.status === 'contacted').length,
    converted: leads.filter(l => l.status === 'converted').length,
    today:     leads.filter(l => l.date === new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })).length,
  };

  res.json({ success: true, leads: filtered, stats });
});

/* ── PATCH /api/admin/leads/:id — Update lead status ─────────── */
app.patch('/api/admin/leads/:id', adminAuth, (req, res) => {
  const { id }     = req.params;
  const { status, notes } = req.body;
  const leads      = readLeads();
  const idx        = leads.findIndex(l => l.id === id);

  if (idx === -1) return res.status(404).json({ success: false, message: 'Lead not found' });

  if (status) leads[idx].status = sanitize(status);
  if (notes)  leads[idx].notes  = sanitize(notes);
  leads[idx].updatedAt = new Date().toISOString();
  writeLeads(leads);

  res.json({ success: true, lead: leads[idx] });
});

/* ── DELETE /api/admin/leads/:id — Delete lead ───────────────── */
app.delete('/api/admin/leads/:id', adminAuth, (req, res) => {
  const { id } = req.params;
  const leads  = readLeads().filter(l => l.id !== id);
  writeLeads(leads);
  res.json({ success: true });
});

/* ── GET /api/admin/export — Export CSV ─────────────────────── */
app.get('/api/admin/export', adminAuth, (req, res) => {
  const leads = readLeads();
  const csv   = leadsToCSV(leads);
  const date  = new Date().toISOString().split('T')[0];
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="bajaj-leads-${date}.csv"`);
  res.send(csv);
});

/* ── GET /api/admin/stats — Analytics stats ─────────────────── */
app.get('/api/admin/stats', adminAuth, (req, res) => {
  const leads = readLeads();
  const now   = new Date();

  // Group by city
  const byCityMap = {};
  leads.forEach(l => { byCityMap[l.city] = (byCityMap[l.city] || 0) + 1; });
  const byCity = Object.entries(byCityMap).map(([city, count]) => ({ city, count })).sort((a,b) => b.count - a.count);

  // Group by service
  const byServiceMap = {};
  leads.forEach(l => { byServiceMap[l.service] = (byServiceMap[l.service] || 0) + 1; });
  const byService = Object.entries(byServiceMap).map(([service, count]) => ({ service, count })).sort((a,b) => b.count - a.count);

  // Last 7 days
  const last7 = [];
  for (let i = 6; i >= 0; i--) {
    const d    = new Date(now); d.setDate(d.getDate() - i);
    const date = d.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
    const count = leads.filter(l => l.date === date).length;
    last7.push({ date, count });
  }

  res.json({
    success: true,
    summary: {
      total:     leads.length,
      new:       leads.filter(l => l.status === 'new').length,
      contacted: leads.filter(l => l.status === 'contacted').length,
      converted: leads.filter(l => l.status === 'converted').length,
      today:     leads.filter(l => l.date === now.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })).length,
      conversionRate: leads.length ? ((leads.filter(l => l.status === 'converted').length / leads.length) * 100).toFixed(1) : 0,
    },
    byCity, byService, last7,
  });
});

/* ── ADMIN PANEL — Serve from /admin/ ──────────────────────── */
app.get('/admin', (req, res) => res.redirect('/admin/'));
app.get('/admin/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'index.html'));
});

/* ── CATCH-ALL — SPA fallback ────────────────────────────────── */
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ success: false, message: 'Route not found' });
  }
  res.sendFile(path.join(__dirname, 'index.html'));
});

/* ── START SERVER ────────────────────────────────────────────── */
app.listen(PORT, () => {
  console.log('\n╔═══════════════════════════════════════════════════╗');
  console.log('║       BAJAJ PEST CONTROL — Server Running          ║');
  console.log('╠═══════════════════════════════════════════════════╣');
  console.log(`║  🌐  Website :  http://localhost:${PORT}              ║`);
  console.log(`║  🔐  Admin   :  http://localhost:${PORT}/admin/        ║`);
  console.log(`║  📊  Health  :  http://localhost:${PORT}/api/health    ║`);
  console.log(`║  📁  Leads   :  ${LEADS_FILE}  ║`);
  console.log('╠═══════════════════════════════════════════════════╣');
  console.log(`║  Password: ${process.env.ADMIN_PASSWORD || 'bajaj@admin2024'}                          ║`);
  console.log('╚═══════════════════════════════════════════════════╝\n');
});

module.exports = app;
