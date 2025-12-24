// Page functions: header offset sync, centered scrolling, scrollspy, mobile menu toggle

// keep CSS var --header-offset synced with actual header height (handles responsive changes)
(function syncHeaderOffset(){
  const setOffset = () => {
    const header = document.querySelector('.site-header');
    const h = header ? header.offsetHeight : 0;
    document.documentElement.style.setProperty('--header-offset', h + 'px');
  };
  setOffset();
  window.addEventListener('resize', setOffset);
  window.addEventListener('orientationchange', setOffset);
  document.addEventListener('DOMContentLoaded', setOffset);
})();

// helper to read header offset (falls back to measured header height)
function _getHeaderOffsetPx(){
  const root = getComputedStyle(document.documentElement);
  const val = root.getPropertyValue('--header-offset') || '';
  const parsed = parseFloat(val);
  if(!isNaN(parsed)) return parsed;
  const header = document.querySelector('.site-header');
  return header ? header.offsetHeight : 0;
}

// Setup other behaviors after DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // centered scrolling for navigation links (considers header height)
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const href = this.getAttribute('href');
      if(!href || href === '#') return;
      e.preventDefault();
      const target = document.querySelector(href);
      if (!target) return;

      const headerOffset = _getHeaderOffsetPx();
      const rect = target.getBoundingClientRect();
      const targetTop = rect.top + window.scrollY;
      const targetCenter = targetTop + (rect.height / 2);
      let scrollTo = Math.round(targetCenter - (window.innerHeight / 2) - headerOffset);

      // clamp to document range
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      scrollTo = Math.max(0, Math.min(scrollTo, maxScroll));

      window.scrollTo({ top: scrollTo, behavior: 'smooth' });
      // update URL hash without jumping
      try { history.pushState(null, '', href); } catch(e) { /* ignore */ }
    });
  });

  // scrollspy for single-page nav
  (function(){
    const links = document.querySelectorAll('nav a.navlink');
    const sections = Array.from(document.querySelectorAll('section[id]'));
    function onScroll(){
      const offset = window.innerHeight * 0.35;
      let current = sections[0];
      for(const sec of sections){
        const rect = sec.getBoundingClientRect();
        if(rect.top <= offset) current = sec;
      }
      links.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#'+current.id));
    }
    window.addEventListener('scroll', onScroll, {passive:true});
    onScroll();
  })();

  // mobile menu toggle
  (function(){
    const menuBtn = document.querySelector('.menu-btn');
    const navLinks = document.querySelector('.nav-links');
    if(menuBtn && navLinks){
      menuBtn.addEventListener('click', () => {
        const opened = navLinks.classList.toggle('active');
        menuBtn.setAttribute('aria-expanded', opened ? 'true' : 'false');
      });
      navLinks.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
        navLinks.classList.remove('active');
        menuBtn.setAttribute('aria-expanded', 'false');
      }));
    }
  })();

});

/* Matrix-style falling characters in sub-footer */
(function(){
  // Clean, reliable matrix renderer
  function initMatrix(){
    const canvas = document.getElementById('matrix-canvas');
    if(!canvas) return;
    const ctx = canvas.getContext('2d');

    // Haikus will drop as whole streams
    // source: https://www.masterpiece-of-japanese-culture.com/literatures-and-poems/most-famous-10-haiku-poems-in-japanese-and-english
    const haikus = [
      '古池や 蛙飛び込む 水の音',
      '春の海 ひねもすのたり のたりかな',
      '痩蛙 負けるな一茶 是にあり',
      '菜の花や 月は東に 日は西に',
      '閑けさや 岩にしみいる 蝉の声',
      '柿くへば 鐘が鳴るなり 法隆寺',
      '目には青葉 山ほとゝぎす はつ松魚',
      '降る雪や 明治は遠く なりにけり',
      '朝顔に 釣瓶とられて もらひ水',
      '梅一輪 一輪ほどの 暖かさ'
    ];

    let width = 0, height = 0, columns = 0, drops = [];
    let rafId = null;
    let lastTime = 0;

    function getVar(name, fallback){
      const v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name));
      return Number.isFinite(v) ? v : fallback;
    }

    function resize(){
      const ratio = window.devicePixelRatio || 1;
      const baseCharSize = getVar('--matrix-char-size', 18);
      const charSize = Math.max(8, baseCharSize) * ratio;
      width = Math.max(300, canvas.clientWidth) * ratio;
      height = (getVar('--matrix-height', 140)) * ratio;
      canvas.width = Math.round(width);
      canvas.height = Math.round(height);
      ctx.textBaseline = 'top';
      ctx.font = Math.round(charSize) + 'px ' + (getComputedStyle(document.documentElement).getPropertyValue('--font-mono') || 'monospace');
      columns = Math.max(2, Math.floor(width / charSize));
      drops = new Array(columns).fill(0).map(() => Math.floor(Math.random() * 50));
    }

    function render(time){
      const interval = getVar('--matrix-interval', 120); // ms
      if(!lastTime) lastTime = time;
      const elapsed = time - lastTime;
      if(elapsed < interval){
        rafId = requestAnimationFrame(render);
        return;
      }
      lastTime = time;

      // paint a semi-opaque rect to fade previous frame quickly (short trails)
      const trailAlpha = getVar('--matrix-trail-alpha', 0.85);
      ctx.fillStyle = `rgba(2,12,27,${trailAlpha})`;
      ctx.fillRect(0, 0, width, height);

      const accent = (getComputedStyle(document.documentElement).getPropertyValue('--accent') || getComputedStyle(document.documentElement).getPropertyValue('--green') || '#64ffda').trim();
      ctx.shadowBlur = 0;
      ctx.shadowColor = 'transparent';

      const ratio = window.devicePixelRatio || 1;
      const baseCharSize = getVar('--matrix-char-size', 18);
      const charSize = Math.max(8, baseCharSize) * ratio;
      const speed = getVar('--matrix-speed', 0.04);
      const density = Math.min(1, Math.max(0.01, getVar('--matrix-density', 0.15)));
      const charAlpha = getVar('--matrix-char-alpha', 1.0);

      // track assigned haiku per column using dropsHaiku array; -1 means inactive
      if(!Array.isArray(drops.haikuIndex)) drops.haikuIndex = new Array(columns).fill(-1);

      for(let i = 0; i < columns; i++){
        // chance to start a new haiku in this column
        if(drops.haikuIndex[i] === -1){
          if(Math.random() < density){
            drops.haikuIndex[i] = Math.floor(Math.random() * haikus.length);
            drops[i] = -Math.floor(Math.random() * 6); // start slightly above view for stagger
          } else {
            // tiny drift when inactive
            drops[i] += speed * 0.05;
            continue;
          }
        }

        const haiku = haikus[drops.haikuIndex[i]] || '';
        const chars = haiku.split('');
        const x = Math.round(i * charSize);
        const headY = Math.round(drops[i] * charSize);

        // draw the haiku vertically: characters from 0..n-1 stacked above the head
        for(let j = 0; j < chars.length; j++){
          const ch = chars[j];
          const y = headY - ((chars.length - 1 - j) * charSize);
          if(y < -charSize || y > height + charSize) continue;

          // trailing parts dimmer; head (last character) full alpha
          const isHead = (j === chars.length - 1);
          ctx.globalAlpha = isHead ? 1.0 : Math.max(0, charAlpha * 0.55);
          ctx.fillStyle = accent;
          ctx.fillText(ch, x, y);
        }

        // advance stream
        drops[i] += speed;

        // if head moved past bottom plus the haiku length, reset column
        if(headY - (chars.length * charSize) > height && Math.random() > 0.85){
          drops.haikuIndex[i] = -1;
          drops[i] = 0;
        }
      }

      ctx.globalAlpha = 1;
      rafId = requestAnimationFrame(render);
    }

    function start(){
      if(rafId) cancelAnimationFrame(rafId);
      resize();
      // quick visible check: clear and draw one light character in middle
      try{
        ctx.clearRect(0,0,canvas.width,canvas.height);
        ctx.fillStyle = accent;
        ctx.font = Math.round(getVar('--matrix-char-size',18) * (window.devicePixelRatio || 1)) + 'px ' + (getComputedStyle(document.documentElement).getPropertyValue('--font-mono') || 'monospace');
        ctx.fillText(phraseChars[0] || '本', 10, 10);
      }catch(e){}
      lastTime = 0;
      rafId = requestAnimationFrame(render);
    }

    start();
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', () => {
      if(document.hidden) { if(rafId) cancelAnimationFrame(rafId); }
      else { lastTime = 0; rafId = requestAnimationFrame(render); }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initMatrix);
  else initMatrix();
})();
