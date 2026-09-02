(function () {
  'use strict';

  // Gate the pipeline draw-in behind JS so the diagram is never invisible
  // if scripts fail to load.
  document.documentElement.classList.add('js');

  document.addEventListener('DOMContentLoaded', () => {
    const yearEl = document.getElementById('year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    // Pipeline diagram: draw in once on first view, pause the dash flow
    // while off-screen.
    const pipeline = document.getElementById('pipeline');
    if (pipeline) {
      if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                pipeline.classList.add('is-drawn');
                pipeline.classList.remove('is-paused');
              } else {
                pipeline.classList.add('is-paused');
              }
            });
          },
          { threshold: 0.25 }
        );
        observer.observe(pipeline);
      } else {
        pipeline.classList.add('is-drawn');
      }
    }

    // Service worker for offline shell
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/js/sw.js', { updateViaCache: 'none' })
        .then((registration) => registration.update())
        .catch(() => {});
    }
  });
})();
