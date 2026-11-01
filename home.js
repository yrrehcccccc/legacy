(() => {
  'use strict';
  const poster = document.querySelector('#homePoster');
  if (!poster) return;
  const settings = document.querySelector('#settingsPanel');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const mobileLayout = matchMedia('(max-width:640px)');
  const reveal = [...poster.querySelectorAll('[data-reveal]')];
  if ('IntersectionObserver' in window) {
    const readyImages = elements => Promise.allSettled([...elements].map(image =>
      image.complete ? Promise.resolve() : (image.decode?.() ?? Promise.resolve())
    ));
    const visualReady = readyImages(poster.querySelectorAll('.legacy-visual img'));
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        const ready = entry.target.matches('.legacy-visual') ? visualReady : readyImages(entry.target.querySelectorAll('img'));
        ready.then(() => entry.target.classList.add('is-visible'));
      });
    }, { threshold:.08, rootMargin:'0px 0px -10% 0px' });
    reveal.forEach(layer => observer.observe(layer));
    document.body.classList.add('legacy-motion-ready');
  }

  let bottomTimer = 0;
  let navigationTimer = 0;
  let leaving = false;
  let userScroll = false;
  let lastScroll = scrollY;
  let frame = 0;
  let backgroundSpeed = 0;
  let backgroundStart = 0;
  let backgroundEnd = 0;
  let backgroundTravel = 0;
  function drawBackground() {
    const scroll = Math.min(backgroundTravel,Math.max(0,scrollY));
    const offset = backgroundTravel - scroll <= 3
      ? backgroundEnd : backgroundStart - scroll * backgroundSpeed;
    document.body.style.setProperty('--legacy-back-y',offset + 'px');
  }
  function measureBackground() {
    const travel = Math.max(0,document.documentElement.scrollHeight - innerHeight);
    let height;
    if (mobileLayout.matches) {
      // Keep the supplied 1080 x 2832 sheet at its natural width-based height.
      const naturalHeight = poster.clientWidth * 2832 / 1080;
      // The light paper ends at source row 2225; keep it across the first screen.
      height = Math.max((innerHeight + 1) * 2832 / 2225,naturalHeight);
      // Keep the slower pan within the natural image bounds.
      const availableTravel = Math.max(0,height - innerHeight) * .85;
      backgroundSpeed = reducedMotion.matches || !travel ? 0 : Math.min(.3,availableTravel / travel);
    } else {
      backgroundSpeed = reducedMotion.matches ? 0 : .3;
      // Cover preserves the wide image's aspect ratio while allowing a slower pan.
      height = innerHeight + travel * backgroundSpeed;
    }
    backgroundTravel = travel;
    backgroundEnd = innerHeight - height;
    if (mobileLayout.matches) {
      // Start at the top of the supplied sheet; surplus stays below the viewport.
      backgroundStart = 0;
      backgroundEnd = -travel * backgroundSpeed;
    } else {
      backgroundStart = Math.min(0,backgroundEnd + travel * backgroundSpeed);
    }
    document.body.style.setProperty('--legacy-back-height',height + 'px');
    drawBackground();
  }
  function atBottom() {
    return scrollY > 0 && document.documentElement.scrollHeight - innerHeight - scrollY <= 3;
  }
  function canEnter() {
    return !leaving && !document.hidden && !settings?.classList.contains('open');
  }
  function cancelEntry() {
    clearTimeout(bottomTimer);
    bottomTimer = 0;
  }
  function enterChapter() {
    if (!canEnter()) return;
    leaving = true;
    cancelEntry();
    document.body.classList.add('legacy-leaving');
    navigationTimer = setTimeout(() => {
      try { sessionStorage.setItem('legacy-chapter-entry',String(Date.now())); } catch {}
      location.assign('intro.html');
    }, reducedMotion.matches ? 0 : 520);
  }
  function queueEntry() {
    if (!userScroll || !atBottom() || !canEnter()) { cancelEntry(); return; }
    // Further scroll gestures at the bottom cannot postpone the original dwell.
    if (bottomTimer) return;
    bottomTimer = setTimeout(() => {
      bottomTimer = 0;
      if (atBottom()) enterChapter();
    },500);
  }
  function checkScroll() {
    frame = 0;
    drawBackground();
    if (scrollY < lastScroll || !atBottom()) cancelEntry();
    else queueEntry();
    lastScroll = scrollY;
  }
  addEventListener('scroll',() => {
    if (!frame) frame = requestAnimationFrame(checkScroll);
  },{ passive:true });
  addEventListener('resize',measureBackground,{ passive:true });
  reducedMotion.addEventListener?.('change',measureBackground);
  mobileLayout.addEventListener?.('change',measureBackground);
  addEventListener('wheel',event => {
    if (settings?.contains(event.target)) return;
    userScroll = true;
    if (event.deltaY > 0) queueEntry();
    else if (event.deltaY < 0) cancelEntry();
  },{ passive:true });
  poster.addEventListener('touchstart',() => { userScroll = true; },{ passive:true });
  addEventListener('pointerdown',() => { userScroll = true; },{ passive:true });
  addEventListener('keydown',event => {
    if (['ArrowDown','ArrowUp','PageDown','PageUp','End','Home',' '].includes(event.key)) userScroll = true;
    if (['ArrowUp','PageUp','Home'].includes(event.key)) cancelEntry();
    else if (['ArrowDown','PageDown','End',' '].includes(event.key)) queueEntry();
  });
  poster.addEventListener('click',event => {
    const link = event.target.closest('[data-enter-chapter]');
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    enterChapter();
  });
  document.addEventListener('visibilitychange',() => {
    cancelEntry();
    if (!document.hidden) queueEntry();
  });
  if (settings) new MutationObserver(() => {
    if (settings.classList.contains('open')) cancelEntry();
  }).observe(settings,{ attributes:true,attributeFilter:['class'] });
  addEventListener('pagehide',() => { cancelEntry();clearTimeout(navigationTimer); });
  addEventListener('pageshow',() => {
    cancelEntry();clearTimeout(navigationTimer);
    leaving = false;userScroll = false;lastScroll = scrollY;
    document.body.classList.remove('legacy-leaving');
    measureBackground();
  });
  measureBackground();
})();
