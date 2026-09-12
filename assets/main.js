/* =========================================================
   ALGOO — Landing page interactions
   GSAP + ScrollTrigger + SplitText + Lenis
========================================================== */
(function () {
  'use strict';

  var hasGSAP = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  var hasLenis = typeof window.Lenis !== 'undefined';
  var hasSplit = typeof window.SplitText !== 'undefined';
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var lenis = null;
  var navH = 76;

  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  /* ---------------------------------------------------------
     Fallback: tanpa GSAP tampilkan konten normal + reveal IO
  --------------------------------------------------------- */
  function initFallback() {
    document.documentElement.classList.add('no-gsap');
    var loader = $('#loader');
    if (loader) loader.classList.add('done');

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8%' });
    $$('.reveal').forEach(function (el) { io.observe(el); });

    document.documentElement.style.scrollBehavior = 'smooth';
    document.documentElement.style.scrollPaddingTop = navH + 20 + 'px';
  }

  /* ---------------------------------------------------------
     initLenis — smooth scroll + jembatan ke ScrollTrigger
  --------------------------------------------------------- */
  function initLenis() {
    if (!hasLenis || reduced) return;
    lenis = new Lenis({ lerp: 0.08, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  // Scroll ke target dengan offset navbar, lewat Lenis bila ada
  function scrollTo(target) {
    if (lenis) { lenis.scrollTo(target, { offset: -navH, duration: 1.4 }); return; }
    if (target === 0) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    var el = typeof target === 'string' ? $(target) : target;
    if (!el) return;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.pageYOffset - navH, behavior: 'smooth' });
  }

  function initAnchors() {
    $$('a[href^="#"]').forEach(function (link) {
      link.addEventListener('click', function (e) {
        var id = link.getAttribute('href');
        if (!id || id === '#') return;
        var target = $(id);
        if (!target) return;
        e.preventDefault();
        closeMenu();
        scrollTo(target);
      });
    });
  }

  /* ---------------------------------------------------------
     initLoader — logo clip reveal, garis progress, tirai naik
  --------------------------------------------------------- */
  function initLoader(onDone) {
    var loader = $('#loader');
    if (!loader) { onDone(); return; }

    if (reduced) {
      gsap.set(['.loader-logo', '.loader-bar span'], { clipPath: 'none', scaleX: 1 });
      gsap.to(loader, {
        autoAlpha: 0, duration: .3,
        onComplete: function () { loader.classList.add('done'); onDone(); }
      });
      return;
    }

    var tl = gsap.timeline({
      onComplete: function () { loader.classList.add('done'); onDone(); }
    });
    tl.to('.loader-logo', { clipPath: 'inset(0 0% 0 0)', duration: .8, ease: 'expo.out' })
      .to('.loader-bar span', { scaleX: 1, duration: .55, ease: 'power2.inOut' }, '-=.45')
      .to(loader, { yPercent: -100, duration: 1, ease: 'expo.inOut' }, '+=.05');
  }

  /* ---------------------------------------------------------
     initNavbar — glass, hide-on-scroll, progress, menu mobile
  --------------------------------------------------------- */
  var menuToggle, navLinks;

  function closeMenu() {
    if (!navLinks || !navLinks.classList.contains('mobile-open')) return;
    navLinks.classList.remove('mobile-open');
    // Hapus sisa inline style dari animasi buka, agar link tidak tertinggal terlihat
    if (hasGSAP) { gsap.set(navLinks.children, { clearProps: 'all' }); }
    document.body.classList.remove('menu-open');
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.innerHTML = '<i class="fa-solid fa-bars"></i>';
    if (lenis) lenis.start();
  }

  function initNavbar() {
    var navbar = $('#navbar');
    var progress = $('#scrollProgress');
    menuToggle = $('#menuToggle');
    navLinks = $('#navLinks');

    navH = navbar.offsetHeight || navH;

    // Hamburger: buka overlay fullscreen, kunci scroll
    menuToggle.addEventListener('click', function () {
      var open = navLinks.classList.toggle('mobile-open');
      // Navbar wajib kembali ke posisi 0 SEKETIKA saat menu dibuka: selama
      // navbar punya transform, ia jadi containing block bagi overlay
      // position:fixed di dalamnya, sehingga overlay ikut tergeser & terpotong.
      if (hasGSAP) { gsap.set(navbar, { yPercent: 0 }); }
      document.body.classList.toggle('menu-open', open);
      menuToggle.setAttribute('aria-expanded', String(open));
      menuToggle.innerHTML = open ? '<i class="fa-solid fa-xmark"></i>' : '<i class="fa-solid fa-bars"></i>';
      if (lenis) { open ? lenis.stop() : lenis.start(); }
      if (open && hasGSAP && !reduced) {
        gsap.fromTo(navLinks.children,
          { y: 40, autoAlpha: 0 },
          { y: 0, autoAlpha: 1, duration: .8, stagger: .06, ease: 'expo.out', delay: .1, clearProps: 'all' });
      }
    });

    if (!hasGSAP) {
      window.addEventListener('scroll', function () {
        navbar.classList.toggle('scrolled', window.scrollY > 40);
        $('#backTop').classList.toggle('show', window.scrollY > 550);
      }, { passive: true });
      return;
    }

    // Glass setelah 40px
    ScrollTrigger.create({
      start: 'top -40',
      onUpdate: function (self) { navbar.classList.toggle('scrolled', self.scroll() > 40); },
      onToggle: function (self) { navbar.classList.toggle('scrolled', self.isActive); }
    });

    // Sembunyi saat scroll turun, muncul saat scroll naik
    if (!reduced) {
      var showNav = gsap.quickTo(navbar, 'yPercent', { duration: .5, ease: 'power3.out' });
      ScrollTrigger.create({
        start: 'top top',
        end: 'max',
        onUpdate: function (self) {
          if (navLinks.classList.contains('mobile-open')) { showNav(0); return; }
          showNav(self.direction === 1 && self.scroll() > 300 ? -110 : 0);
        }
      });
    }

    // Progress bar gold + tombol back-to-top
    var backTop = $('#backTop');
    var ring = $('circle', backTop);
    var circ = 2 * Math.PI * 26;
    ring.style.setProperty('--circ', circ);
    ScrollTrigger.create({
      start: 0, end: 'max',
      onUpdate: function (self) {
        gsap.set(progress, { scaleX: self.progress });
        ring.style.strokeDashoffset = circ * (1 - self.progress);
        backTop.classList.toggle('show', self.scroll() > 550);
      }
    });
    backTop.addEventListener('click', function () { scrollTo(0); });

    // Highlight menu aktif per section
    $$('section[id], div[id]').forEach(function (sec) {
      var link = $('.nav-links a[href="#' + sec.id + '"]');
      if (!link) return;
      ScrollTrigger.create({
        trigger: sec, start: 'top 45%', end: 'bottom 45%',
        onToggle: function (self) {
          if (!self.isActive) return;
          $$('.nav-links a').forEach(function (a) { a.classList.remove('active'); });
          link.classList.add('active');
        }
      });
    });
  }

  /* ---------------------------------------------------------
     Helper: SplitText per baris di dalam onSplit (aman resize)
  --------------------------------------------------------- */
  function splitReveal(el, trigger) {
    if (!el) return;
    if (!hasSplit || reduced) {
      gsap.fromTo(el, { autoAlpha: 0, y: 30 }, {
        autoAlpha: 1, y: 0, duration: 1, ease: 'power3.out',
        scrollTrigger: trigger ? { trigger: el, start: 'top 85%' } : undefined
      });
      return;
    }
    SplitText.create(el, {
      type: 'lines', mask: 'lines', autoSplit: true,
      onSplit: function (self) {
        return gsap.from(self.lines, {
          yPercent: 110, duration: 1.2, ease: 'expo.out', stagger: .12,
          scrollTrigger: trigger ? { trigger: el, start: 'top 80%' } : undefined
        });
      }
    });
  }

  /* ---------------------------------------------------------
     initHero — intro + parallax berlapis + mouse parallax
  --------------------------------------------------------- */
  function initHero() {
    var hero = $('#beranda');
    if (!hero) return;

    // Intro setelah loader
    var tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    tl.to('.hero-copy .eyebrow', { autoAlpha: 1, y: 0, duration: .9, startAt: { y: 20 } })
      .add(function () { splitReveal($('.hero-copy h1'), false); }, '-=.55')
      .to('.hero-copy > p', { autoAlpha: 1, y: 0, duration: 1, startAt: { y: 26 } }, '-=.75')
      .to('.hero-buttons', { autoAlpha: 1, y: 0, duration: 1, startAt: { y: 26 } }, '-=.8')
      .to('.trust-line', { autoAlpha: 1, y: 0, duration: 1, startAt: { y: 22 } }, '-=.85')
      .to('.tech-scene', { autoAlpha: 1, scale: 1, duration: 1.4, startAt: { scale: .94 } }, '-=1.2');

    if (reduced) return;

    var mm = gsap.matchMedia();

    // Desktop: parallax penuh + pin hero
    mm.add('(min-width: 1024px) and (prefers-reduced-motion: no-preference)', function () {
      var st = { trigger: hero, start: 'top top', end: 'bottom top', scrub: true };

      gsap.to('.hero-l0', { yPercent: 15, ease: 'none', scrollTrigger: st });
      gsap.to('.hero-watermark', { xPercent: -12, yPercent: 25, ease: 'none', scrollTrigger: st });
      gsap.to('.tech-scene', { yPercent: -12, rotateX: 4, ease: 'none', scrollTrigger: st });
      gsap.to('.badges', { yPercent: -70, ease: 'none', scrollTrigger: st });
      gsap.to('.f-one', { yPercent: -55, ease: 'none', scrollTrigger: st });
      gsap.to('.f-two', { yPercent: -45, ease: 'none', scrollTrigger: st });
      gsap.to('.hero-copy', { yPercent: -8, autoAlpha: .2, ease: 'none', scrollTrigger: st });

      // Hero di-pin: Quick Nav & Panduan menutupinya seperti tirai
      ScrollTrigger.create({ trigger: hero, start: 'top top', end: 'bottom top', pin: true, pinSpacing: false });

      // Mouse parallax (hanya pointer presisi)
      if (window.matchMedia('(pointer: fine)').matches) {
        var scene = $('.tech-scene');
        var sx = gsap.quickTo(scene, 'x', { duration: .8, ease: 'power3.out' });
        var sy = gsap.quickTo(scene, 'y', { duration: .8, ease: 'power3.out' });
        var chips = $$('.floating, .badges');
        var cx = chips.map(function (c) { return gsap.quickTo(c, 'x', { duration: .9, ease: 'power3.out' }); });
        var cy = chips.map(function (c) { return gsap.quickTo(c, 'y', { duration: .9, ease: 'power3.out' }); });

        var onMove = function (e) {
          var nx = (e.clientX / window.innerWidth - .5) * 2;
          var ny = (e.clientY / window.innerHeight - .5) * 2;
          sx(nx * 8); sy(ny * 8);
          cx.forEach(function (fn) { fn(nx * 18); });
          cy.forEach(function (fn) { fn(ny * 18); });
        };
        hero.addEventListener('mousemove', onMove);
        return function () { hero.removeEventListener('mousemove', onMove); };
      }
    });

    // Mobile/tablet: jarak parallax 50%, tanpa pin & mouse parallax
    mm.add('(max-width: 1023px) and (prefers-reduced-motion: no-preference)', function () {
      var st = { trigger: hero, start: 'top top', end: 'bottom top', scrub: true };
      gsap.to('.hero-l0', { yPercent: 8, ease: 'none', scrollTrigger: st });
      gsap.to('.hero-watermark', { xPercent: -6, yPercent: 12, ease: 'none', scrollTrigger: st });
      gsap.to('.hero-copy', { yPercent: -4, ease: 'none', scrollTrigger: st });
    });
  }

  /* ---------------------------------------------------------
     initQuickNav — masuk stagger dari bawah
  --------------------------------------------------------- */
  function initQuickNav() {
    gsap.from('.quick-item', {
      y: 40, autoAlpha: 0, duration: 1.1, stagger: .09, ease: 'expo.out',
      scrollTrigger: { trigger: '.quick-wrap', start: 'top 85%' }
    });
  }

  /* ---------------------------------------------------------
     initGuide — tabs + horizontal scroll storytelling
  --------------------------------------------------------- */
  function initGuide() {
    var tabs = $$('.tab-btn');
    var indicator = $('.tab-indicator');
    var panels = { android: $('#android'), iphone: $('#iphone') };

    function moveIndicator(btn) {
      if (!indicator) return;
      var parent = btn.parentElement.getBoundingClientRect();
      var r = btn.getBoundingClientRect();
      var props = { x: r.left - parent.left - 5, width: r.width };
      if (!hasGSAP) {
        indicator.style.transform = 'translateX(' + props.x + 'px)';
        indicator.style.width = props.width + 'px';
      } else if (reduced) {
        gsap.set(indicator, props);
      } else {
        gsap.to(indicator, { x: props.x, width: props.width, duration: .6, ease: 'expo.out' });
      }
    }

    function activate(name, focus) {
      tabs.forEach(function (b) {
        var on = b.dataset.tab === name;
        b.setAttribute('aria-selected', String(on));
        b.tabIndex = on ? 0 : -1;
        if (on) { moveIndicator(b); if (focus) b.focus(); }
      });

      var next = panels[name];
      var current = $('.tab-panel.active');
      if (!next || next === current) return;

      if (hasGSAP && !reduced) {
        // Crossfade 0.4s lalu refresh agar posisi horizontal tetap benar
        gsap.to(current, {
          autoAlpha: 0, duration: .2, ease: 'power2.out',
          onComplete: function () {
            current.classList.remove('active');
            next.classList.add('active');
            gsap.fromTo(next, { autoAlpha: 0 }, {
              autoAlpha: 1, duration: .4, ease: 'power2.out',
              onComplete: function () { ScrollTrigger.refresh(); }
            });
          }
        });
      } else {
        current.classList.remove('active');
        next.classList.add('active');
      }
    }

    tabs.forEach(function (btn, i) {
      btn.addEventListener('click', function () { activate(btn.dataset.tab); });
      // Navigasi keyboard panah kiri/kanan
      btn.addEventListener('keydown', function (e) {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        e.preventDefault();
        var next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
        activate(next.dataset.tab, true);
      });
    });

    var initial = tabs.filter(function (b) { return b.getAttribute('aria-selected') === 'true'; })[0] || tabs[0];
    if (initial) moveIndicator(initial);
    window.addEventListener('resize', function () {
      var active = tabs.filter(function (b) { return b.getAttribute('aria-selected') === 'true'; })[0];
      if (active) moveIndicator(active);
    });

    if (!hasGSAP) return;

    splitReveal($('.guide h2'), true);
    gsap.fromTo('.guide .eyebrow, .guide .section-head p, .device-tabs',
      { y: 30, autoAlpha: 0 },
      {
        y: 0, autoAlpha: 1, duration: 1, stagger: .08, ease: 'expo.out',
        scrollTrigger: { trigger: '.guide', start: 'top 75%' }
      });
    gsap.to('.guide-note', {
      autoAlpha: 1, y: 0, duration: 1.1, ease: 'expo.out', startAt: { y: 40 },
      scrollTrigger: { trigger: '.guide-note', start: 'top 88%' }
    });

    if (reduced) return;
    var mm = gsap.matchMedia();

    // Desktop: pin section, track bergerak horizontal
    mm.add('(min-width: 1024px) and (prefers-reduced-motion: no-preference)', function () {
      var track = $('#stepsTrack');
      var viewport = $('.steps-viewport');
      if (!track) return;

      // Kartu dibuat lebih lebar dari viewport agar ada jarak geser
      gsap.set('.steps', { width: '160%', gridTemplateColumns: 'repeat(4, minmax(0,1fr))' });

      var getShift = function () { return track.scrollWidth - viewport.offsetWidth; };

      var tl = gsap.timeline({
        scrollTrigger: {
          trigger: '#panduan',
          start: 'top top',
          end: function () { return '+=' + getShift(); },
          pin: true,
          scrub: .8,
          anticipatePin: 1,
          invalidateOnRefresh: true
        }
      });
      tl.to(track, { x: function () { return -getShift(); }, ease: 'none' }, 0)
        // Angka besar bergerak lebih lambat dari kartunya
        .to('.tab-panel.active .step-num', { xPercent: 28, ease: 'none' }, 0)
        .to('#stepsProgress span', { scaleX: 1, ease: 'none' }, 0);
    });

    // Mobile/tablet: timeline vertikal, reveal fade-up stagger
    mm.add('(max-width: 1023px) and (prefers-reduced-motion: no-preference)', function () {
      gsap.from('.tab-panel.active .step', {
        y: 40, autoAlpha: 0, duration: 1, stagger: .1, ease: 'expo.out',
        scrollTrigger: { trigger: '.steps-viewport', start: 'top 82%' }
      });
    });
  }

  /* ---------------------------------------------------------
     initApps — watermark drift, clip reveal, tilt driver
  --------------------------------------------------------- */
  function initApps() {
    splitReveal($('.apps h2'), true);
    gsap.fromTo('.apps .eyebrow, .apps .section-head p',
      { y: 30, autoAlpha: 0 },
      {
        y: 0, autoAlpha: 1, duration: 1, stagger: .08, ease: 'expo.out',
        scrollTrigger: { trigger: '.apps', start: 'top 75%' }
      });

    gsap.fromTo('#downloadCard',
      { clipPath: 'inset(100% 0 0 0)' },
      {
        clipPath: 'inset(0% 0 0 0)', duration: 1.3, ease: 'expo.out',
        scrollTrigger: { trigger: '#downloadCard', start: 'top 82%' }
      });

    // Di layar sempit jangan geser horizontal (bikin kartu terpotong keluar layar)
    var narrow = window.matchMedia('(max-width: 640px)').matches;
    gsap.from('.driver-card', {
      x: narrow ? 0 : 60, y: narrow ? 24 : 0,
      autoAlpha: 0, duration: 1.1, stagger: .12, ease: 'expo.out',
      clearProps: 'transform',
      scrollTrigger: { trigger: '.driver-stack', start: 'top 82%' }
    });

    if (reduced) return;
    var mm = gsap.matchMedia();

    mm.add('(prefers-reduced-motion: no-preference)', function () {
      var isDesktop = window.matchMedia('(min-width: 1024px)').matches;
      var f = isDesktop ? 1 : .5;
      var st = { trigger: '.apps', start: 'top bottom', end: 'bottom top', scrub: true };

      gsap.fromTo('#appsWatermark', { xPercent: 0 }, { xPercent: -22 * f, ease: 'none', scrollTrigger: st });
      // Ikon aplikasi bergerak lebih cepat dari kartunya
      gsap.fromTo('#appIcon', { y: 30 * f }, { y: -30 * f, ease: 'none', scrollTrigger: st });
      gsap.fromTo('.phone-mock', { y: 40 * f }, { y: -40 * f, ease: 'none', scrollTrigger: st });
    });

    // Tilt 3D sangat halus (maks 4°) di desktop
    mm.add('(min-width: 1024px) and (prefers-reduced-motion: no-preference)', function () {
      $$('[data-tilt]').forEach(function (card) {
        var rx = gsap.quickTo(card, 'rotationX', { duration: .6, ease: 'power3.out' });
        var ry = gsap.quickTo(card, 'rotationY', { duration: .6, ease: 'power3.out' });
        card.addEventListener('mousemove', function (e) {
          var r = card.getBoundingClientRect();
          rx(-((e.clientY - r.top) / r.height - .5) * 8);
          ry(((e.clientX - r.left) / r.width - .5) * 8);
        });
        card.addEventListener('mouseleave', function () { rx(0); ry(0); });
      });
    });
  }

  /* ---------------------------------------------------------
     initFaq — accordion GSAP + parallax ringan dua kolom
  --------------------------------------------------------- */
  function initFaq() {
    $$('.accordion-btn').forEach(function (btn) {
      var item = btn.closest('.accordion-item');
      var content = $('.accordion-content', item);

      btn.addEventListener('click', function () {
        var willOpen = !item.classList.contains('open');

        // Satu item terbuka per grup
        $$('.accordion-item', item.parentElement).forEach(function (other) {
          if (other === item || !other.classList.contains('open')) return;
          other.classList.remove('open');
          $('.accordion-btn', other).setAttribute('aria-expanded', 'false');
          var oc = $('.accordion-content', other);
          if (hasGSAP) {
            gsap.to(oc, { height: 0, autoAlpha: 0, duration: .45, ease: 'power3.inOut' });
          } else {
            oc.style.height = oc.scrollHeight + 'px';
            void oc.offsetHeight;
            oc.style.height = '0px';
          }
        });

        item.classList.toggle('open', willOpen);
        btn.setAttribute('aria-expanded', String(willOpen));

        if (hasGSAP) {
          gsap.to(content, {
            height: willOpen ? 'auto' : 0,
            autoAlpha: willOpen ? 1 : 0,
            duration: .55, ease: 'power3.inOut',
            onComplete: function () { ScrollTrigger.refresh(); }
          });
        } else {
          // Fallback CSS: dari tinggi terukur, lalu dilepas ke auto agar ikut resize
          content.style.height = content.scrollHeight + 'px';
          if (willOpen) {
            content.addEventListener('transitionend', function once() {
              content.removeEventListener('transitionend', once);
              if (item.classList.contains('open')) content.style.height = 'auto';
            });
          } else {
            void content.offsetHeight;
            content.style.height = '0px';
          }
        }
      });
    });

    if (!hasGSAP) return;

    splitReveal($('.knowledge h2'), true);
    gsap.to('.knowledge .reveal', {
      autoAlpha: 1, y: 0, duration: 1.1, stagger: .1, ease: 'expo.out', startAt: { y: 34 },
      scrollTrigger: { trigger: '.knowledge', start: 'top 78%' }
    });

    if (reduced) return;
    // Parallax ringan: kolom kanan sedikit lebih lambat (desktop saja)
    gsap.matchMedia().add('(min-width: 1024px) and (prefers-reduced-motion: no-preference)', function () {
      gsap.fromTo('[data-faq-col="right"]', { y: 0 }, {
        y: -40, ease: 'none',
        scrollTrigger: { trigger: '.knowledge', start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });
  }

  /* ---------------------------------------------------------
     initCta — panel mengembang jadi full-bleed
  --------------------------------------------------------- */
  function initCta() {
    splitReveal($('.support-box h2'), true);
    gsap.to('.support-box .reveal', {
      autoAlpha: 1, y: 0, duration: 1.1, stagger: .1, ease: 'expo.out', startAt: { y: 28 },
      scrollTrigger: { trigger: '.support-box', start: 'top 75%' }
    });
    gsap.from('.support-icon', {
      scale: .7, autoAlpha: 0, duration: 1.1, ease: 'expo.out',
      scrollTrigger: { trigger: '.support-box', start: 'top 80%' }
    });

    if (reduced) return;

    gsap.matchMedia().add('(prefers-reduced-motion: no-preference)', function () {
      gsap.fromTo('#supportBox',
        { scale: .9, borderRadius: '40px' },
        {
          scale: 1, borderRadius: '0px', ease: 'none',
          scrollTrigger: { trigger: '#supportBox', start: 'top 90%', end: 'top 30%', scrub: .6 }
        });
    });

    // Spotlight mengikuti kursor
    var box = $('#supportBox');
    if (box) {
      box.addEventListener('mousemove', function (e) {
        var r = box.getBoundingClientRect();
        box.style.setProperty('--mx', ((e.clientX - r.left) / r.width) * 100 + '%');
        box.style.setProperty('--my', ((e.clientY - r.top) / r.height) * 100 + '%');
      });
    }
  }

  /* ---------------------------------------------------------
     initFooter — wordmark naik perlahan
  --------------------------------------------------------- */
  function initFooter() {
    if (reduced) return;
    gsap.matchMedia().add('(prefers-reduced-motion: no-preference)', function () {
      var f = window.matchMedia('(min-width: 1024px)').matches ? 1 : .5;
      gsap.fromTo('#footerWordmark', { yPercent: 45 * f }, {
        yPercent: -10 * f, ease: 'none',
        scrollTrigger: { trigger: 'footer', start: 'top bottom', end: 'bottom bottom', scrub: .8 }
      });
    });
  }

  /* ---------------------------------------------------------
     initMagnetic + spotlight kartu
  --------------------------------------------------------- */
  function initMagnetic() {
    // Spotlight radial mengikuti kursor pada kartu
    $$('.card').forEach(function (card) {
      card.addEventListener('mousemove', function (e) {
        var r = card.getBoundingClientRect();
        card.style.setProperty('--mx', ((e.clientX - r.left) / r.width) * 100 + '%');
        card.style.setProperty('--my', ((e.clientY - r.top) / r.height) * 100 + '%');
      });
    });

    if (reduced || !hasGSAP || !window.matchMedia('(pointer: fine)').matches) return;

    $$('[data-magnetic]').forEach(function (el) {
      var x = gsap.quickTo(el, 'x', { duration: .6, ease: 'power3.out' });
      var y = gsap.quickTo(el, 'y', { duration: .6, ease: 'power3.out' });
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        x((e.clientX - r.left - r.width / 2) * .28);
        y((e.clientY - r.top - r.height / 2) * .4);
      });
      el.addEventListener('mouseleave', function () { x(0); y(0); });
    });
  }

  /* ---------------------------------------------------------
     init
  --------------------------------------------------------- */
  function init() {
    if (!hasGSAP) { initFallback(); initNavbar(); initGuide(); initFaq(); initAnchors(); return; }

    gsap.registerPlugin(ScrollTrigger);
    if (hasSplit) gsap.registerPlugin(SplitText);

    initLenis();
    initNavbar();
    initAnchors();
    initQuickNav();
    initGuide();
    initApps();
    initFaq();
    initCta();
    initFooter();
    initMagnetic();

    initLoader(function () {
      initHero();
      ScrollTrigger.refresh();
    });

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
