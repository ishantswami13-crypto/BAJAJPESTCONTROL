/**
 * BAJAJ PEST CONTROL — Firebase Admin SDK
 * Server-side Firestore for persistent cloud lead storage.
 * Replaces leads.json with Google Firestore.
 */

'use strict';

const admin = require('firebase-admin');

let db = null;
let initialized = false;

function initFirebase() {
  if (initialized) return db;

  // Requires FIREBASE_SERVICE_ACCOUNT env var (JSON string) OR individual vars
  const projectId = process.env.FIREBASE_PROJECT_ID;

  if (!projectId) {
    console.warn('[Firebase] FIREBASE_PROJECT_ID not set — Firestore disabled, using local JSON fallback.');
    return null;
  }

  try {
    // Support two auth methods:
    // 1. Full service account JSON string in FIREBASE_SERVICE_ACCOUNT
    // 2. Individual credential env vars
    let credential;

    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      credential = admin.credential.cert(serviceAccount);
    } else if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      credential = admin.credential.cert({
        projectId,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // Vercel escapes \n in env vars — fix it
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      });
    } else {
      // Application Default Credentials (works on Google Cloud / Cloud Run)
      credential = admin.credential.applicationDefault();
    }

    if (!admin.apps.length) {
      admin.initializeApp({ credential, projectId });
    }

    db = admin.firestore();
    initialized = true;
    console.log('[Firebase] ✅ Firestore connected — project:', projectId);
    return db;
  } catch (err) {
    console.error('[Firebase] Init failed:', err.message);
    return null;
  }
}

/* ── LEAD OPERATIONS ──────────────────────────────────────────── */

async function addLeadToFirestore(lead) {
  const firestore = initFirebase();
  if (!firestore) return { success: false, error: 'Firestore not initialized' };

  try {
    const docRef = await firestore.collection('leads').add({
      ...lead,
      status: lead.status || 'new',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { success: true, id: docRef.id };
  } catch (err) {
    console.error('[Firebase] addLead error:', err.message);
    return { success: false, error: err.message };
  }
}

async function getAllLeadsFromFirestore({ status, city, service, q } = {}) {
  const firestore = initFirebase();
  if (!firestore) return { success: false, error: 'Firestore not initialized' };

  try {
    let query = firestore.collection('leads').orderBy('createdAt', 'desc');
    if (status) query = query.where('status', '==', status);
    if (city)   query = query.where('city', '==', city);

    const snapshot = await query.get();
    let leads = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Client-side filters (Firestore free tier avoids composite index needs)
    if (service) leads = leads.filter(l => l.service === service);
    if (q) {
      const ql = q.toLowerCase();
      leads = leads.filter(l =>
        l.name?.toLowerCase().includes(ql) ||
        l.phone?.includes(ql) ||
        l.city?.toLowerCase().includes(ql)
      );
    }

    return { success: true, data: leads };
  } catch (err) {
    console.error('[Firebase] getAllLeads error:', err.message);
    return { success: false, error: err.message };
  }
}

async function updateLeadInFirestore(leadId, updates) {
  const firestore = initFirebase();
  if (!firestore) return { success: false, error: 'Firestore not initialized' };

  try {
    await firestore.collection('leads').doc(leadId).update({
      ...updates,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { success: true };
  } catch (err) {
    console.error('[Firebase] updateLead error:', err.message);
    return { success: false, error: err.message };
  }
}

async function deleteLeadFromFirestore(leadId) {
  const firestore = initFirebase();
  if (!firestore) return { success: false, error: 'Firestore not initialized' };

  try {
    await firestore.collection('leads').doc(leadId).delete();
    return { success: true };
  } catch (err) {
    console.error('[Firebase] deleteLead error:', err.message);
    return { success: false, error: err.message };
  }
}

async function getStatsFromFirestore() {
  const firestore = initFirebase();
  if (!firestore) return { success: false, error: 'Firestore not initialized' };

  try {
    const snapshot = await firestore.collection('leads').get();
    const leads = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // By city
    const byCity = {};
    leads.forEach(l => { byCity[l.city] = (byCity[l.city] || 0) + 1; });

    // By service
    const byService = {};
    leads.forEach(l => { byService[l.service] = (byService[l.service] || 0) + 1; });

    // Last 7 days
    const now = Date.now();
    const last7 = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now - i * 86400000);
      return d.toLocaleDateString('en-IN', { weekday: 'short' });
    }).reverse();

    const last7days = last7.map(day => {
      const count = leads.filter(l => {
        if (!l.createdAt) return false;
        const d = new Date(l.createdAt._seconds * 1000);
        return d.toLocaleDateString('en-IN', { weekday: 'short' }) === day;
      }).length;
      return { day, count };
    });

    return {
      success: true,
      data: {
        total: leads.length,
        byStatus: {
          new:       leads.filter(l => l.status === 'new').length,
          contacted: leads.filter(l => l.status === 'contacted').length,
          converted: leads.filter(l => l.status === 'converted').length,
          lost:      leads.filter(l => l.status === 'lost').length,
        },
        byCity: Object.entries(byCity).map(([city, count]) => ({ city, count })).sort((a,b) => b.count - a.count),
        byService: Object.entries(byService).map(([service, count]) => ({ service, count })),
        last7days,
      }
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

module.exports = {
  initFirebase,
  addLeadToFirestore,
  getAllLeadsFromFirestore,
  updateLeadInFirestore,
  deleteLeadFromFirestore,
  getStatsFromFirestore,
};
