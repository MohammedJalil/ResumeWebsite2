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
    initProjectCards();
    initScrollProgress();
    initMagneticButtons();
    initSkillBars();
    initProjectModals();
    // Register service worker for PWA offline shell
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/js/sw.js').catch(() => { });
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
function initProjectFilters() {
  const filters = document.querySelectorAll('.filter');
  const cards = document.querySelectorAll('.project-card');
  if (!filters.length || !cards.length) return;
  filters.forEach(btn => {
    btn.addEventListener('click', () => {
      filters.forEach(b => {
        b.classList.remove('is-active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('is-active');
      btn.setAttribute('aria-selected', 'true');
      const cat = btn.dataset.filter;
      cards.forEach(card => {
        const c = card.getAttribute('data-cat');
        const show = cat === 'all' || c === cat;
        if (show) {
          card.style.display = '';
          // Force image resize after display change
          const img = card.querySelector('.project-card__img');
          if (img) {
            // Trigger reflow to ensure proper sizing
            void img.offsetWidth;
          }
        } else {
          card.style.display = 'none';
        }
      });
    });
  });
}

// Enhanced project card interactions
function initProjectCards() {
  const clickableCards = document.querySelectorAll('.project-card--link');

  clickableCards.forEach(card => {
    // Add keyboard navigation support
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        card.click();
      }
    });

    // Update overlay text for modal
    const overlay = card.querySelector('.project-card__overlay');
    if (overlay) {
      const text = overlay.querySelector('p');
      if (text) {
        text.textContent = 'View Details →';
      }
    }
  });
}

// Scroll Progress Bar
function initScrollProgress() {
  const progressBar = document.querySelector('.scroll-progress');
  if (!progressBar) return;

  function updateProgress() {
    const windowHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrolled = (window.scrollY / windowHeight) * 100;
    progressBar.style.width = `${scrolled}%`;
  }

  window.addEventListener('scroll', updateProgress, { passive: true });
  updateProgress();
}

// Magnetic Buttons
function initMagneticButtons() {
  const magneticButtons = document.querySelectorAll('.btn--magnetic');
  if (!magneticButtons.length) return;

  magneticButtons.forEach(btn => {
    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;

      const moveX = x * 0.15;
      const moveY = y * 0.15;

      btn.style.transform = `translate(${moveX}px, ${moveY}px) scale(1.05)`;
    });

    btn.addEventListener('mouseleave', () => {
      btn.style.transform = '';
    });
  });
}

// Animated Skill Bars
function initSkillBars() {
  const skillBars = document.querySelectorAll('.skill-bar__fill');
  if (!skillBars.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const skillLevel = entry.target.getAttribute('data-skill');
          entry.target.style.width = `${skillLevel}%`;
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.5 }
  );

  skillBars.forEach(bar => observer.observe(bar));
}

// Project Modals
function initProjectModals() {
  const projectCards = document.querySelectorAll('.project-card--link[data-project]');
  const modal = document.getElementById('projectModal');
  if (!modal || !projectCards.length) return;

  const modalTitle = modal.querySelector('#modalTitle');
  const modalImage = modal.querySelector('.modal__image-container');
  const modalProblem = modal.querySelector('.modal__problem');
  const modalTags = modal.querySelector('.modal__tags');
  const modalOutcome = modal.querySelector('.modal__outcome');
  const modalGithubLink = modal.querySelector('.modal__github-link');
  const modalClose = modal.querySelector('.modal__close');
  const modalBackdrop = modal.querySelector('.modal__backdrop');

  // Project data
  const projectData = {
    'air-pollution': {
      title: 'Ambient Air Pollution Prediction',
      image: 'assets/air-pollution-model.png',
      problem: 'Predicting PM2.5 levels across the U.S. is challenging due to complex environmental factors, spatial variability, and the need for accurate real-time forecasting to support public health decisions.',
      tech: ['Python', 'Pandas', 'Scikit-learn', 'XGBoost', 'Random Forest'],
      outcome: 'Built multiple predictive models (Random Forest, XGBoost, k-NN, Lasso) achieving competitive RMSE scores. Performed comprehensive EDA, feature selection, and cross-validation to ensure model reliability.',
      github: 'https://github.com/MohammedJalil/Air-Pollution-Predictive-Model'
    },
    'rna-seq': {
      title: 'RNA-Seq Gene Expression Analysis',
      image: 'assets/rna-seq-analysis.png',
      problem: 'Identifying differentially expressed genes in RNA-Seq data requires robust statistical methods to handle count data, normalization challenges, and multiple testing corrections.',
      tech: ['R', 'DESeq2', 'Bioconductor', 'ggplot2'],
      outcome: 'Successfully performed differential expression analysis using DESeq2, with proper normalization and QC. Generated publication-quality visualizations including PCA plots, volcano plots, and heatmaps to identify key gene expression patterns.',
      github: 'https://github.com/MohammedJalil/rna-seq-analysis'
    },
    'intellivest': {
      title: 'IntelliVest Investment Analytics Platform',
      image: 'assets/intellivest-dashboard.png',
      problem: 'Investors need real-time market data, portfolio optimization tools, and interactive visualizations to make informed investment decisions efficiently.',
      tech: ['Python', 'Streamlit', 'Pandas', 'yfinance', 'Plotly', 'Machine Learning'],
      outcome: 'Developed a comprehensive investment analytics platform with real-time market data integration, portfolio optimization algorithms, and interactive dashboards. The platform enables users to analyze stocks, optimize portfolios, and visualize performance metrics.',
      github: 'https://github.com/MohammedJalil/intellivest'
    }
  };

  function openModal(projectId) {
    const data = projectData[projectId];
    if (!data) return;

    modalTitle.textContent = data.title;
    modalImage.innerHTML = `<img src="${data.image}" alt="${data.title}" loading="lazy">`;
    modalProblem.textContent = data.problem;
    modalOutcome.textContent = data.outcome;
    modalGithubLink.href = data.github;

    // Update tags
    modalTags.innerHTML = '';
    data.tech.forEach(tech => {
      const tag = document.createElement('span');
      tag.className = 'tag';
      tag.textContent = tech;
      modalTags.appendChild(tag);
    });

    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    modalClose.focus();
  }

  function closeModal() {
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  // Open modal on card click
  projectCards.forEach(card => {
    card.addEventListener('click', (e) => {
      e.preventDefault();
      const projectId = card.getAttribute('data-project');
      if (projectId) {
        openModal(projectId);
      }
    });
  });

  // Close modal
  modalClose.addEventListener('click', closeModal);
  modalBackdrop.addEventListener('click', closeModal);

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.getAttribute('aria-hidden') === 'false') {
      closeModal();
    }
  });
}

// Mobile nav drawer with focus trap
function initMobileDrawer() {
  const btn = document.getElementById('hamburger');
  const drawer = document.getElementById('mobile-drawer');
  const panel = drawer?.querySelector('.drawer__panel');
  const closeBtn = document.getElementById('drawerClose');
  const backdrop = drawer?.querySelector('.drawer__backdrop');
  if (!btn || !drawer || !panel || !backdrop || !closeBtn) return;
  let lastFocus;
  function open() {
    lastFocus = document.activeElement;
    drawer.classList.add('is-open');
    btn.classList.add('is-open');
    btn.setAttribute('aria-expanded', 'true');
    drawer.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    panel.focus();
  }
  function close() {
    drawer.classList.remove('is-open');
    btn.classList.remove('is-open');
    btn.setAttribute('aria-expanded', 'false');
    drawer.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    lastFocus && lastFocus.focus();
  }
  panel.setAttribute('tabindex', '-1');
  btn.addEventListener('click', () => { drawer.classList.contains('is-open') ? close() : open(); });
  closeBtn.addEventListener('click', close);
  backdrop.addEventListener('click', close);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && drawer.classList.contains('is-open')) close(); });
  // basic focus trap
  drawer.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const focusables = drawer.querySelectorAll('a, button, [tabindex="0"]');
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
}


