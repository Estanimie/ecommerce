(() => {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) return;

  const setPointerVars = (element, x, y) => {
    element.style.setProperty('--pn-pointer-x', `${x}%`);
    element.style.setProperty('--pn-pointer-y', `${y}%`);
    element.style.setProperty('--pn-tilt-x', `${(y - 50) / -12}deg`);
    element.style.setProperty('--pn-tilt-y', `${(x - 50) / 12}deg`);
  };

  document.querySelectorAll('[data-pn-parallax]').forEach((element) => {
    setPointerVars(element, 50, 50);

    element.addEventListener('pointermove', (event) => {
      const bounds = element.getBoundingClientRect();
      const x = ((event.clientX - bounds.left) / bounds.width) * 100;
      const y = ((event.clientY - bounds.top) / bounds.height) * 100;
      setPointerVars(element, x, y);
    });

    element.addEventListener('pointerleave', () => setPointerVars(element, 50, 50));
  });

  document.querySelectorAll('[data-pn-gallery-frame]').forEach((frame) => {
    setPointerVars(frame, 50, 50);

    frame.addEventListener('pointermove', (event) => {
      const bounds = frame.getBoundingClientRect();
      const x = ((event.clientX - bounds.left) / bounds.width) * 100;
      const y = ((event.clientY - bounds.top) / bounds.height) * 100;
      frame.style.setProperty('--pn-glow-x', `${x}%`);
      frame.style.setProperty('--pn-glow-y', `${y}%`);
      frame.style.setProperty('--pn-zoom', '1.05');
      setPointerVars(frame, x, y);
    });

    frame.addEventListener('pointerleave', () => {
      frame.style.setProperty('--pn-glow-x', '50%');
      frame.style.setProperty('--pn-glow-y', '50%');
      frame.style.setProperty('--pn-zoom', '1');
      setPointerVars(frame, 50, 50);
    });
  });

  const reveals = document.querySelectorAll('[data-pn-reveal]');
  if (!reveals.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    {
      rootMargin: '0px 0px -12% 0px',
      threshold: 0.16,
    }
  );

  reveals.forEach((element, index) => {
    element.style.setProperty('--pn-reveal-delay', `${Math.min(index * 55, 240)}ms`);
    observer.observe(element);
  });
})();
