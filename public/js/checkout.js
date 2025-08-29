// public/js/checkout.js
(function () {
  // ===== Зчитуємо конфіг із <script id="checkout-data"> =====
  const cfgEl = document.getElementById("checkout-data");
  let CFG = { api: "", token: "", items: [] };
  try {
    CFG = JSON.parse(cfgEl?.textContent || "{}");
  } catch {}

  const API = CFG.api || ""; // прод-URL бекенду Strapi
  const TOKEN = CFG.token || ""; // публічний токен (якщо таки вирішиш використовувати)
  const ITEMS = Array.isArray(CFG.items) ? CFG.items : [];

  // ===== DOM =====
  const form = document.getElementById("checkoutForm");
  const select = document.getElementById("deliverySelect");
  const npRow = document.getElementById("npRow");
  const addressGroup = document.getElementById("addressGroup");
  const toastEl = document.getElementById("toast");

  // ===== Toast =====
  function showToast(title, msg, type = "success", timeout = 3500) {
    if (!toastEl) {
      alert(`${title}\n${msg}`);
      return;
    }
    toastEl.className = "toast-lite " + type;
    toastEl.querySelector(".title").textContent = title || "";
    toastEl.querySelector(".msg").textContent = msg || "";
    requestAnimationFrame(() => {
      toastEl.classList.add("show");
      setTimeout(() => toastEl.classList.remove("show"), timeout);
    });
  }

  // ===== Тогл блоків доставки + required =====
  const npCity = form.querySelector('[name="np_city"]');
  const npBranch = form.querySelector('[name="np_branch"]');
  const addr = form.querySelector('[name="delivery_address"]');

  function toggleDeliveryBlocks() {
    const v = select.value;
    const isNP = v === "nova_poshta";
    const isCourier = v === "courier_kyiv";

    npRow.style.display = isNP ? "block" : "none";
    addressGroup.style.display = isCourier ? "block" : "none";

    npCity.required = isNP;
    npBranch.required = isNP;
    addr.required = isCourier;

    [npCity, npBranch, addr].forEach((el) => {
      if (!el.required) el.classList.remove("is-invalid");
    });
  }
  toggleDeliveryBlocks();
  select.addEventListener("change", toggleDeliveryBlocks);

  // ===== Жива валідація =====
  const validators = {
    email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
    phone: (v) => /^\+?\d[\d\s\-()]{8,}$/.test(v),
    text: (v) => v.trim().length > 0,
  };

  function markValidity(el, ok) {
    if (ok) el.classList.remove("is-invalid");
    else el.classList.add("is-invalid");
  }

  function validateField(el) {
    const name = el.getAttribute("name");
    const val = String(el.value || "");
    let ok = true;

    if (name === "email") ok = validators.email(val);
    else if (name === "phone") ok = validators.phone(val);
    else if (el.required) ok = validators.text(val);

    if (name === "delivery_address" && select.value === "courier_kyiv") {
      ok = validators.text(val);
    }
    if (
      (name === "np_city" || name === "np_branch") &&
      select.value === "nova_poshta"
    ) {
      ok = validators.text(val);
    }

    markValidity(el, ok);
    return ok;
  }

  form.querySelectorAll("input, textarea, select").forEach((el) => {
    el.addEventListener("input", () => validateField(el));
    el.addEventListener("blur", () => validateField(el));
  });

  function validateForm() {
    const must = [
      form.querySelector('[name="first_name"]'),
      form.querySelector('[name="last_name"]'),
      form.querySelector('[name="email"]'),
      form.querySelector('[name="phone"]'),
    ];
    const dm = select.value;
    if (dm === "courier_kyiv") {
      must.push(addr);
    } else if (dm === "nova_poshta") {
      must.push(npCity, npBranch);
    }

    let ok = true;
    must.forEach((el) => {
      if (!validateField(el)) ok = false;
    });
    if (!ok) {
      const firstInvalid = form.querySelector(".is-invalid");
      if (firstInvalid)
        firstInvalid.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    return ok;
  }

  // ===== Побудова payload → рівно як чекає Strapi =====
  function buildPayload(fd) {
    const delivery_method = String(fd.get("delivery_method") || "courier_kyiv");
    const payment_method = String(fd.get("payment_method") || "bank_transfer");
    const prepayment_agreement = !!fd.get("prepayment_agreement");

    let delivery_address = "";
    if (delivery_method === "courier_kyiv") {
      delivery_address = String(fd.get("delivery_address") || "").trim();
    } else if (delivery_method === "nova_poshta") {
      const city = String(fd.get("np_city") || "").trim();
      const branch = String(fd.get("np_branch") || "").trim();
      delivery_address = [city, branch ? `відділення: ${branch}` : ""]
        .filter(Boolean)
        .join(", ");
    } else {
      delivery_address = "Самовивіз";
    }

    return {
      data: {
        first_name: String(fd.get("first_name") || "").trim(),
        last_name: String(fd.get("last_name") || "").trim(),
        email: String(fd.get("email") || "").trim(),
        phone: String(fd.get("phone") || "").trim(),
        delivery_method,
        delivery_address,
        payment_method,
        prepayment_agreement,
        comment: String(fd.get("comment") || "").trim(),
        items: ITEMS, // <- готові позиції з SSR (мають unit_price, qty, line_total)
      },
    };
  }

  // ===== Сабміт =====
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!API) {
      showToast("Налаштування", "PUBLIC_STRAPI_URL не задано", "error");
      return;
    }
    if (!Array.isArray(ITEMS) || ITEMS.length === 0) {
      showToast("Кошик порожній", "Додайте товари перед оформленням.", "error");
      return;
    }
    if (!validateForm()) {
      showToast("Перевірте форму", "Деякі поля заповнені некоректно.", "error");
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    const btnHTML = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = "Відправляємо…";

    const fd = new FormData(form);
    const payload = buildPayload(fd);

    try {
      const res = await fetch(API + "/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(TOKEN ? { Authorization: "Bearer " + TOKEN } : {}),
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg =
          json?.error?.message || json?.message || `Статус ${res.status}`;
        showToast("Помилка", msg || "Не вдалося створити замовлення.", "error");
        submitBtn.disabled = false;
        submitBtn.innerHTML = btnHTML;
        return;
      }

      const orderId = json?.data?.id ?? json?.id ?? "—";

      // чистимо кошик (твій існуючий шлях) з fallback на cookie
      try {
        await fetch("/api/cart/clear", {
          method: "POST",
          credentials: "same-origin",
        });
      } catch {
        document.cookie = `cart=[]; Path=/; Max-Age=0; SameSite=Lax`;
      }

      showToast(
        "Готово!",
        `Замовлення #${orderId} створено. Дякуємо ❤️`,
        "success",
      );
      // setTimeout(() => {
      //   // якщо є сторінка подяки — краще показати номер
      //   window.location.href = `/thank-you?order=${orderId}`;
      // }, 900);
    } catch (err) {
      console.error(err);
      showToast(
        "Мережева помилка",
        "Перевірте інтернет або спробуйте пізніше.",
        "error",
      );
      submitBtn.disabled = false;
      submitBtn.innerHTML = btnHTML;
    }
  });
})();
