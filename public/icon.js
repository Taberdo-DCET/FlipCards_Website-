['.social-icon img', '.music-icon img'].forEach(selector => {
  document.querySelectorAll(selector).forEach(img => {
    const hoverSrc = img.getAttribute('data-hover');
    const defaultSrc = img.getAttribute('data-default');

    img.addEventListener('mouseenter', () => {
      img.src = hoverSrc;
    });

    img.addEventListener('mouseleave', () => {
      img.src = defaultSrc;
    });
  });
});
