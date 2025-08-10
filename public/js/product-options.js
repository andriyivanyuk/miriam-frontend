(function () {
  "use strict";
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

  // Безпечне читання JSON
  const dataEl = document.getElementById("product-data");
  if (!dataEl) return;
  let DATA;
  try {
    DATA = JSON.parse(dataEl.textContent || "{}");
  } catch (e) {
    console.error("Помилка product-data:", e);
    return;
  }

  // Стан з URL
  const sp = new URLSearchParams(location.search);
  const state = {
    width: sp.get("width") ? Number(sp.get("width")) : null,
    height: sp.get("height") ? Number(sp.get("height")) : null,
    depth: sp.get("depth") ? Number(sp.get("depth")) : null,
    body: sp.get("body") ? Number(sp.get("body")) : null,
    front: sp.get("front") ? Number(sp.get("front")) : null,
    qty: sp.get("qty") ? Math.max(1, Number(sp.get("qty"))) : 1,
  };

  // DOM
  const cubes = $$(".cube");
  const swatches = $$(".color-box");
  const qtyInputEl = $("#quantity_wanted");
  const qtyFormEl = $("[data-qty-form]");
  const unitPriceEl = $("[data-unit-price]");
  const totalLineEl = $("[data-total-line]");
  const payloadInputEl = $("[data-payload]");
  const payloadPrevEl = $("[data-payload-preview]");
  const addBtnEl = $("[data-add-btn]");
  const helpEl = $("[data-help]");
  const btnUpEl = $("[data-qty-up]");
  const btnDownEl = $("[data-qty-down]");

  const fmtUA = (n) => (Number(n) || 0).toLocaleString("uk-UA");

  // НЕ додаємо #hash — щоб не було стрибків
  function urlSync() {
    const p = new URLSearchParams();
    if (state.width) p.set("width", String(state.width));
    if (state.height) p.set("height", String(state.height));
    if (state.depth) p.set("depth", String(state.depth));
    if (state.body) p.set("body", String(state.body));
    if (state.front) p.set("front", String(state.front));
    if (state.qty && state.qty !== 1) p.set("qty", String(state.qty));
    history.replaceState(
      null,
      "",
      location.pathname + (p.toString() ? "?" + p.toString() : ""),
    );
  }

  function isDisabled(param, value) {
    return !DATA.options.some((o) => {
      const mw =
        param === "width"
          ? o.width === value
          : !state.width || o.width === state.width;
      const mh =
        param === "height"
          ? o.height === value
          : !state.height || o.height === state.height;
      const md =
        param === "depth"
          ? o.depth === value
          : !state.depth || o.depth === state.depth;
      return mw && mh && md;
    });
  }
  function matched() {
    const f = DATA.options.filter(
      (o) =>
        (!state.width || o.width === state.width) &&
        (!state.height || o.height === state.height) &&
        (!state.depth || o.depth === state.depth),
    );
    return f.length === 1 ? f[0] : null;
  }
  function buildSel() {
    const m = matched();
    const unit = m ? m.price : DATA.base_price || 0;
    const total = unit * (state.qty || 1);
    return {
      productId: DATA.productId,
      model_name: DATA.model_name || null,
      qty: state.qty || 1,
      size: m
        ? {
            id: m.id,
            width: m.width,
            height: m.height,
            depth: m.depth,
            price: m.price,
          }
        : state.width || state.height || state.depth
          ? {
              width: state.width,
              height: state.height,
              depth: state.depth,
              price: null,
            }
          : null,
      body_material: state.body
        ? DATA.body.find((b) => b.id === state.body) || null
        : null,
      front_material: state.front
        ? DATA.front.find((f) => f.id === state.front) || null
        : null,
      base_price: DATA.base_price || 0,
      unit_price: unit,
      total_price: total,
      isComplete: !!(m && state.body && state.front),
      product_img: DATA.product_img || null,
    };
  }
  function render() {
    cubes.forEach((a) => {
      const p = a.getAttribute("data-param");
      const v = Number(a.getAttribute("data-value"));
      a.classList.toggle("active", state[p] === v);
      a.classList.toggle("disabled", isDisabled(p, v));
    });
    swatches.forEach((a) => {
      const p = a.getAttribute("data-param");
      const v = Number(a.getAttribute("data-value"));
      a.classList.toggle("active", state[p] === v);
    });

    const sel = buildSel();
    if (unitPriceEl) unitPriceEl.textContent = "₴" + fmtUA(sel.unit_price);
    if (totalLineEl)
      totalLineEl.textContent =
        "× " + (state.qty || 1) + " = ₴" + fmtUA(sel.total_price);

    const json = JSON.stringify(sel);
    if (payloadInputEl) payloadInputEl.value = json;
    if (payloadPrevEl) payloadPrevEl.textContent = json;

    if (addBtnEl) {
      addBtnEl.disabled = !sel.isComplete;
      const span = addBtnEl.querySelector("span");
      if (span)
        span.textContent = sel.isComplete
          ? "До кошика"
          : "Оберіть розміри та обидва кольори";
    }
    if (helpEl) {
      helpEl.textContent = sel.isComplete
        ? "Готово до додавання в кошик."
        : "Потрібно обрати валідну комбінацію розмірів + колір корпусу + колір фасадів.";
    }
  }

  // Клік по опціях — без reload/без скролу/без синьої рамки
  [...cubes, ...swatches].forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const p = a.getAttribute("data-param");
      const v = Number(a.getAttribute("data-value"));
      if (!p || a.classList.contains("disabled")) return;
      state[p] = state[p] === v ? null : v;
      urlSync();
      render();
      // прибираємо фокус, щоб не було “синьої” рамки від браузера
      if (document.activeElement === a) a.blur();
    });
  });

  // Qty
  const bump = (delta) => {
    state.qty = Math.max(1, (state.qty || 1) + delta);
    if (qtyInputEl) qtyInputEl.value = state.qty;
    urlSync();
    render();
  };
  if (btnUpEl)
    btnUpEl.addEventListener("click", (e) => {
      e.preventDefault();
      bump(+1);
    });
  if (btnDownEl)
    btnDownEl.addEventListener("click", (e) => {
      e.preventDefault();
      bump(-1);
    });
  if (qtyInputEl)
    qtyInputEl.addEventListener("change", () => {
      const v = Number(qtyInputEl.value);
      state.qty = Math.max(1, isNaN(v) ? 1 : v);
      urlSync();
      render();
    });
  if (qtyFormEl)
    qtyFormEl.addEventListener("submit", (e) => {
      e.preventDefault();
      const v = Number((qtyInputEl && qtyInputEl.value) || 1);
      state.qty = Math.max(1, isNaN(v) ? 1 : v);
      urlSync();
      render();
    });

  render();
})();
