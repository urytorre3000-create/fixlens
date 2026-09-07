/* =========================================================
   FIXLENS · Admin panel logic
   ========================================================= */
(function () {
  "use strict";

  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  let token = localStorage.getItem("fixlens_token") || "";
  let currentTab = "productos";
  let products = [];
  let reviews = [];
  let orders = [];
  let images = [];
  let settings = {};

  const ICON = {
    products: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 7l10-5 10 5-10 5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>',
    reviews: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7z"/></svg>',
    orders: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2l-2 2v18l2-2 4 2 4-2 4 2 2-2V4l-2-2-4 2-4-2z"/><path d="M8 7h8M8 11h8M8 15h5"/></svg>',
    settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>',
    edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.8 2.8 0 0 1 4 4L7 21l-4 1 1-4z"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>',
    logout: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/></svg>',
  };

  function esc(s) { const d = document.createElement("div"); d.textContent = s == null ? "" : String(s); return d.innerHTML; }

  async function api(path, opts) {
    opts = opts || {};
    opts.headers = Object.assign({ "Content-Type": "application/json", "Authorization": "Bearer " + token }, opts.headers || {});
    const r = await fetch(path, opts);
    let d = {};
    try { d = await r.json(); } catch (e) {}
    if (r.status === 401) { logout(); throw new Error("Sesión expirada"); }
    if (!r.ok) { throw new Error(d.error || "Error " + r.status); }
    return d;
  }

  function toast(msg, ok) {
    let t = $(".toast");
    if (!t) { t = document.createElement("div"); t.className = "toast"; document.body.appendChild(t); }
    t.textContent = msg;
    t.classList.toggle("success", !!ok);
    t.classList.add("show");
    clearTimeout(t._t);
    t._t = setTimeout(() => t.classList.remove("show"), 3000);
  }

  /* ---------- Auth ---------- */
  async function doLogin(ev) {
    ev.preventDefault();
    const f = ev.target;
    const err = $(".login-error");
    err.style.display = "none";
    const btn = f.querySelector("button");
    btn.disabled = true; btn.textContent = "Ingresando…";
    try {
      const d = await api("/api/admin/login", { method: "POST", body: JSON.stringify({ username: f.username.value, password: f.password.value }) });
      token = d.token;
      localStorage.setItem("fixlens_token", token);
      showApp();
      loadAll();
      toast("Bienvenido a FixLens", true);
    } catch (e) {
      err.textContent = "Credenciales inválidas. Verifica usuario y contraseña.";
      err.style.display = "block";
    } finally {
      btn.disabled = false; btn.textContent = "Ingresar";
    }
  }

  function logout() {
    token = "";
    localStorage.removeItem("fixlens_token");
    $(".login-screen").style.display = "flex";
    $(".app").classList.remove("show");
  }

  function showApp() {
    $(".login-screen").style.display = "none";
    $(".app").classList.add("show");
  }

  /* ---------- Navigation ---------- */
  function switchTab(tab) {
    currentTab = tab;
    $$(".sidebar nav a").forEach((a) => a.classList.toggle("active", a.dataset.tab === tab));
    const titles = { productos: "Productos", resenas: "Reseñas", pedidos: "Pedidos", configuracion: "Configuración" };
    $("#tabTitle").textContent = titles[tab] || tab;
    $("#tabSub").textContent = tab === "productos" ? "Gestiona el catálogo de monturas" : tab === "resenas" ? "Modera las reseñas de clientes" : tab === "pedidos" ? "Solicitudes de cotización y pedidos" : "Datos de la tienda y pasarela de pago";
    const actions = $("#mainActions");
    if (tab === "productos") {
      actions.innerHTML = '<button class="btn btn-gold" id="btnNewProduct">' + ICON.plus + ' Nuevo producto</button>';
      actions.querySelector("#btnNewProduct").addEventListener("click", () => openProductForm());
    } else {
      actions.innerHTML = "";
    }
    $$(".tab-pane").forEach((p) => p.classList.remove("active"));
    const pane = $("#pane-" + tab);
    if (pane) pane.classList.add("active");
  }

  /* ---------- Data loading ---------- */
  async function loadAll() {
    await Promise.all([loadProducts(), loadReviews(), loadOrders(), loadSettings(), loadImages()]);
  }

  async function loadProducts() {
    try {
      const d = await api("/api/admin/products", { method: "POST", body: "{}" });
      products = d.products || [];
      renderProducts();
      renderStats();
    } catch (e) {}
  }

  function renderProducts() {
    const tbody = $("#productsBody");
    if (!products.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="muted" style="text-align:center;padding:30px">No hay productos. Agrega el primero.</td></tr>';
      return;
    }
    tbody.innerHTML = products.map((p) => `
      <tr>
        <td><img class="thumb" src="/images/${esc(p.image)}" onerror="this.style.opacity=.2" alt=""></td>
        <td><b>${esc(p.name)}</b><br><span class="muted">${esc(p.brand || "")} · ${esc(p.category || "")}</span></td>
        <td><span class="pill">${esc(p.gender || "Unisex")}</span></td>
        <td><span class="badge-status ${p.active ? "st-ok" : "st-cancel"}">${p.active ? "Activo" : "Inactivo"}</span></td>
        <td class="muted">${esc((p.tags || []).slice(0,2).join(", "))}</td>
        <td>
          <button class="btn btn-outline btn-sm btn-icon" data-edit="${p.id}" title="Editar">${ICON.edit}</button>
          <button class="btn btn-red btn-sm btn-icon" data-del="${p.id}" title="Eliminar">${ICON.trash}</button>
        </td>
      </tr>`).join("");
  }

  async function loadReviews() {
    try {
      const d = await api("/api/admin/reviews", { method: "POST", body: "{}" });
      reviews = d.reviews || [];
      renderReviews();
    } catch (e) {}
  }

  function renderReviews() {
    const tbody = $("#reviewsBody");
    if (!reviews.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="muted" style="text-align:center;padding:30px">No hay reseñas.</td></tr>';
      return;
    }
    tbody.innerHTML = reviews.map((r) => `
      <tr>
        <td><b>${esc(r.name)}</b><br><span class="muted">${esc(r.date || "")}</span></td>
        <td><span class="rating">${"★".repeat(r.rating)}${"☆".repeat(5 - r.rating)}</span></td>
        <td class="muted">${esc(r.comment)}</td>
        <td><span class="badge-status ${r.approved ? "st-ok" : "st-pendiente"}">${r.approved ? "Publicada" : "Pendiente"}</span></td>
        <td>
          <button class="btn btn-green btn-sm" data-approve="${r.id}" data-v="${r.approved ? 0 : 1}">${r.approved ? "Ocultar" : "Aprobar"}</button>
          <button class="btn btn-red btn-sm btn-icon" data-rdel="${r.id}" title="Eliminar">${ICON.trash}</button>
        </td>
      </tr>`).join("");
  }

  async function loadOrders() {
    try {
      const d = await api("/api/admin/orders", { method: "POST", body: "{}" });
      orders = d.orders || [];
      renderOrders();
    } catch (e) {}
  }

  function renderOrders() {
    const tbody = $("#ordersBody");
    if (!orders.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="muted" style="text-align:center;padding:30px">Aún no hay pedidos ni cotizaciones.</td></tr>';
      return;
    }
    tbody.innerHTML = orders.map((o) => `
      <tr>
        <td><b>${esc(o.reference || "—")}</b></td>
        <td><b>${esc(o.product_name || "—")}</b></td>
        <td>${esc(o.customer_name || "—")}<br><span class="muted">${esc(o.customer_phone || "")}</span></td>
        <td class="muted">${esc(o.customer_email || "")}</td>
        <td>${o.amount_cents ? "$" + (o.amount_cents / 100).toLocaleString("es-CO") : "—"}</td>
        <td><span class="badge-status st-${esc(o.status === "pendiente" ? "pendiente" : "ok")}">${esc(o.status)}</span><br><span class="muted">${esc(o.channel)} · ${esc(o.created || "")}</span></td>
      </tr>`).join("");
  }

  async function loadSettings() {
    try {
      const d = await api("/api/admin/settings/get", { method: "POST", body: "{}" });
      settings = d.settings || {};
      fillSettings();
    } catch (e) {}
  }

  function fillSettings() {
    const f = $("#settingsForm");
    if (!f) return;
    const map = { store_whatsapp: "s_whatsapp", store_address: "s_address", store_hours: "s_hours", wompi_public_key: "w_public", wompi_private_key: "w_private", wompi_integrity_key: "w_integrity", wompi_env: "w_env" };
    Object.keys(map).forEach((k) => {
      const el = $("[name=" + map[k] + "]");
      if (el) el.value = settings[k] || "";
    });
    if ($("[name=w_env]")) {
      const env = settings.wompi_env || "test";
      $$("[name=w_env]").forEach((o) => (o.value = env));
    }
  }

  async function loadImages() {
    try {
      const d = await api("/api/admin/images", { method: "POST", body: "{}" });
      images = d.images || [];
      const sel = $("[name=p_image]");
      if (sel) {
        sel.innerHTML = images.map((i) => `<option value="${esc(i)}">${esc(i)}</option>`).join("") + '<option value="">-- Sin imagen --</option>';
      }
    } catch (e) {}
  }

  function renderStats() {
    const active = products.filter((p) => p.active).length;
    const published = reviews.filter((r) => r.approved).length;
    const pending = reviews.filter((r) => !r.approved).length;
    const num = (id, v) => { const el = $("#" + id); if (el) el.textContent = v; };
    num("stProducts", products.length);
    num("stActive", active);
    num("stReviews", published);
    num("stPending", pending);
  }

  /* ---------- Product modal ---------- */
  function openProductForm(p) {
    p = p || {};
    $("#productModal").classList.add("open");
    const f = $("#productForm");
    f.reset();
    f.dataset.id = p.id || "";
    $("[name=p_name]").value = p.name || "";
    $("[name=p_brand]").value = p.brand || "";
    $("[name=p_category]").value = p.category || "";
    $("[name=p_gender]").value = p.gender || "";
    $("[name=p_description]").value = p.description || "";
    $("[name=p_features]").value = (p.features || []).join("|");
    $("[name=p_tags]").value = (p.tags || []).join(",");
    $("[name=p_sort]").value = p.sort_order || 0;
    $("[name=p_active]").checked = p.active !== 0;
    const sel = $("[name=p_image]");
    if (sel) sel.value = p.image || "";
    $("#productModalTitle").textContent = p.id ? "Editar producto" : "Nuevo producto";
  }

  async function saveProduct(ev) {
    ev.preventDefault();
    const f = ev.target;
    const btn = f.querySelector("button[type=submit]");
    btn.disabled = true; btn.textContent = "Guardando…";
    const body = {
      id: f.dataset.id || null,
      name: f.p_name.value,
      brand: f.p_brand.value,
      category: f.p_category.value,
      gender: f.p_gender.value,
      image: f.p_image.value,
      description: f.p_description.value,
      features: f.p_features.value,
      tags: f.p_tags.value,
      sort_order: parseInt(f.p_sort.value || 0, 10),
      active: f.p_active.checked ? 1 : 0,
    };
    try {
      await api("/api/admin/products/save", { method: "POST", body: JSON.stringify(body) });
      $("#productModal").classList.remove("open");
      toast("Producto guardado", true);
      loadProducts();
    } catch (e) {
      toast(e.message || "Error al guardar");
    } finally {
      btn.disabled = false; btn.textContent = "Guardar producto";
    }
  }

  async function deleteProduct(id) {
    if (!confirm("¿Eliminar este producto?")) return;
    try {
      await api("/api/admin/products/" + id, { method: "DELETE" });
      toast("Producto eliminado", true);
      loadProducts();
    } catch (e) { toast("Error al eliminar"); }
  }

  /* ---------- Review actions ---------- */
  async function toggleReview(id, val) {
    try {
      await api("/api/admin/reviews/" + id, { method: "POST", body: JSON.stringify({ approved: val }) });
      toast("Reseña actualizada", true);
      loadReviews();
    } catch (e) { toast("Error al actualizar"); }
  }

  async function deleteReview(id) {
    if (!confirm("¿Eliminar esta reseña?")) return;
    try {
      await api("/api/admin/reviews/" + id, { method: "DELETE" });
      toast("Reseña eliminada", true);
      loadReviews();
    } catch (e) { toast("Error al eliminar"); }
  }

  /* ---------- Settings save ---------- */
  async function saveSettings(ev) {
    ev.preventDefault();
    const f = ev.target;
    const btn = f.querySelector("button[type=submit]");
    btn.disabled = true; btn.textContent = "Guardando…";
    const body = {
      store_whatsapp: f.s_whatsapp.value,
      store_address: f.s_address.value,
      store_hours: f.s_hours.value,
      wompi_public_key: f.w_public.value,
      wompi_private_key: f.w_private.value,
      wompi_integrity_key: f.w_integrity.value,
      wompi_env: f.w_env.value,
    };
    try {
      await api("/api/admin/settings", { method: "POST", body: JSON.stringify(body) });
      toast("Configuración guardada", true);
      loadSettings();
    } catch (e) { toast(e.message || "Error al guardar"); }
    finally { btn.disabled = false; btn.textContent = "Guardar cambios"; }
  }

  /* ---------- Wire events ---------- */
  document.addEventListener("DOMContentLoaded", () => {
    $("#loginForm").addEventListener("submit", doLogin);
    $("#logoutBtn").addEventListener("click", (e) => { e.preventDefault(); logout(); });
    $("#productForm").addEventListener("submit", saveProduct);
    $("#settingsForm").addEventListener("submit", saveSettings);

    $("#productsBody").addEventListener("click", (e) => {
      const edit = e.target.closest("[data-edit]");
      const del = e.target.closest("[data-del]");
      if (edit) { const p = products.find((x) => String(x.id) === edit.dataset.edit); openProductForm(p); }
      if (del) deleteProduct(del.dataset.del);
    });
    $("#reviewsBody").addEventListener("click", (e) => {
      const ap = e.target.closest("[data-approve]");
      const rd = e.target.closest("[data-rdel]");
      if (ap) toggleReview(ap.dataset.approve, parseInt(ap.dataset.v, 10));
      if (rd) deleteReview(rd.dataset.rdel);
    });

    $$(".sidebar nav a").forEach((a) => a.addEventListener("click", () => switchTab(a.dataset.tab)));
    $$("[data-close]").forEach((b) => b.addEventListener("click", () => b.closest(".modal-backdrop").classList.remove("open")));
    $$(".modal-backdrop").forEach((bd) => bd.addEventListener("click", (e) => { if (e.target === bd) bd.classList.remove("open"); }));

    // Restore session
    if (token) {
      showApp();
      loadAll();
      switchTab("productos");
    }
  });
})();
