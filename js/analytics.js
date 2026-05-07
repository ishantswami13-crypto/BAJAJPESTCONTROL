/**
 * BAJAJ PEST CONTROL — Analytics & Conversion Tracking
 * Tracks: form submissions, CTA clicks, phone clicks, WhatsApp clicks,
 *         scroll depth, time on page, section views
 */
'use strict';

(function () {

  // Safe GA4 event wrapper
  function track(eventName, params) {
    if (typeof window.trackEvent === 'function') {
      window.trackEvent(eventName, params);
    }
    // Debug log in development
    if (location.hostname === 'localhost') {
      console.log('[Analytics]', eventName, params || '');
    }
  }

  /* ── CTA / BUTTON TRACKING ─────────────────────────────────── */
  function initCTATracking() {
    // Track all "Book Free Inspection" buttons
    document.querySelectorAll('a[href="#cta"], .btn-primary').forEach((btn, i) => {
      btn.addEventListener('click', () => {
        track('cta_click', {
          button_text: btn.textContent.trim(),
          button_location: btn.closest('section')?.id || 'header',
          button_index: i,
        });
      });
    });

    // Phone number clicks
    document.querySelectorAll('a[href^="tel:"]').forEach(a => {
      a.addEventListener('click', () => {
        track('phone_click', {
          phone_number: '+919990146147',
          click_source: a.closest('section')?.id || 'header',
        });
        // GA4 conversion event
        track('conversion', { send_to: 'G-XXXXXXXXXX/phone_call' });
      });
    });

    // WhatsApp clicks
    document.querySelectorAll('a[href*="wa.me"], .fab-wa').forEach(a => {
      a.addEventListener('click', () => {
        track('whatsapp_click', {
          click_source: a.closest('section')?.id || 'fab',
        });
        track('conversion', { send_to: 'G-XXXXXXXXXX/whatsapp' });
      });
    });
  }

  /* ── FORM SUBMISSION TRACKING ──────────────────────────────── */
  function initFormTracking() {
    const form = document.getElementById('contact-form');
    if (!form) return;

    // Track form field interactions
    form.querySelectorAll('.form-input, .form-select').forEach(field => {
      let interacted = false;
      field.addEventListener('focus', () => {
        if (!interacted) {
          interacted = true;
          track('form_start', { field_name: field.name });
        }
      });
    });

    // Track successful submission (called from app.js)
    window.trackFormSubmit = function(data) {
      track('form_submit', {
        city: data.city,
        service: data.service,
        form_id: 'contact-form',
      });
      // GA4 conversion
      track('conversion', {
        send_to: 'G-XXXXXXXXXX/form_submit',
        value: 1,
        currency: 'INR',
      });
      // Lead event
      track('generate_lead', {
        currency: 'INR',
        value: 1,
        lead_source: 'website_form',
        city: data.city,
        service: data.service,
      });
    };
  }

  /* ── SCROLL DEPTH TRACKING ─────────────────────────────────── */
  function initScrollTracking() {
    const milestones = [25, 50, 75, 90, 100];
    const fired      = new Set();

    window.addEventListener('scroll', () => {
      const scrolled = Math.round(
        (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100
      );
      milestones.forEach(m => {
        if (scrolled >= m && !fired.has(m)) {
          fired.add(m);
          track('scroll_depth', { percent: m });
        }
      });
    }, { passive: true });
  }

  /* ── SECTION VIEW TRACKING ─────────────────────────────────── */
  function initSectionTracking() {
    const sections = document.querySelectorAll('section[id], div[id]');
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          track('section_view', {
            section_id:   e.target.id,
            section_name: e.target.querySelector('h2')?.textContent?.trim()?.slice(0, 50) || e.target.id,
          });
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.4 });
    sections.forEach(s => io.observe(s));
  }

  /* ── TIME ON PAGE ──────────────────────────────────────────── */
  function initTimeTracking() {
    const start     = Date.now();
    const milestones = [30, 60, 120, 300]; // seconds
    const fired      = new Set();

    setInterval(() => {
      const elapsed = Math.floor((Date.now() - start) / 1000);
      milestones.forEach(m => {
        if (elapsed >= m && !fired.has(m)) {
          fired.add(m);
          track('time_on_page', { seconds: m });
          if (m === 120) {
            track('engaged_user', { seconds: 120 });
          }
        }
      });
    }, 5000);

    // Track exit intent
    document.addEventListener('mouseleave', e => {
      if (e.clientY < 0) {
        track('exit_intent', {
          time_on_page: Math.floor((Date.now() - start) / 1000),
          scroll_depth: Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100),
        });
      }
    });
  }

  /* ── PAGE VIEW ─────────────────────────────────────────────── */
  function trackPageView() {
    track('page_view', {
      page_title:    document.title,
      page_location: window.location.href,
      page_referrer: document.referrer || 'direct',
    });
  }

  /* ── PERFORMANCE METRICS ───────────────────────────────────── */
  function trackPerformance() {
    if (!window.PerformanceObserver) return;
    // LCP
    try {
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const last    = entries[entries.length - 1];
        track('web_vitals', { metric: 'LCP', value: Math.round(last.renderTime || last.loadTime) });
      }).observe({ type: 'largest-contentful-paint', buffered: true });
    } catch (e) {}

    // CLS
    try {
      let clsValue = 0;
      new PerformanceObserver((list) => {
        list.getEntries().forEach(e => { if (!e.hadRecentInput) clsValue += e.value; });
        track('web_vitals', { metric: 'CLS', value: parseFloat(clsValue.toFixed(4)) });
      }).observe({ type: 'layout-shift', buffered: true });
    } catch (e) {}

    // Page load time
    window.addEventListener('load', () => {
      const nav = performance.getEntriesByType('navigation')[0];
      if (nav) {
        track('page_load_time', {
          dns:      Math.round(nav.domainLookupEnd - nav.domainLookupStart),
          ttfb:     Math.round(nav.responseStart - nav.requestStart),
          fcp:      Math.round(nav.domContentLoadedEventEnd - nav.fetchStart),
          load:     Math.round(nav.loadEventEnd - nav.fetchStart),
        });
      }
    });
  }

  /* ── INIT ──────────────────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', () => {
    trackPageView();
    initCTATracking();
    initFormTracking();
    initScrollTracking();
    initSectionTracking();
    initTimeTracking();
    trackPerformance();
  });

})();
