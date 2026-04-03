document.addEventListener('DOMContentLoaded', () => {
  const track = document.querySelector('.carousel-track');
  const arrow = document.querySelector('.carousel-arrow');

  if (!track || !arrow) return;

  const scrollAmount = 310;

  arrow.addEventListener('click', () => {
    const maxScroll = track.scrollWidth - track.clientWidth;
    if (track.scrollLeft >= maxScroll - 10) {
      track.scrollTo({ left: 0, behavior: 'smooth' });
    } else {
      track.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  });
});
