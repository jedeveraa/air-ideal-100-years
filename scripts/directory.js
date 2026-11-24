/* Project directory (from 100-years-v2): clicking a row (or tabbing to it) makes it active
   and swaps the photo and caption on the right. Click cross-fades the photo; keyboard focus swaps instantly. */
(() => {
  const rows = [...document.querySelectorAll('.project')];
  const slides = [...document.querySelectorAll('.preview .slide')];
  const pName = document.getElementById('preview-name');
  const pWhere = document.getElementById('preview-where');
  if (!rows.length || !slides.length) return;

  const select = row => {
    rows.forEach(r => { const on = r === row; r.classList.toggle('is-active', on); r.setAttribute('aria-pressed', String(on)); });
    slides.forEach(s => s.classList.toggle('is-active', s.dataset.p === row.dataset.i));
    pName.textContent = row.querySelector('.name').textContent;
    pWhere.textContent = row.querySelector('.where').textContent + ', ' + row.querySelector('.year').textContent;
  };
  // Keyboard focus swaps instantly (no crossfade): tabbing through 5 rows shouldn't stack 5 fades.
  const preview = slides[0].parentElement;
  const selectInstant = row => {
    preview.classList.add('is-instant');
    select(row);
    void preview.offsetWidth;   // commit the new opacities without a transition
    preview.classList.remove('is-instant');
  };
  rows.forEach(r => {
    r.addEventListener('click', () => select(r));
    r.addEventListener('focus', () => { if (r.matches(':focus-visible')) selectInstant(r); });
  });
})();
