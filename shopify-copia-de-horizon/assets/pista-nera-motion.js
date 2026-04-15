(() => {
  const reveals = document.querySelectorAll('[data-pn-reveal]');
  if (!reveals.length) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (prefersReducedMotion) {
    reveals.forEach((element) => element.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    },
    {
      rootMargin: '0px 0px -10% 0px',
      threshold: 0.12,
    }
  );

  reveals.forEach((element, index) => {
    element.style.setProperty('--pn-reveal-delay', `${Math.min(index * 60, 240)}ms`);
    observer.observe(element);
  });
})();
