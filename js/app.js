'use strict';

(function () {

  /* ── HEADER SCROLL ─────────────────────────────────────────── */
  const header = document.getElementById('header');
  if (header) {
    window.addEventListener('scroll', () => {
      header.classList.toggle('scrolled', window.scrollY > 20);
    }, { passive: true });
  }

  /* ── TICKER ────────────────────────────────────────────────── */
  const TICKER_ITEMS = [
    { text: '<strong>4.8★</strong> Google Rating · 1,250+ Reviews', sep: true },
    { text: '<strong>25+</strong> Years of Proven Excellence', sep: true },
    { text: '<strong class="gold">ISO 9001:2015</strong> Certified · FSSAI Approved', sep: true },
    { text: '<strong>10,000+</strong> Properties Protected Across India', sep: true },
    { text: '<strong>500+</strong> Commercial Clients Trust Us', sep: true },
    { text: '<strong>Same-Day</strong> Response Guarantee', sep: true },
    { text: '<strong>Zero</strong> Hidden Charges — Ever', sep: true },
    { text: '<strong>Government-Approved</strong> Chemicals Only', sep: true },
    { text: '<strong>Safe</strong> for Children, Pets &amp; Elderly', sep: true },
    { text: '<strong>Pan-India</strong> Operations · 7 Major Cities', sep: true },
    { text: '<strong>90-Day</strong> Re-Treatment Guarantee', sep: true },
    { text: '<strong>CIB &amp; RC</strong> Registered Professionals', sep: true },
  ];

  function buildTicker() {
    const track = document.getElementById('ticker-track');
    if (!track) return;
    const items = [...TICKER_ITEMS, ...TICKER_ITEMS]; // duplicate for seamless loop
    track.innerHTML = items.map(item => `
      <div class="ticker-item">
        ${item.sep ? '<span class="tick-sep"></span>' : ''}
        ${item.text}
      </div>
    `).join('');
  }

  /* ── SCROLL REVEAL ─────────────────────────────────────────── */
  function initReveal() {
    const els = document.querySelectorAll('.reveal');
    if (!els.length) return;

    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('revealed');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    els.forEach(el => io.observe(el));
  }

  /* ── COUNTER ANIMATION ─────────────────────────────────────── */
  function animateCounter(el) {
    const target  = parseInt(el.dataset.target, 10);
    const suffix  = el.dataset.suffix || '';
    if (!target) return;

    const duration = 2000;
    const start    = performance.now();

    function formatNum(n) {
      if (n >= 1000) return n.toLocaleString('en-IN');
      return n.toString();
    }

    function tick(now) {
      const elapsed  = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased    = 1 - Math.pow(1 - progress, 3);
      const current  = Math.round(eased * target);
      el.textContent = formatNum(current) + suffix;
      if (progress < 1) requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }

  function initCounters() {
    const counters = document.querySelectorAll('[data-target]');
    if (!counters.length) return;

    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          animateCounter(e.target);
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.5 });

    counters.forEach(el => io.observe(el));
  }

  /* ── TESTIMONIALS ──────────────────────────────────────────── */
  function initTestimonials() {
    const cards = document.querySelectorAll('.t-card');
    const dots  = document.querySelectorAll('.t-dot');
    if (!cards.length) return;

    let current = 0;
    let timer;

    function goTo(idx) {
      cards[current].classList.remove('active');
      dots[current].classList.remove('active');
      current = ((idx % cards.length) + cards.length) % cards.length;
      cards[current].classList.add('active');
      dots[current].classList.add('active');
    }

    function startAuto() {
      timer = setInterval(() => goTo(current + 1), 5500);
    }

    dots.forEach(dot => {
      dot.addEventListener('click', () => {
        clearInterval(timer);
        goTo(parseInt(dot.dataset.idx, 10));
        startAuto();
      });
    });

    startAuto();
  }

  /* ── CONTACT FORM ──────────────────────────────────────────── */
  function initForm() {
    const form = document.getElementById('contact-form');
    const btn  = document.getElementById('form-submit');
    if (!form || !btn) return;

    // Real-time validation feedback
    form.querySelectorAll('.form-input, .form-select').forEach(field => {
      field.addEventListener('blur', () => validateField(field));
      field.addEventListener('input', () => {
        if (field.classList.contains('error')) validateField(field);
      });
    });

    function validateField(field) {
      const val = field.value.trim();
      if (!val) {
        field.classList.add('error');
        field.style.borderColor = '#DC2626';
      } else {
        field.classList.remove('error');
        field.style.borderColor = '';
      }
    }

    form.addEventListener('submit', async e => {
      e.preventDefault();

      // Validate all required fields
      const required = form.querySelectorAll('[required]');
      let valid = true;
      required.forEach(field => {
        if (!field.value.trim()) { validateField(field); valid = false; }
      });

      if (!valid) {
        btn.style.transform = 'translateX(-6px)';
        setTimeout(() => btn.style.transform = 'translateX(6px)', 80);
        setTimeout(() => btn.style.transform = '', 160);
        return;
      }

      // Collect data
      const data = {
        name:    form.querySelector('[name="name"]')?.value.trim(),
        phone:   form.querySelector('[name="phone"]')?.value.trim(),
        city:    form.querySelector('[name="city"]')?.value.trim(),
        service: form.querySelector('[name="service"]')?.value.trim(),
      };

      // Submit state
      const originalText   = btn.textContent;
      btn.textContent      = '⏳ Sending Request…';
      btn.disabled         = true;
      btn.style.opacity    = '.75';

      try {
        // Try API submission first
        const res = await fetch('/api/leads', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', 'x-source': 'website-form' },
          body:    JSON.stringify(data),
        });
        const json = await res.json();

        if (json.success) {
          // Fire analytics
          if (typeof window.trackFormSubmit === 'function') window.trackFormSubmit(data);

          btn.textContent      = '✓ Request Received! We\'ll call within 2 hours.';
          btn.style.background = '#155A3D';
          btn.style.opacity    = '1';
          btn.disabled         = false;

          // Confetti effect
          spawnConfetti();

          setTimeout(() => {
            form.reset();
            btn.textContent      = originalText;
            btn.style.background = '';
          }, 5000);
        } else {
          throw new Error(json.message || 'Submission failed');
        }
      } catch (err) {
        console.warn('[Form] API unavailable, using fallback:', err.message);
        // Fallback: store in localStorage
        const leads = JSON.parse(localStorage.getItem('bpc_leads') || '[]');
        leads.unshift({ ...data, id: Date.now(), date: new Date().toISOString(), status: 'new' });
        localStorage.setItem('bpc_leads', JSON.stringify(leads));

        if (typeof window.trackFormSubmit === 'function') window.trackFormSubmit(data);

        btn.textContent      = '✓ Request Received! We\'ll call within 2 hours.';
        btn.style.background = '#155A3D';
        btn.style.opacity    = '1';
        btn.disabled         = false;

        setTimeout(() => {
          form.reset();
          btn.textContent      = originalText;
          btn.style.background = '';
        }, 5000);
      }
    });
  }

  /* ── CONFETTI CELEBRATION ──────────────────────────────────── */
  function spawnConfetti() {
    const colors = ['#1B7D4B', '#D4AF37', '#4CAF7A', '#1A2332', '#fff'];
    for (let i = 0; i < 60; i++) {
      const el = document.createElement('div');
      el.style.cssText = `
        position:fixed;top:0;left:${Math.random()*100}vw;
        width:${6+Math.random()*8}px;height:${6+Math.random()*8}px;
        background:${colors[Math.floor(Math.random()*colors.length)]};
        border-radius:${Math.random()>.5?'50%':'2px'};
        pointer-events:none;z-index:9999;
        animation:confetti-fall ${1.5+Math.random()*2}s ease-in forwards;
        animation-delay:${Math.random()*0.5}s;
        transform:rotate(${Math.random()*360}deg);
      `;
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 3500);
    }
    // Add keyframe if not present
    if (!document.getElementById('confetti-style')) {
      const s = document.createElement('style');
      s.id = 'confetti-style';
      s.textContent = '@keyframes confetti-fall{0%{transform:translateY(-10px) rotate(0deg);opacity:1}100%{transform:translateY(100vh) rotate(720deg);opacity:0}}';
      document.head.appendChild(s);
    }
  }

  /* ── SMOOTH NAV ────────────────────────────────────────────── */
  function initNav() {
    document.querySelectorAll('a[href^="#"]').forEach(a => {
      a.addEventListener('click', e => {
        const id = a.getAttribute('href');
        if (id === '#') return;
        const target = document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        const offset = 80;
        const top = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: 'smooth' });
      });
    });
  }

  /* ── MAP MARKERS ───────────────────────────────────────────── */
  function initMapMarkers() {
    document.querySelectorAll('.map-city-marker').forEach(m => {
      m.addEventListener('mouseenter', () => {
        const dot = m.querySelector('.marker-dot');
        if (dot) { dot.setAttribute('r', '9'); }
      });
      m.addEventListener('mouseleave', () => {
        const dot = m.querySelector('.marker-dot');
        if (dot) { dot.setAttribute('r', '6'); }
      });
    });
  }

  /* ── WHY CARDS SUBTLE HOVER ────────────────────────────────── */
  function initWhyCards() {
    document.querySelectorAll('.why-card').forEach(card => {
      card.addEventListener('mouseenter', () => {
        const ico = card.querySelector('.why-card-ico');
        if (ico) ico.style.transform = 'scale(1.1) rotate(-5deg)';
      });
      card.addEventListener('mouseleave', () => {
        const ico = card.querySelector('.why-card-ico');
        if (ico) ico.style.transform = '';
      });
    });
  }

  /* ── SERVICE CARD HOVER ────────────────────────────────────── */
  function initServiceCards() {
    document.querySelectorAll('.service-card').forEach(card => {
      const ico = card.querySelector('.service-ico');
      if (!ico) return;
      // Already handled by CSS, but add ARIA for keyboard nav
      card.setAttribute('tabindex', '0');
    });
  }

  /* ── HERO ENTRANCE ─────────────────────────────────────────── */
  function initHeroEntrance() {
    // Stagger hero reveals on load
    const heroEls = document.querySelectorAll('#hero .reveal');
    heroEls.forEach((el, i) => {
      setTimeout(() => {
        el.classList.add('revealed');
      }, 100 + i * 150);
    });
  }

  /* ── PARALLAX ──────────────────────────────────────────────── */
  function initParallax() {
    const orbWrap = document.querySelector('.orb-wrap');
    if (!orbWrap) return;
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const y = window.scrollY;
          if (y < window.innerHeight) {
            orbWrap.style.transform = `translateY(${y * 0.08}px)`;
          }
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }

  /* ── INIT ──────────────────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', () => {
    buildTicker();
    initReveal();
    initCounters();
    initTestimonials();
    initForm();
    initNav();
    initMapMarkers();
    initWhyCards();
    initServiceCards();
    initHeroEntrance();
    initParallax();
  });

})();
