/* =========================================================
   FIXLENS · Public site logic
   Funciona en dos modos:
   - Con backend (localhost:8000): usa la API /api/*
   - Estático (GitHub Pages): usa los datos incrustados en data.js
   ========================================================= */
(function () {
  "use strict";

  const API = "";
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));

  const state = {
    products: [],
    reviews: [],
    settings: {
      whatsapp: "573204658078",
      address: "Cra 7 # 18-42 Local 236-1, Centro Comercial Monserrate, Localidad Santa Fe, Bogotá",
      hours: "Lunes a Sábado: 9:00 am - 8:00 pm · Domingo: 10:00 am - 6:00 pm",
    },
    selectedProduct: null,
  };

  // Datos incrustados (GitHub Pages) + detección de backend (localhost).
  const STATIC = window.FIXLENS_DATA || null;
  let API_OK = false;

  async function detectApi() {
    try {
      const r = await fetch(API + "/api/settings-public");
      API_OK = r.ok;
    } catch (e) {
      API_OK = false;
    }
  }

  const ICONS = {
    phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/></svg>',
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
    wa: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.87 1.22 3.07.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.42.25-.7.25-1.3.17-1.42-.07-.13-.27-.2-.57-.35zM12.05 21.79h-.01a9.8 9.8 0 0 1-5-1.37l-.36-.21-3.71.97.99-3.62-.23-.37a9.79 9.79 0 0 1-1.5-5.22c0-5.42 4.42-9.83 9.85-9.83a9.78 9.78 0 0 1 9.82 9.83c0 5.43-4.41 9.82-9.85 9.82zM20.5 3.49A11.7 11.7 0 0 0 12.05 0C5.5 0 .16 5.33.16 11.89c0 2.1.55 4.14 1.59 5.94L.06 24l6.31-1.65a11.9 11.9 0 0 0 5.68 1.45c6.55 0 11.89-5.33 11.89-11.89 0-3.18-1.24-6.16-3.44-8.42z"/></svg>',
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>',
    card: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>',
    truck: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 3h15v13H1z"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>',
    eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6 9 17l-5-5"/></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
  };

  /* ---------- Helpers ---------- */
  async function fetchJSON(path, opts) {
    const r = await fetch(API + path, Object.assign({ headers: { "Content-Type": "application/json" } }, opts));
    return r.json();
  }

  function toast(msg, ok) {
    let t = $(".toast");
    if (!t) {
      t = document.createElement("div");
      t.className = "toast";
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.toggle("success", !!ok);
    t.classList.add("show");
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove("show"), 3600);
  }

  function starsHTML(n) {
    let s = "";
    for (let i = 1; i <= 5; i++) s += i <= n ? "★" : "☆";
    return s;
  }

  function esc(s) {
    const d = document.createElement("div");
    d.textContent = s == null ? "" : String(s);
    return d.innerHTML;
  }

  function waLink(text) {
    return "https://wa.me/" + state.settings.whatsapp + "?text=" + encodeURIComponent(text);
  }

  /* ---------- Settings ---------- */
  async function loadSettings() {
    if (API_OK) {
      try {
        const d = await fetchJSON("/api/settings-public");
        if (d && d.whatsapp) state.settings.whatsapp = d.whatsapp;
        if (d && d.address) state.settings.address = d.address;
        if (d && d.hours) state.settings.hours = d.hours;
      } catch (e) {}
    } else if (STATIC) {
      state.settings.whatsapp = STATIC.whatsapp || state.settings.whatsapp;
      state.settings.address = STATIC.address || state.settings.address;
      state.settings.hours = STATIC.hours || state.settings.hours;
    }
    // Apply to page
    $$("[data-address]").forEach((el) => (el.textContent = state.settings.address));
    $$("[data-hours]").forEach((el) => (el.textContent = state.settings.hours));
    $$("[data-wa]").forEach((el) => {
      el.setAttribute("href", waLink("Hola FixLens 👓, quiero más información."));
    });
  }

  /* ---------- Products ---------- */
  async function loadProducts() {
    const grid = $("#productsGrid");
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:#8a8f98">Cargando colección…</div>';
    if (API_OK) {
      try {
        const d = await fetchJSON("/api/products");
        state.products = d.products || [];
      } catch (e) {
        state.products = [];
      }
    } else if (STATIC) {
      state.products = STATIC.products || [];
    }
    renderProducts();
  }

  function renderProducts() {
    const grid = $("#productsGrid");
    if (!state.products.length) {
      grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:#8a8f98">Pronto tendremos nuevas monturas. ¡Escríbenos por WhatsApp!</div>';
      return;
    }
    grid.innerHTML = state.products
      .map((p) => {
        const tags = (p.tags || []).slice(0, 3).map((t) => `<span class="tag">${esc(t)}</span>`).join("");
        return `
          <article class="product-card" data-id="${p.id}">
            <div class="product-media">
              <div class="product-badges">
                <span class="badge">${esc(p.brand)}</span>
                ${p.gender ? `<span class="badge gold">${esc(p.gender)}</span>` : ""}
              </div>
              <img src="images/${esc(p.image)}" alt="${esc(p.name)}" loading="lazy">
            </div>
            <div class="product-body">
              <div class="product-brand">${esc(p.brand)}</div>
              <h3 class="product-name">${esc(p.name)}</h3>
              <p class="product-desc">${esc(p.description)}</p>
              <div class="product-tags">${tags}</div>
              <div class="product-actions">
                <button class="btn btn-navy btn-sm" data-view="${p.id}">Ver características</button>
                <button class="btn btn-whatsapp btn-sm" data-quote="${p.id}">Cotizar</button>
              </div>
            </div>
          </article>`;
      })
      .join("");
  }

  /* ---------- Product modal ---------- */
  function openProduct(id) {
    const p = state.products.find((x) => String(x.id) === String(id));
    if (!p) return;
    state.selectedProduct = p;
    const feats = (p.features || [])
      .map((f) => {
        const i = f.indexOf(":");
        if (i > -1) {
          return `<li><span class="dot">✓</span><div><b>${esc(f.slice(0, i))}:</b> <span>${esc(f.slice(i + 1))}</span></div></li>`;
        }
        return `<li><span class="dot">✓</span><div><span>${esc(f)}</span></div></li>`;
      })
      .join("");
    const tags = (p.tags || []).map((t) => `<span class="tag">${esc(t)}</span>`).join("");
    $("#productModal .modal-media").innerHTML = `<img src="images/${esc(p.image)}" alt="${esc(p.name)}">`;
    $("#productModal .modal-body").innerHTML = `
      <button class="modal-close" data-close>✕</button>
      <div class="modal-brand">${esc(p.brand)}</div>
      <h3 class="modal-title">${esc(p.name)}</h3>
      <div class="modal-meta">
        <span class="meta-chip">${esc(p.category || "Montura")}</span>
        ${p.gender ? `<span class="meta-chip">${esc(p.gender)}</span>` : ""}
        <span class="meta-chip">100% original</span>
      </div>
      <p class="modal-desc">${esc(p.description)}</p>
      <h4 style="font-family:var(--font-head);color:var(--navy-900);margin:0 0 6px">Características</h4>
      <ul class="features">${feats}</ul>
      ${tags ? `<div class="modal-tags">${tags}</div>` : ""}
      <div class="modal-cta">
        <button class="btn btn-whatsapp btn-lg" data-quote="${p.id}">${ICONS.wa} Cotizar por WhatsApp</button>
        <button class="btn btn-outline btn-lg" data-close>Continuar explorando</button>
      </div>
      <div class="modal-note">${ICONS.shield} Pago seguro · Asesoría profesional · Entrega en toda Colombia</div>
    `;
    $("#productModal").classList.add("open");
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    $("#productModal").classList.remove("open");
    $("#quoteModal").classList.remove("open");
    document.body.style.overflow = "";
  }

  /* ---------- Quote (cotización) ---------- */
  function openQuote(id) {
    const p = state.products.find((x) => String(x.id) === String(id));
    if (!p) return;
    state.selectedProduct = p;
    $("#quoteProductImg").src = "images/" + p.image;
    $("#quoteProductName").textContent = p.name;
    $("#quoteProductBrand").textContent = p.brand + " · " + (p.category || "Montura");
    $("#quoteModal").classList.add("open");
    document.body.style.overflow = "hidden";
  }

  async function submitQuote(ev) {
    ev.preventDefault();
    const f = ev.target;
    const p = state.selectedProduct;
    const btn = f.querySelector("button[type=submit]");
    btn.disabled = true;
    btn.textContent = "Enviando…";
    if (API_OK) {
      const body = {
        product_name: p ? p.name : "",
        customer_name: f.name.value,
        customer_phone: f.phone.value,
        customer_email: f.email.value,
        customer_address: f.address.value,
      };
      try {
        const d = await fetchJSON("/api/order", { method: "POST", body: JSON.stringify(body) });
        if (d && d.whatsapp) {
          toast("¡Listo! Te estamos llevando a WhatsApp…", true);
          setTimeout(() => { window.open(d.whatsapp, "_blank"); }, 600);
          f.reset();
          closeModal();
        } else {
          toast("Ocurrió un error, inténtalo de nuevo.");
        }
      } catch (e) {
        toast("Ocurrió un error, inténtalo de nuevo.");
      }
    } else {
      const msg =
        `*Nueva cotización en FixLens*\n` +
        `Producto: ${p ? p.name : ""}\n` +
        `Nombre: ${f.name.value}\n` +
        `Teléfono: ${f.phone.value}\n` +
        `Correo: ${f.email.value}\n` +
        `Dirección: ${f.address.value}`;
      toast("¡Listo! Te estamos llevando a WhatsApp…", true);
      setTimeout(() => { window.open(waLink(msg), "_blank"); }, 600);
      f.reset();
      closeModal();
    }
    btn.disabled = false;
    btn.textContent = "Enviar cotización";
  }

  /* ---------- Reviews ---------- */
  async function loadReviews() {
    let reviews = [];
    if (API_OK) {
      try {
        const d = await fetchJSON("/api/reviews");
        reviews = d.reviews || [];
      } catch (e) {}
    } else if (STATIC) {
      reviews = STATIC.reviews || [];
    }
    state.reviews = reviews;
    renderReviews();
  }

  function renderReviews() {
    const grid = $("#reviewsGrid");
    const avgWrap = $("#avgScore");
    if (!state.reviews.length) {
      grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:30px;color:#8a8f98">Sé el primero en dejar tu reseña.</div>';
      if (avgWrap) avgWrap.textContent = "—";
      return;
    }
    const avg = state.reviews.reduce((a, r) => a + (r.rating || 5), 0) / state.reviews.length;
    if (avgWrap) avgWrap.textContent = avg.toFixed(1);
    grid.innerHTML = state.reviews
      .map((r) => {
        const initial = (r.name || "?").trim().charAt(0).toUpperCase();
        return `
          <div class="review-card">
            <div class="stars">${starsHTML(r.rating)}</div>
            <p>${esc(r.comment)}</p>
            <div class="who">
              <div class="avatar">${esc(initial)}</div>
              <div><b>${esc(r.name)}</b><span>${esc(r.date || "")}</span></div>
            </div>
          </div>`;
      })
      .join("");
  }

  async function submitReview(ev) {
    ev.preventDefault();
    const f = ev.target;
    const btn = f.querySelector("button[type=submit]");
    btn.disabled = true;
    btn.textContent = "Publicando…";
    const body = {
      name: f.rname.value,
      rating: parseInt($("#starInput") ? $("#starInput").dataset.value : "5", 10) || 5,
      comment: f.rcomment.value,
    };
    if (!API_OK) {
      const msg =
        `*Nueva reseña en FixLens*\n` +
        `Nombre: ${body.name}\n` +
        `Calificación: ${body.rating}/5\n` +
        `Comentario: ${body.comment}`;
      toast("¡Gracias! Tu reseña se enviará por WhatsApp.", true);
      setTimeout(() => { window.open(waLink(msg), "_blank"); }, 600);
      f.reset();
      resetStarInput();
    } else {
      try {
        const d = await fetchJSON("/api/reviews", { method: "POST", body: JSON.stringify(body) });
        if (d && d.ok) {
          toast("¡Gracias! Tu reseña será publicada tras verificación.", true);
          f.reset();
          resetStarInput();
        } else {
          toast("Revisa tus datos e inténtalo de nuevo.");
        }
      } catch (e) {
        toast("No se pudo enviar la reseña.");
      }
    }
    btn.disabled = false;
    btn.textContent = "Enviar reseña";
  }

  /* ---------- Star input ---------- */
  function setupStarInput() {
    const wrap = $("#starInput");
    if (!wrap) return;
    wrap.dataset.value = "5";
    const spans = $$("span", wrap);
    const paint = (n) => {
      wrap.dataset.value = n;
      spans.forEach((s, i) => s.classList.toggle("on", i < n));
    };
    spans.forEach((s, i) => {
      s.addEventListener("click", () => paint(i + 1));
      s.addEventListener("mouseenter", () => paint(i + 1));
    });
    wrap.addEventListener("mouseleave", () => paint(parseInt(wrap.dataset.value, 10) || 5));
    paint(5);
  }
  function resetStarInput() {
    const wrap = $("#starInput");
    if (!wrap) return;
    wrap.dataset.value = "5";
    $$("span", wrap).forEach((s) => s.classList.add("on"));
  }

  /* ---------- Nav / menu ---------- */
  function setupNav() {
    const burger = $(".hamburger");
    const links = $(".nav-links");
    if (burger && links) {
      burger.addEventListener("click", () => links.classList.toggle("open"));
    }
    $$(".nav-links a").forEach((a) => a.addEventListener("click", () => links.classList.remove("open")));
    const sections = $$("section[id]");
    const navMap = {};
    $$(".nav-links a[href^='#']").forEach((a) => (navMap[a.getAttribute("href").slice(1)] = a));
    window.addEventListener("scroll", () => {
      let current = "";
      sections.forEach((s) => {
        if (window.scrollY >= s.offsetTop - 120) current = s.id;
      });
      $$(".nav-links a").forEach((a) => a.classList.remove("active"));
      if (navMap[current]) navMap[current].classList.add("active");
    });
  }

  /* ---------- Init ---------- */
  document.addEventListener("DOMContentLoaded", async () => {
    $("#productsGrid").addEventListener("click", (e) => {
      const view = e.target.closest("[data-view]");
      const quote = e.target.closest("[data-quote]");
      if (view) openProduct(view.getAttribute("data-view"));
      else if (quote) openQuote(quote.getAttribute("data-quote"));
    });

    $("#productModal").addEventListener("click", (e) => {
      if (e.target.closest("[data-close]") || e.target.classList.contains("modal-backdrop")) closeModal();
      const quote = e.target.closest("[data-quote]");
      if (quote) openQuote(quote.getAttribute("data-quote"));
    });

    $("#quoteModal").addEventListener("click", (e) => {
      if (e.target.closest("[data-close]") || e.target.classList.contains("modal-backdrop")) closeModal();
    });
    $("#quoteForm").addEventListener("submit", submitQuote);
    $("#reviewForm").addEventListener("submit", submitReview);

    setupStarInput();
    setupNav();

    await detectApi();
    loadSettings();
    loadProducts();
    loadReviews();

    const y = $("#year");
    if (y) y.textContent = new Date().getFullYear();
  });
})();
