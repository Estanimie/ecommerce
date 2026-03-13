const featuredProductId = "llanta-veloce-r19";
const detailQuantityBounds = { min: 1, max: 8 };
const shippingFee = 6500;
const freeShippingThreshold = 120000;
const checkoutDraftStorageKey = "pista-nera-checkout-draft";
const cartStorageKey = "pista-nera-cart";

const products = Array.isArray(window.PISTA_NERA_PRODUCTS) ? window.PISTA_NERA_PRODUCTS : [];
const featuredProduct = products.find((product) => product.id === featuredProductId) || null;
const cart = new Map();
const checkoutState = {
  step: "cart",
  draft: null,
  isSubmitting: false
};

const siteRoot = (() => {
  const rawValue = document.body?.dataset.siteRoot || "";

  if (!rawValue) {
    return "";
  }

  return rawValue.endsWith("/") ? rawValue : `${rawValue}/`;
})();

const runtimeConfig = window.PISTA_NERA_CONFIG || {};
const apiBaseUrl = typeof runtimeConfig.apiBaseUrl === "string" ? runtimeConfig.apiBaseUrl.trim().replace(/\/$/, "") : "";

const currencyFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0
});

const elements = {
  searchInput: document.getElementById("searchInput"),
  productGrid: document.getElementById("productGrid"),
  emptyState: document.getElementById("emptyState"),
  resultsLabel: document.getElementById("resultsLabel"),
  cartToggle: document.getElementById("cartToggle"),
  cartCount: document.getElementById("cartCount"),
  cartDrawer: document.getElementById("cartDrawer"),
  cartOverlay: document.getElementById("cartOverlay"),
  cartClose: document.getElementById("cartClose"),
  cartTitle: document.getElementById("cartTitle"),
  cartSubcopy: document.getElementById("cartSubcopy"),
  cartItems: document.getElementById("cartItems"),
  cartEmpty: document.getElementById("cartEmpty"),
  cartStage: document.getElementById("cartStage"),
  checkoutStage: document.getElementById("checkoutStage"),
  cartSubtotal: document.getElementById("cartSubtotal"),
  cartShipping: document.getElementById("cartShipping"),
  cartTotal: document.getElementById("cartTotal"),
  continueCheckoutButton: document.getElementById("continueCheckoutButton"),
  checkoutForm: document.getElementById("checkoutForm"),
  backToCartButton: document.getElementById("backToCartButton"),
  checkoutSubtotal: document.getElementById("checkoutSubtotal"),
  checkoutShipping: document.getElementById("checkoutShipping"),
  checkoutTotal: document.getElementById("checkoutTotal"),
  customerSummary: document.getElementById("customerSummary"),
  mercadoPagoButton: document.getElementById("mercadoPagoButton"),
  checkoutNote: document.getElementById("checkoutNote"),
  checkoutStageNote: document.getElementById("checkoutStageNote"),
  currentYear: document.getElementById("currentYear"),
  productDetailImage: document.getElementById("productDetailImage"),
  productThumbs: document.getElementById("productThumbs"),
  productQuantityInput: document.getElementById("productQuantityInput"),
  productQuantityDecrease: document.getElementById("productQuantityDecrease"),
  productQuantityIncrease: document.getElementById("productQuantityIncrease"),
  detailAddToCartButton: document.getElementById("detailAddToCartButton"),
  detailBuyNowButton: document.getElementById("detailBuyNowButton")
};

const stepIndicators = Array.from(document.querySelectorAll("[data-step-indicator]"));

function formatCurrency(value) {
  return currencyFormatter.format(value);
}

function resolveSitePath(path) {
  return path ? `${siteRoot}${path}` : "";
}

function getProductImageSrc(product) {
  return product.image ? resolveSitePath(`assets/${product.image}`) : "";
}

function getApiUrl(path) {
  return apiBaseUrl ? `${apiBaseUrl}${path}` : path;
}

function isFileProtocol() {
  return window.location.protocol === "file:";
}

function getProductPageLink(product) {
  if (!product?.detailTarget) {
    return "product.html";
  }

  return isFileProtocol() ? product.detailTarget : product.detailTarget.replace(/\.html$/, "");
}

function productMatches(product, query) {
  const content = [product.name, product.category, product.description, product.visualMeta, product.label]
    .join(" ")
    .toLowerCase();

  return content.includes(query.toLowerCase());
}

function createProductArt(product) {
  if (product.image) {
    const imageSrc = getProductImageSrc(product);

    return `
      <div class="product-art ${product.artClass}">
        <img src="${imageSrc}" alt="${product.name}">
        <span>${product.visualTitle}</span>
        <small>${product.visualMeta}</small>
      </div>
    `;
  }

  return `
    <div class="product-art ${product.artClass}">
      <span>${product.visualTitle}</span>
      <small>${product.visualMeta}</small>
    </div>
  `;
}

function createProductCard(product) {
  const priceLabel = product.price ? formatCurrency(product.price) : "Espacio reservado";
  const isAvailable = product.status === "available";
  const productActions = isAvailable
    ? `
      <div class="product-card-actions">
        <a class="product-link" href="${getProductPageLink(product)}">Ver producto</a>
        <button class="product-button" type="button" data-action="add" data-product-id="${product.id}">Agregar</button>
      </div>
    `
    : `
      <button class="product-button" type="button" data-action="add" data-product-id="${product.id}" disabled>
        Proximamente
      </button>
    `;

  return `
    <article class="product-card ${isAvailable ? "" : "product-card--coming"}">
      ${createProductArt(product)}

      <div class="product-copy">
        <div class="product-topline">
          <span>${product.category}</span>
          <span>${product.label}</span>
        </div>

        <h3>${product.name}</h3>
        <p>${product.description}</p>

        <div class="product-bottom">
          <strong>${priceLabel}</strong>
          ${productActions}
        </div>
      </div>
    </article>
  `;
}

function renderProducts(query = "") {
  if (!elements.productGrid || !elements.emptyState || !elements.resultsLabel) {
    return;
  }

  const normalizedQuery = query.trim().toLowerCase();
  const visibleProducts = normalizedQuery
    ? products.filter((product) => productMatches(product, normalizedQuery))
    : products;

  elements.productGrid.innerHTML = visibleProducts.map(createProductCard).join("");
  elements.emptyState.hidden = visibleProducts.length !== 0;

  if (!normalizedQuery) {
    const activeProducts = products.filter((product) => product.status === "available").length;
    const reservedProducts = products.length - activeProducts;
    elements.resultsLabel.textContent = `${activeProducts} producto activo y ${reservedProducts} espacios listos para completar.`;
    return;
  }

  elements.resultsLabel.textContent = `${visibleProducts.length} resultado${visibleProducts.length === 1 ? "" : "s"} para "${query.trim()}".`;
}

function persistCart() {
  try {
    const serializedCart = Array.from(cart.values()).map((item) => ({
      productId: item.product.id,
      quantity: item.quantity
    }));

    localStorage.setItem(cartStorageKey, JSON.stringify(serializedCart));
  } catch (error) {
    console.warn("No se pudo persistir el carrito.", error);
  }
}

function restoreCart() {
  try {
    const storedValue = localStorage.getItem(cartStorageKey);

    if (!storedValue) {
      return;
    }

    const parsedItems = JSON.parse(storedValue);

    if (!Array.isArray(parsedItems)) {
      return;
    }

    parsedItems.forEach((entry) => {
      const product = products.find((item) => item.id === entry.productId);
      const quantity = Math.max(1, Number.parseInt(String(entry.quantity), 10) || 1);

      if (product && product.status === "available") {
        cart.set(product.id, { product, quantity });
      }
    });
  } catch (error) {
    console.warn("No se pudo restaurar el carrito.", error);
  }
}

function getCartItems() {
  return Array.from(cart.values());
}

function getTotalQuantity() {
  return getCartItems().reduce((total, item) => total + item.quantity, 0);
}

function getSubtotal() {
  return getCartItems().reduce((total, item) => total + item.product.price * item.quantity, 0);
}

function getSelectedShippingMethod() {
  const field = elements.checkoutForm?.elements.namedItem("shippingMethod");

  if (field && "value" in field && typeof field.value === "string" && field.value) {
    return field.value;
  }

  return checkoutState.draft?.shippingMethod || "domicilio";
}

function getShipping(subtotal, shippingMethod = getSelectedShippingMethod()) {
  if (subtotal === 0) {
    return 0;
  }

  if (shippingMethod === "retiro") {
    return 0;
  }

  return subtotal >= freeShippingThreshold ? 0 : shippingFee;
}

function setCartStageNote(message) {
  if (elements.checkoutNote) {
    elements.checkoutNote.textContent = message;
  }
}

function setCheckoutStageNote(message) {
  if (elements.checkoutStageNote) {
    elements.checkoutStageNote.textContent = message;
  }
}

function setCheckoutStep(step) {
  if (!elements.cartStage || !elements.checkoutStage || !elements.cartTitle || !elements.cartSubcopy) {
    return;
  }

  checkoutState.step = step;

  const isCartStep = step === "cart";

  elements.cartStage.hidden = !isCartStep;
  elements.checkoutStage.hidden = isCartStep;
  elements.cartStage.classList.toggle("is-active", isCartStep);
  elements.checkoutStage.classList.toggle("is-active", !isCartStep);

  elements.cartTitle.textContent = isCartStep ? "Tu carrito" : "Datos de envio";
  elements.cartSubcopy.textContent = isCartStep
    ? "Revisa los productos agregados y avanza al paso de envio cuando quieras continuar."
    : "Completa contacto y direccion. El flujo valida datos en cliente y luego deriva al checkout de pago.";

  stepIndicators.forEach((indicator) => {
    indicator.classList.toggle("is-active", indicator.dataset.stepIndicator === step);
  });

  if (!isCartStep) {
    const firstField = elements.checkoutForm?.querySelector("input, select, textarea");
    firstField?.focus();
  }
}

function createCartItemArt(product) {
  if (product.image) {
    const imageSrc = getProductImageSrc(product);

    return `
      <div class="cart-item-art cart-item-art--image" aria-hidden="true">
        <img src="${imageSrc}" alt="${product.name}">
      </div>
    `;
  }

  return `
    <div class="cart-item-art" aria-hidden="true">
      <span>PN</span>
    </div>
  `;
}

function renderCartItems() {
  if (!elements.cartItems || !elements.cartEmpty) {
    return;
  }

  const items = getCartItems();

  if (!items.length) {
    elements.cartItems.innerHTML = "";
    elements.cartEmpty.hidden = false;
    return;
  }

  elements.cartEmpty.hidden = true;
  elements.cartItems.innerHTML = items
    .map(
      (item) => `
        <article class="cart-item">
          ${createCartItemArt(item.product)}

          <div class="cart-item-copy">
            <div>
              <h3>${item.product.name}</h3>
              <p>${item.product.category}</p>
            </div>

            <div class="cart-item-meta">
              <strong>${formatCurrency(item.product.price)}</strong>
              <div class="cart-qty">
                <button type="button" data-action="decrease" data-product-id="${item.product.id}" aria-label="Quitar una unidad">-</button>
                <span>${item.quantity}</span>
                <button type="button" data-action="increase" data-product-id="${item.product.id}" aria-label="Agregar una unidad">+</button>
              </div>
            </div>

            <button class="cart-remove" type="button" data-action="remove" data-product-id="${item.product.id}">
              Eliminar
            </button>
          </div>
        </article>
      `
    )
    .join("");
}

function renderCustomerSummary(draft = checkoutState.draft) {
  if (!elements.customerSummary) {
    return;
  }

  if (!draft || !draft.fullName) {
    elements.customerSummary.textContent = "Completa tus datos para validar el checkout antes de pasar al pago.";
    return;
  }

  const shippingLabel = draft.shippingMethod === "retiro" ? "Retiro coordinado" : "Envio a domicilio";
  const address = draft.shippingMethod === "retiro"
    ? "Retiro coordinado en punto a definir."
    : [draft.addressLine1, draft.addressLine2, draft.city, draft.region, draft.postalCode]
        .filter(Boolean)
        .join(", ");

  const lines = [
    `${draft.fullName} | ${draft.email}`,
    draft.phone,
    shippingLabel,
    address,
    draft.notes ? `Notas: ${draft.notes}` : ""
  ].filter(Boolean);

  elements.customerSummary.textContent = lines.join("\n");
}

function renderOrderSummary() {
  const subtotal = getSubtotal();
  const shipping = getShipping(subtotal);
  const total = subtotal + shipping;
  const shippingLabel = shipping === 0 && subtotal > 0 ? "Gratis" : formatCurrency(shipping);

  if (elements.cartSubtotal) {
    elements.cartSubtotal.textContent = formatCurrency(subtotal);
  }
  if (elements.cartShipping) {
    elements.cartShipping.textContent = shippingLabel;
  }
  if (elements.cartTotal) {
    elements.cartTotal.textContent = formatCurrency(total);
  }
  if (elements.checkoutSubtotal) {
    elements.checkoutSubtotal.textContent = formatCurrency(subtotal);
  }
  if (elements.checkoutShipping) {
    elements.checkoutShipping.textContent = shippingLabel;
  }
  if (elements.checkoutTotal) {
    elements.checkoutTotal.textContent = formatCurrency(total);
  }
  if (elements.cartCount) {
    elements.cartCount.textContent = String(getTotalQuantity());
  }
}

function updateCheckoutState() {
  const hasItems = getCartItems().length > 0;

  if (elements.continueCheckoutButton) {
    elements.continueCheckoutButton.disabled = !hasItems;
  }
  if (elements.mercadoPagoButton) {
    elements.mercadoPagoButton.disabled = !hasItems || checkoutState.isSubmitting;
  }

  if (!hasItems) {
    setCartStageNote("Agrega al menos un producto antes de continuar al checkout.");
    setCheckoutStageNote("No hay items para procesar. Agrega productos y vuelve a intentarlo.");

    if (checkoutState.step === "checkout") {
      setCheckoutStep("cart");
    }

    return;
  }

  if (isFileProtocol()) {
    setCheckoutStageNote("Para cobrar de verdad tenes que abrir la tienda desde el servidor Node y no con doble click en el HTML.");
    return;
  }

  setCartStageNote("Continua cuando quieras cargar direccion, contacto y metodo de entrega.");
  setCheckoutStageNote("Al confirmar, el backend va a crear una preferencia segura de Mercado Pago y te va a redirigir al pago.");
}

function syncCart() {
  persistCart();
  renderCartItems();
  renderOrderSummary();
  renderCustomerSummary();
  updateCheckoutState();
}

function openCart(step = checkoutState.step) {
  if (!elements.cartDrawer) {
    return;
  }

  elements.cartDrawer.classList.add("is-open");
  elements.cartDrawer.setAttribute("aria-hidden", "false");
  document.body.classList.add("cart-open");
  setCheckoutStep(step);
}

function closeCart() {
  if (!elements.cartDrawer) {
    return;
  }

  elements.cartDrawer.classList.remove("is-open");
  elements.cartDrawer.setAttribute("aria-hidden", "true");
  document.body.classList.remove("cart-open");
}

function addToCart(productId, quantity = 1, nextStep = "cart") {
  const product = products.find((entry) => entry.id === productId);

  if (!product || product.status !== "available") {
    return;
  }

  const safeQuantity = Math.max(1, Number.parseInt(String(quantity), 10) || 1);
  const existingItem = cart.get(productId);

  if (existingItem) {
    existingItem.quantity += safeQuantity;
  } else {
    cart.set(productId, { product, quantity: safeQuantity });
  }

  syncCart();
  openCart(nextStep);
}

function updateItemQuantity(productId, step) {
  const item = cart.get(productId);

  if (!item) {
    return;
  }

  item.quantity += step;

  if (item.quantity <= 0) {
    cart.delete(productId);
  }

  syncCart();
}

function removeFromCart(productId) {
  cart.delete(productId);
  syncCart();
}

function handleProductGridClick(event) {
  const button = event.target.closest("button[data-action='add']");

  if (!button) {
    return;
  }

  addToCart(button.dataset.productId);
}

function handleCartAction(event) {
  const button = event.target.closest("button[data-action]");

  if (!button) {
    return;
  }

  const productId = button.dataset.productId;

  switch (button.dataset.action) {
    case "increase":
      updateItemQuantity(productId, 1);
      break;
    case "decrease":
      updateItemQuantity(productId, -1);
      break;
    case "remove":
      removeFromCart(productId);
      break;
    default:
      break;
  }
}

function getCheckoutDraftFromForm() {
  if (!elements.checkoutForm) {
    return checkoutState.draft || {};
  }

  const formData = new FormData(elements.checkoutForm);
  const draft = {};

  for (const [key, value] of formData.entries()) {
    draft[key] = String(value).trim();
  }

  return draft;
}

function persistCheckoutDraft() {
  if (!elements.checkoutForm) {
    return;
  }

  checkoutState.draft = getCheckoutDraftFromForm();

  try {
    localStorage.setItem(checkoutDraftStorageKey, JSON.stringify(checkoutState.draft));
  } catch (error) {
    console.warn("No se pudo persistir el borrador de checkout.", error);
  }

  renderCustomerSummary();
  renderOrderSummary();
}

function restoreCheckoutDraft() {
  if (!elements.checkoutForm) {
    return;
  }

  try {
    const storedValue = localStorage.getItem(checkoutDraftStorageKey);

    if (!storedValue) {
      return;
    }

    const draft = JSON.parse(storedValue);

    if (!draft || typeof draft !== "object") {
      return;
    }

    checkoutState.draft = draft;

    Object.entries(draft).forEach(([key, value]) => {
      const field = elements.checkoutForm.elements.namedItem(key);

      if (field && "value" in field) {
        field.value = value;
      }
    });
  } catch (error) {
    console.warn("No se pudo restaurar el borrador de checkout.", error);
  }
}

function handleContinueCheckout() {
  if (!getCartItems().length) {
    setCartStageNote("Agrega al menos un producto antes de continuar al checkout.");
    return;
  }

  persistCheckoutDraft();
  setCheckoutStep("checkout");
}

async function createMercadoPagoPreference() {
  const response = await fetch(getApiUrl("/api/create-preference"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      items: getCartItems().map((item) => ({
        id: item.product.id,
        quantity: item.quantity
      })),
      customer: checkoutState.draft,
      shippingMethod: getSelectedShippingMethod()
    })
  });

  const payload = await response.json().catch(() => ({ error: "No se pudo leer la respuesta del servidor." }));

  if (!response.ok) {
    throw new Error(payload.error || "No se pudo crear la preferencia de Mercado Pago.");
  }

  return payload;
}

async function handleCheckoutSubmit(event) {
  event.preventDefault();

  if (!getCartItems().length) {
    setCheckoutStep("cart");
    return;
  }

  if (!elements.checkoutForm?.checkValidity()) {
    elements.checkoutForm?.reportValidity();
    setCheckoutStageNote("Completa todos los campos requeridos antes de avanzar al pago.");
    return;
  }

  if (isFileProtocol()) {
    setCheckoutStageNote("Abri la tienda desde `node server.js` o `npm start` para que el backend pueda crear la preferencia de Mercado Pago.");
    return;
  }

  persistCheckoutDraft();
  checkoutState.isSubmitting = true;
  updateCheckoutState();
  setCheckoutStageNote("Preparando checkout seguro de Mercado Pago...");

  try {
    const preference = await createMercadoPagoPreference();
    setCheckoutStageNote("Preferencia creada. Redirigiendo al checkout seguro...");
    window.location.href = preference.redirectUrl;
  } catch (error) {
    setCheckoutStageNote(error instanceof Error ? error.message : "No se pudo iniciar el pago.");
  } finally {
    checkoutState.isSubmitting = false;
    updateCheckoutState();
  }
}

function clampDetailQuantity(value) {
  const parsedValue = Number.parseInt(String(value), 10);

  if (Number.isNaN(parsedValue)) {
    return detailQuantityBounds.min;
  }

  return Math.min(detailQuantityBounds.max, Math.max(detailQuantityBounds.min, parsedValue));
}

function setDetailQuantity(value) {
  if (!elements.productQuantityInput) {
    return;
  }

  elements.productQuantityInput.value = String(clampDetailQuantity(value));
}

function getDetailQuantity() {
  const quantity = clampDetailQuantity(elements.productQuantityInput?.value ?? detailQuantityBounds.min);
  setDetailQuantity(quantity);
  return quantity;
}

function changeDetailQuantity(step) {
  setDetailQuantity(getDetailQuantity() + step);
}

function setActiveProductImage(button) {
  if (!button || !elements.productDetailImage) {
    return;
  }

  const { image, alt } = button.dataset;

  if (image) {
    elements.productDetailImage.src = image;
  }

  if (alt) {
    elements.productDetailImage.alt = alt;
  }

  const thumbButtons = Array.from(elements.productThumbs?.querySelectorAll(".product-thumb") || []);

  thumbButtons.forEach((thumbButton) => {
    const isActive = thumbButton === button;
    thumbButton.classList.toggle("is-active", isActive);
    thumbButton.setAttribute("aria-pressed", String(isActive));
  });
}

function handleProductThumbClick(event) {
  const button = event.target.closest(".product-thumb");

  if (!button) {
    return;
  }

  setActiveProductImage(button);
}

function handleDetailAddToCart() {
  if (!featuredProduct) {
    return;
  }

  addToCart(featuredProduct.id, getDetailQuantity(), "cart");
}

function handleDetailBuyNow() {
  if (!featuredProduct) {
    return;
  }

  persistCheckoutDraft();
  addToCart(featuredProduct.id, getDetailQuantity(), "checkout");
}

function setCurrentYear() {
  if (elements.currentYear) {
    elements.currentYear.textContent = String(new Date().getFullYear());
  }
}

function bindEvents() {
  elements.searchInput?.addEventListener("input", (event) => {
    renderProducts(event.target.value);
  });

  elements.productGrid?.addEventListener("click", handleProductGridClick);
  elements.cartItems?.addEventListener("click", handleCartAction);

  elements.cartToggle?.addEventListener("click", () => {
    openCart(checkoutState.step);
  });
  elements.cartOverlay?.addEventListener("click", closeCart);
  elements.cartClose?.addEventListener("click", closeCart);
  elements.continueCheckoutButton?.addEventListener("click", handleContinueCheckout);
  elements.backToCartButton?.addEventListener("click", () => setCheckoutStep("cart"));
  elements.checkoutForm?.addEventListener("submit", handleCheckoutSubmit);
  elements.checkoutForm?.addEventListener("input", persistCheckoutDraft);
  elements.checkoutForm?.addEventListener("change", persistCheckoutDraft);

  elements.productThumbs?.addEventListener("click", handleProductThumbClick);
  elements.productQuantityDecrease?.addEventListener("click", () => changeDetailQuantity(-1));
  elements.productQuantityIncrease?.addEventListener("click", () => changeDetailQuantity(1));
  elements.productQuantityInput?.addEventListener("change", () => setDetailQuantity(elements.productQuantityInput.value));
  elements.productQuantityInput?.addEventListener("blur", () => setDetailQuantity(elements.productQuantityInput.value));
  elements.detailAddToCartButton?.addEventListener("click", handleDetailAddToCart);
  elements.detailBuyNowButton?.addEventListener("click", handleDetailBuyNow);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && elements.cartDrawer?.classList.contains("is-open")) {
      closeCart();
    }
  });
}

function initProductDetail() {
  setDetailQuantity(detailQuantityBounds.min);

  const activeThumb = elements.productThumbs?.querySelector(".product-thumb.is-active")
    || elements.productThumbs?.querySelector(".product-thumb");

  if (activeThumb) {
    setActiveProductImage(activeThumb);
  }
}

function init() {
  restoreCart();
  restoreCheckoutDraft();
  renderProducts();
  initProductDetail();
  syncCart();
  setCurrentYear();
  bindEvents();
  setCheckoutStep("cart");
}

init();

