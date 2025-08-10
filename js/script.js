(function () {
  'use strict';

  // Typing Animation
  function typeText(targetElement, fullText, options = {}) {
    const { typingSpeed = 80, startDelay = 400 } = options;
    let charIndex = 0;

    function typeNext() {
      if (!targetElement) return;
      if (charIndex <= fullText.length) {
        targetElement.textContent = fullText.slice(0, charIndex);
        charIndex += 1;
        window.requestAnimationFrame(() => {
          setTimeout(typeNext, typingSpeed);
        });
      }
    }

    setTimeout(typeNext, startDelay);
  }

  // Intersection Observer for scroll reveal
  function initScrollReveal() {
    const hiddenElements = document.querySelectorAll('.hidden');
    const revealElements = document.querySelectorAll('.reveal-on-scroll');
    if (!hiddenElements.length && !revealElements.length) return;

    const observer = new IntersectionObserver(
      (entries, obs) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            if (entry.target.classList.contains('hidden')) {
              entry.target.classList.remove('hidden');
            }
            if (entry.target.classList.contains('reveal-on-scroll')) {
              const delay = Math.random() * 120;
              setTimeout(() => entry.target.classList.add('is-visible'), delay);
            }
            obs.unobserve(entry.target);
          }
        }
      },
      {
        root: null,
        rootMargin: '0px',
        threshold: 0.15,
      }
    );

    hiddenElements.forEach((el) => observer.observe(el));
    revealElements.forEach((el) => observer.observe(el));
  }

  // Smooth scrolling for nav links
  function initSmoothScroll() {
    const links = document.querySelectorAll('a[href^="#"]');
    links.forEach((link) => {
      link.addEventListener('click', (e) => {
        const href = link.getAttribute('href');
        if (!href || href === '#') return;
        const target = document.querySelector(href);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          history.replaceState(null, '', href);
        }
      });
    });
  }

  // Active nav highlighting on scroll
  function initActiveNav() {
    const sections = document.querySelectorAll('main section[id]');
    const navLinks = document.querySelectorAll('.nav__link');

    const mapIdToLink = new Map();
    navLinks.forEach((link) => {
      const href = link.getAttribute('href');
      if (href && href.startsWith('#')) {
        mapIdToLink.set(href.slice(1), link);
      }
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const id = entry.target.id;
          const link = mapIdToLink.get(id);
          if (!link) return;
          if (entry.isIntersecting) {
            navLinks.forEach((l) => l.classList.remove('is-active'));
            link.classList.add('is-active');
            link.setAttribute('aria-current', 'page');
          } else if (link.classList.contains('is-active') && !entry.isIntersecting) {
            link.removeAttribute('aria-current');
          }
        });
      },
      { rootMargin: '-40% 0px -55% 0px', threshold: 0.01 }
    );

    sections.forEach((sec) => observer.observe(sec));
  }

  // Footer year
  function setYear() {
    const yearEl = document.getElementById('year');
    if (yearEl) {
      yearEl.textContent = new Date().getFullYear();
    }
  }

  // Initialize when DOM is ready
  document.addEventListener('DOMContentLoaded', () => {
    const typedTarget = document.getElementById('typed-text');
    const headline =
      "Hi, I'm Mohammed — Data Analyst & Computational Biology";

    typeText(typedTarget, headline, { typingSpeed: 65, startDelay: 300 });
    initScrollReveal();
    initSmoothScroll();
    initActiveNav();
    setYear();
    initThemeToggle();
    initScrollTop();
    initCursor();
    initCopyEmail();
    initMobileDrawer();
    initProjectFilters();
    // Register service worker for PWA offline shell
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/js/sw.js').catch(() => {});
    }
  });
})();

// Theme toggle with persistence
function initThemeToggle() {
  const root = document.documentElement;
  const toggle = document.getElementById('themeToggle');
  const stored = localStorage.getItem('theme');
  if (stored === 'light') root.classList.add('light');
  updateToggleIcon();
  if (!toggle) return;
  toggle.addEventListener('click', () => {
    root.classList.toggle('light');
    const mode = root.classList.contains('light') ? 'light' : 'dark';
    localStorage.setItem('theme', mode);
    updateToggleIcon();
  });

  function updateToggleIcon() {
    const icon = toggle?.querySelector('.theme-toggle__icon');
    if (!icon) return;
    icon.textContent = root.classList.contains('light') ? '☀' : '☾';
  }
}

// removed palette toggle

// Scroll to top button
function initScrollTop() {
  const btn = document.getElementById('scrollTop');
  if (!btn) return;
  const toggleVis = () => {
    if (window.scrollY > 300) btn.classList.add('is-visible');
    else btn.classList.remove('is-visible');
  };
  toggleVis();
  window.addEventListener('scroll', toggleVis, { passive: true });
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

// Custom cursor
function initCursor() {
  const dot = document.querySelector('.cursor-dot');
  if (!dot) return;
  const update = (e) => {
    dot.style.left = `${e.clientX}px`;
    dot.style.top = `${e.clientY}px`;
  };
  window.addEventListener('mousemove', update, { passive: true });

  // Grow on interactive hover
  const interactive = 'a, button, .btn, input, textarea, select';
  document.addEventListener('mouseover', (e) => {
    if (e.target.closest(interactive)) dot.classList.add('is-hover');
  });
  document.addEventListener('mouseout', (e) => {
    if (e.target.closest(interactive)) dot.classList.remove('is-hover');
  });
}

// Contact form removed

// Copy email to clipboard with tooltip feedback
function initCopyEmail() {
  const trigger = document.querySelector('.copy-email');
  if (!trigger) return;
  trigger.addEventListener('click', async (e) => {
    const email = trigger.getAttribute('data-copy');
    if (!email) return;
    try {
      await navigator.clipboard.writeText(email);
      const original = trigger.textContent;
      trigger.textContent = 'Copied!';
      setTimeout(() => (trigger.textContent = original), 1200);
    } catch (err) {
      // noop
    }
  });
}

// Project filters (All / categories)
function initProjectFilters(){
  const filters = document.querySelectorAll('.filter');
  const cards = document.querySelectorAll('.project-card');
  if(!filters.length || !cards.length) return;
  filters.forEach(btn=>{
    btn.addEventListener('click',()=>{
      filters.forEach(b=>b.classList.remove('is-active'));
      btn.classList.add('is-active');
      const cat = btn.dataset.filter;
      cards.forEach(card=>{
        const c = card.getAttribute('data-cat');
        const show = cat==='all' || c===cat;
        card.style.display = show ? '' : 'none';
      });
    });
  });
}

// Mobile nav drawer with focus trap
function initMobileDrawer(){
  const btn = document.getElementById('hamburger');
  const drawer = document.getElementById('mobile-drawer');
  const panel = drawer?.querySelector('.drawer__panel');
  const closeBtn = document.getElementById('drawerClose');
  const backdrop = drawer?.querySelector('.drawer__backdrop');
  if(!btn || !drawer || !panel || !backdrop || !closeBtn) return;
  let lastFocus;
  function open(){
    lastFocus = document.activeElement;
    drawer.classList.add('is-open');
    btn.classList.add('is-open');
    btn.setAttribute('aria-expanded','true');
    drawer.setAttribute('aria-hidden','false');
    document.body.style.overflow='hidden';
    panel.focus();
  }
  function close(){
    drawer.classList.remove('is-open');
    btn.classList.remove('is-open');
    btn.setAttribute('aria-expanded','false');
    drawer.setAttribute('aria-hidden','true');
    document.body.style.overflow='';
    lastFocus && lastFocus.focus();
  }
  panel.setAttribute('tabindex','-1');
  btn.addEventListener('click',()=>{ drawer.classList.contains('is-open')?close():open(); });
  closeBtn.addEventListener('click', close);
  backdrop.addEventListener('click', close);
  document.addEventListener('keydown', (e)=>{ if(e.key==='Escape' && drawer.classList.contains('is-open')) close(); });
  // basic focus trap
  drawer.addEventListener('keydown',(e)=>{
    if(e.key!=='Tab') return;
    const focusables = drawer.querySelectorAll('a, button, [tabindex="0"]');
    const first = focusables[0];
    const last = focusables[focusables.length-1];
    if(e.shiftKey && document.activeElement===first){ e.preventDefault(); last.focus(); }
    else if(!e.shiftKey && document.activeElement===last){ e.preventDefault(); first.focus(); }
  });
}


