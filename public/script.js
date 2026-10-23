/**
 * Sane Living — Shared site behaviors
 *
 * Handles: dynamic nav/footer injection, scroll animations,
 * mobile nav toggle, smooth scroll, and contact form submission.
 */



document.addEventListener('DOMContentLoaded', () => {
  injectNav();
  injectFooter();
  initScrollAnimations();
  initNavScroll();
  initMobileNav();
  initSmoothScroll();
  initContactForm();
  initGalleryModal();
});

/* ---- Shared Navigation ---- */

/** Injects the site-wide navigation bar into #site-nav. */
function injectNav() {
  const el = document.getElementById('site-nav');
  if (!el) return;

  const currentPath = location.pathname;

  el.className = 'site-nav';
  el.innerHTML = `
    <div class="nav-inner">
      <a href="/" class="nav-logo"><img src="/images/logo.png" alt="Sane Living" height="72"></a>
      <ul class="nav-links" id="nav-links">
        <li class="nav-dropdown">
          <a href="/events/"${isActive(currentPath, '/events/')}>Events</a>
          <div class="nav-dropdown-menu">
            <a href="/events/">Upcoming Public Events</a>
            <a href="/events/#recent">Recent Events</a>
          </div>
        </li>
        <li class="nav-dropdown">
          <a href="/rent/"${isActive(currentPath, '/rent/')}>Rent</a>
          <div class="nav-dropdown-menu">
            <a href="/rent/">Rent the Space</a>
            <a href="/rent/pricing/">Rates &amp; Availability</a>
            <a href="/gallery/">Photo Gallery</a>
            <a href="/partners/">Our Partners</a>
          </div>
        </li>
        <li><a href="/rent/weddings/"${isActive(currentPath, '/rent/weddings/')}>Weddings</a></li>
        <li><a href="/sculpture/"${isActive(currentPath, '/sculpture/')}>Sculpture</a></li>
        <li class="nav-dropdown">
          <a href="/about/"${isActive(currentPath, '/about/')}>About</a>
          <div class="nav-dropdown-menu">
            <a href="/evo3/"${isActive(currentPath, '/evo3/')}>EVO 3: Bio Ego Algo</a>
            <a href="/lifestyle/"${isActive(currentPath, '/lifestyle/')}>Lifestyle</a>
            <a href="/self-heal/"${isActive(currentPath, '/self-heal/')}>Self 2 Heal</a>
            <a href="/inspiration/"${isActive(currentPath, '/inspiration/')}>Inspiration</a>
          </div>
        </li>
        <li><a href="/contact/"${isActive(currentPath, '/contact/')}>Contact</a></li>
      </ul>
      <div class="nav-end">
        <a href="/rent/#calendar" class="btn btn-primary nav-cta" aria-label="Check availability"><span class="nav-cta-full">Check Availability</span><span class="nav-cta-short">Availability</span></a>
        <button class="nav-toggle" id="nav-toggle" aria-label="Toggle menu">
          <span></span><span></span><span></span>
        </button>
      </div>
    </div>
  `;

  keepMostSpecificActive(el);
}

/**
 * isActive() matches on prefix, so a sub-page with its own nav entry lights up
 * both itself and its parent (/rent/weddings/ marks Rent and Weddings). Keeps
 * only the longest matching link active.
 */
function keepMostSpecificActive(el) {
  const active = [...el.querySelectorAll('a.active')];
  if (active.length < 2) return;

  const longest = active.reduce((a, b) =>
    (b.getAttribute('href') || '').length > (a.getAttribute('href') || '').length ? b : a
  );

  active.forEach((a) => {
    if (a !== longest) a.classList.remove('active');
  });
}

/**
 * Returns an active class attribute string if the current
 * path starts with the given path prefix.
 */
function isActive(current, path) {
  if (current === path || current.startsWith(path)) {
    return ' class="active"';
  }
  return '';
}

/* ---- Shared Footer ---- */

/** Injects the site-wide footer into #site-footer. */
function injectFooter() {
  const el = document.getElementById('site-footer');
  if (!el) return;

  const year = new Date().getFullYear();

  el.className = 'site-footer';
  // Fallback until public/site-content.js re-renders the footer from the dashboard settings.
  el.innerHTML = `
    <div class="container">
      <div class="footer-top">
        <div class="mc-signup mc-signup-footer">
          <h4>Subscribe for updates</h4>
          <form action="https://saneliving.us19.list-manage.com/subscribe/post?u=b3bc47585c00a4e19f7c3841d&amp;id=590b76d0aa" method="post" target="_blank" novalidate>
            <label class="visually-hidden" for="footer-email">Email address</label>
            <input id="footer-email" type="email" name="EMAIL" placeholder="Email address" required>
            <div style="position: absolute; left: -5000px;" aria-hidden="true">
              <input type="text" name="b_b3bc47585c00a4e19f7c3841d_590b76d0aa" tabindex="-1" value="">
            </div>
            <button type="submit">Subscribe</button>
          </form>
        </div>
      </div>
      <div class="footer-grid">
        <div class="footer-brand"><a href="/" class="footer-logo" aria-label="Sane Living home"><img src="/images/logo.png" alt="Sane Living" width="200" height="63" loading="lazy"></a></div>
        <div class="footer-col"><h2 class="footer-heading">Visit</h2><p class="footer-address">Sane Living Center<br>316 E Matilija St, Ojai, CA 93023</p></div>
        <div class="footer-col"><h2 class="footer-heading">Contact</h2><p class="footer-contact"><a href="tel:+18056466000">+1 (805) 646-6000</a><br><a href="mailto:info@saneliving.com">info@saneliving.com</a></p></div>
        <div class="footer-col"><h2 class="footer-heading">Explore</h2>
          <nav class="footer-links" aria-label="Footer navigation">
            <a href="/rent/">Rent the Space</a>
            <a href="/rent/pricing/">Rates &amp; Availability</a>
            <a href="/rent/weddings/">Weddings</a>
            <a href="/events/">Events</a>
            <a href="/gallery/">Photo Gallery</a>
            <a href="/contact/">Contact</a>
          </nav>
        </div>
      </div>
      <div class="footer-bottom"><p class="footer-copy">© ${year} Sane Living</p><a class="footer-team" href="/dash/">Team Login</a></div>
    </div>
  `;
}

/* ---- Scroll Animations ---- */

/** Observes [data-animate] elements and adds .visible when in view. */
function initScrollAnimations() {
  const elements = document.querySelectorAll('[data-animate]:not(.visible), [data-animate-stagger]:not(.visible)');
  if (!elements.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
  );

  elements.forEach((el) => observer.observe(el));
}

/* ---- Nav Scroll State ---- */

/** Toggles .scrolled class on nav when the user scrolls past 60px. */
function initNavScroll() {
  const nav = document.querySelector('.site-nav');
  if (!nav) return;

  let ticking = false;

  function onScroll() {
    if (!ticking) {
      requestAnimationFrame(() => {
        nav.classList.toggle('scrolled', window.scrollY > 60);
        ticking = false;
      });
      ticking = true;
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

/* ---- Mobile Nav Toggle ---- */

/** Hamburger menu open/close behavior. */
function initMobileNav() {
  // Needs to run after injectNav
  const toggle = document.getElementById('nav-toggle');
  const links = document.getElementById('nav-links');
  if (!toggle || !links) return;

  toggle.addEventListener('click', () => {
    links.classList.toggle('open');
    toggle.classList.toggle('active');
  });

  links.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      links.classList.remove('open');
      toggle.classList.remove('active');
    });
  });

  document.addEventListener('click', (e) => {
    if (!links.contains(e.target) && !toggle.contains(e.target)) {
      links.classList.remove('open');
      toggle.classList.remove('active');
    }
  });
}

/* ---- Smooth Scroll ---- */

/** Smooth‐scroll for same‐page anchor links. */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (e) => {
      const id = anchor.getAttribute('href');
      if (id === '#') return;
      const target = document.querySelector(id);
      if (!target) return;

      e.preventDefault();
      const navH = document.querySelector('.site-nav')?.offsetHeight || 0;
      const top = target.getBoundingClientRect().top + window.scrollY - navH - 20;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });
}

/* ---- Contact Form ---- */

/** Submits the contact form to the /api/contact endpoint (Airtable). */
function initContactForm() {
  const form = document.getElementById('contact-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const btn = form.querySelector('button[type="submit"]');
    const originalText = btn.textContent;

    const payload = {
      name:    form.querySelector('#contact-name').value.trim(),
      email:   form.querySelector('#contact-email').value.trim(),
      subject: form.querySelector('#contact-subject')?.value || '',
      message: form.querySelector('#contact-message').value.trim(),
    };

    if (!payload.name || !payload.email || !payload.message) return;

    btn.textContent = 'Sending…';
    btn.disabled = true;
    btn.style.opacity = '0.7';

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Send failed');

      btn.textContent = 'Message Sent';
      btn.style.background = 'var(--clr-green)';
      btn.style.opacity = '1';

      setTimeout(() => {
        form.reset();
        btn.textContent = originalText;
        btn.style.background = '';
        btn.disabled = false;
      }, 2500);
    } catch {
      btn.textContent = 'Failed — Try Again';
      btn.style.background = 'var(--clr-error)';
      btn.style.opacity = '1';

      setTimeout(() => {
        btn.textContent = originalText;
        btn.style.background = '';
        btn.disabled = false;
      }, 2500);
    }
  });
}

/** Minimal HTML escaping. */
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;');
}

/* ---- Image Gallery Modal ---- */

function initGalleryModal() {
  const openBtn = document.getElementById('open-gallery-btn');
  const modal = document.getElementById('gallery-modal');
  if (!openBtn || !modal) return;

  const closeBtn = document.getElementById('gallery-close-btn');
  const prevBtn = document.getElementById('gallery-prev-btn');
  const nextBtn = document.getElementById('gallery-next-btn');
  const mainImg = document.getElementById('gallery-main-img');

  // Gallery images come from /content/gallery.json (edited in the team
  // dashboard). The three base images stay as a fallback.
  let galleryImages = [
    '/images/rent-center.jpg',
    '/images/hero-center.jpg',
    '/images/center-office.jpg'
  ];
  fetch('/content/gallery.json')
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => {
      if (data && Array.isArray(data.photos) && data.photos.length) {
        galleryImages = data.photos.filter((p) => !p.draft).map((p) => p.image).filter(Boolean);
      }
    })
    .catch(() => {});

  let currentIndex = 0;

  function openGallery() {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
    updateImage(0);
  }

  function closeGallery() {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }

  function updateImage(index) {
    if (index < 0) index = galleryImages.length - 1;
    if (index >= galleryImages.length) index = 0;
    currentIndex = index;
    
    mainImg.classList.remove('loaded');
    
    // Slight timeout to allow transition to fade out before changing source
    setTimeout(() => {
      mainImg.src = galleryImages[currentIndex];
      mainImg.onload = () => {
        mainImg.classList.add('loaded');
      };
    }, 150);
  }

  function prevImage() { updateImage(currentIndex - 1); }
  function nextImage() { updateImage(currentIndex + 1); }

  // Event Listeners
  openBtn.addEventListener('click', openGallery);
  closeBtn.addEventListener('click', closeGallery);
  prevBtn.addEventListener('click', (e) => { e.stopPropagation(); prevImage(); });
  nextBtn.addEventListener('click', (e) => { e.stopPropagation(); nextImage(); });
  
  // Close on background click
  modal.addEventListener('click', (e) => {
    if (e.target === modal || e.target.classList.contains('gallery-content')) {
      closeGallery();
    }
  });

  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (!modal.classList.contains('active')) return;
    if (e.key === 'Escape') closeGallery();
    if (e.key === 'ArrowLeft') prevImage();
    if (e.key === 'ArrowRight') nextImage();
  });
}
