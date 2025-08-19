(function () {
  const cfgEl = document.getElementById("checkout-data");
  let CFG = { api: "", token: "", items: [] };
  try {
    CFG = JSON.parse(cfgEl?.textContent || "{}");
  } catch {}

  const API = CFG.api; // прод-URL
  const TOKEN = CFG.token || ""; // публічний токен
  const ITEMS = Array.isArray(CFG.items) ? CFG.items : [];

  const form = document.getElementById("checkoutForm");
  const select = document.getElementById("deliverySelect");
  const npRow = document.getElementById("npRow");
  const addressGroup = document.getElementById("addressGroup");
  const toastEl = document.getElementById("toast");

  // ===== Toast =====
  function showToast(title, msg, type = "success", timeout = 3500) {
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

    // Умовні required
    npCity.required = isNP;
    npBranch.required = isNP;
    addr.required = isCourier;

    // Скидаємо помилки, якщо поле більше не обов'язкове
    [npCity, npBranch, addr].forEach((el) => {
      if (!el.required) {
        el.classList.remove("is-invalid");
      }
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

    // Умовні поля
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

  // Призначаємо live-валидацію на всі інпути/текста/селект
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
    // Перевіряємо всі
    let ok = true;
    must.forEach((el) => {
      if (!validateField(el)) ok = false;
    });
    // Прокрутка до першої помилки
    if (!ok) {
      const firstInvalid = form.querySelector(".is-invalid");
      if (firstInvalid)
        firstInvalid.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
    }
    return ok;
  }

  // ===== Сабміт без alert() =====
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      showToast("Перевірте форму", "Деякі поля заповнені некоректно.", "error");
      return;
    }

    const fd = new FormData(form);
    const first_name = String(fd.get("first_name") || "").trim();
    const last_name = String(fd.get("last_name") || "").trim();
    const email = String(fd.get("email") || "").trim();
    const phone = String(fd.get("phone") || "").trim();
    const delivery_method = String(fd.get("delivery_method") || "courier_kyiv");
    const payment_method = String(fd.get("payment_method") || "bank_transfer");
    const prepayment_agreement = !!fd.get("prepayment_agreement");
    const comment = String(fd.get("comment") || "").trim();

    let delivery_address = "";
    if (delivery_method === "courier_kyiv") {
      delivery_address = String(fd.get("delivery_address") || "").trim();
    } else if (delivery_method === "nova_poshta") {
      delivery_address = [fd.get("np_city"), fd.get("np_branch")]
        .filter(Boolean)
        .join(", ");
    } else {
      delivery_address = "Самовивіз";
    }

    const payload = {
      data: {
        first_name,
        last_name,
        email,
        phone,
        delivery_method,
        delivery_address,
        payment_method,
        prepayment_agreement,
        comment,
        items: ITEMS,
      },
    };

    // Блокуємо кнопку, щоб не клікали двічі
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    try {
      const res = await fetch(API + "/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(TOKEN ? { Authorization: "Bearer " + TOKEN } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error("Order error:", err);
        showToast(
          "Помилка",
          "Не вдалося створити замовлення. Спробуйте ще раз.",
          "error",
        );
        submitBtn.disabled = false;
        return;
      }

      showToast(
        "Готово!",
        "Замовлення успішно створено. Дякуємо ❤️",
        "success",
      );
      // чистимо кошик і редіректимо через паузу
      await fetch("/api/cart/clear", {
        method: "POST",
        credentials: "same-origin",
      });
      setTimeout(() => {
        location.href = "/";
      }, 1200);
    } catch (err) {
      console.error(err);
      showToast(
        "Мережева помилка",
        "Перевірте інтернет або спробуйте пізніше.",
        "error",
      );
      submitBtn.disabled = false;
    }
  });
})();
