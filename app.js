const products = [
  {
    id: "track-weekender",
    name: "Bolso Track Weekender",
    category: "Display",
    price: 89900,
    description: "Producto de muestra para que veas el tono visual de la tienda y pruebes el carrito completo.",
    status: "available",
    label: "En stock",
    artClass: "product-art--live",
    visualTitle: "Track / 01",
    visualMeta: "Weekender display"
  },
  {
    id: "garage-roll",
    name: "Tool Roll Garage",
    category: "Garage",
    price: null,
    description: "Espacio reservado para un futuro lanzamiento ligado al orden y la rutina del garage.",
    status: "coming",
    label: "Proximamente",
    artClass: "product-art--coming",
    visualTitle: "Coming",
    visualMeta: "Reservado para catalogo"
  },
  {
    id: "cabin-scent",
    name: "Cabin Scent 02",
    category: "Cabina",
    price: null,
    description: "Una ubicacion lista para sumar objetos que acompanen el interior del auto o el lifestyle diario.",
    status: "coming",
    label: "Proximamente",
    artClass: "product-art--coming",
    visualTitle: "Soon",
    visualMeta: "Lanzamiento futuro"
  },
  {
    id: "pitlane-tee",
    name: "Pitlane Tee",
    category: "Trackwear",
    price: null,
    description: "Placeholder pensado para futuras prendas sobrias con guinos de performance.",
    status: "coming",
    label: "Proximamente",
    artClass: "product-art--coming",
    visualTitle: "Drop",
    visualMeta: "Capsula pendiente"
  },
  {
    id: "dash-organizer",
    name: "Dash Organizer",
    category: "Cabina",
    price: null,
    description: "Un hueco disponible para accesorios funcionales, discretos y de tono premium.",
    status: "coming",
    label: "Proximamente",
    artClass: "product-art--coming",
    visualTitle: "Hold",
    visualMeta: "Espacio reservado"
  },
  {
    id: "travel-mug",
    name: "Apex Travel Mug",
    category: "Objetos",
    price: null,
    description: "Otro producto en espera para ampliar la mezcla entre tienda automotriz y lifestyle.",
    status: "coming",
    label: "Proximamente",
    artClass: "product-art--coming",
    visualTitle: "Next",
    visualMeta: "Pendiente de stock"
  },
  {
    id: "detailing-kit",
    name: "Detailing Capsule",
    category: "Garage",
    price: null,
    description: "Lugar reservado para kits de cuidado, limpieza o pequenos esenciales bien curados.",
    status: "coming",
    label: "Proximamente",
    artClass: "product-art--coming",
    visualTitle: "Core",
    visualMeta: "Curaduria futura"
  },
  {
    id: "helmet-shelf",
    name: "Helmet Shelf",
    category: "Garage",
    price: null,
    description: "Placeholder para una pieza mas estructural, con el mismo lenguaje sobrio del resto de la tienda.",
    status: "coming",
    label: "Proximamente",
    artClass: "product-art--coming",
    visualTitle: "Frame",
    visualMeta: "Drop pendiente"
  }
];

const cart = new Map();
const checkoutState = {
  step: "cart",
  draft: null
};

const shippingFee = 6500;
const freeShippingThreshold = 120000;
const checkoutDraftStorageKey = "pista-nera-checkout-draft";

const currencyFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0
});

const checkoutConfig = window.MERCADO_PAGO_CONFIG || {};

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
  currentYear: document.getElementById("currentYear")
};

const stepIndicators = Array.from(document.querySelectorAll("[data-step-indicator]"));

function formatCurrency(value) {
  return currencyFormatter.format(value);
}

function getCheckoutUrl() {
  return typeof checkoutConfig.checkoutUrl === "string" ? checkoutConfig.checkoutUrl.trim() : "";
}

function productMatches(product, query) {
  const content = [product.name, product.category, product.description, product.visualMeta]
    .join(" ")
    .toLowerCase();

  return content.includes(query.toLowerCase());
}

function createProductCard(product) {
  const priceLabel = product.price ? formatCurrency(product.price) : "Espacio reservado";
  const isAvailable = product.status === "available";

  return `
    <article class="product-card ${isAvailable ? "" : "product-card--coming"}">
      <div class="product-art ${product.artClass}">
        <span>${product.visualTitle}</span>
        <small>${product.visualMeta}</small>
      </div>

      <div class="product-copy">
        <div class="product-topline">
          <span>${product.category}</span>
          <span>${product.label}</span>
        </div>

        <h3>${product.name}</h3>
        <p>${product.description}</p>

        <div class="product-bottom">
          <strong>${priceLabel}</strong>
          <button
            class="product-button"
            type="button"
            data-action="add"
            data-product-id="${product.id}"
            ${isAvailable ? "" : "disabled"}
          >
            ${isAvailable ? "Agregar" : "Proximamente"}
          </button>
        </div>
      </div>
    </article>
  `;
}

function renderProducts(query = "") {
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
  elements.checkoutNote.textContent = message;
}

function setCheckoutStageNote(message) {
  elements.checkoutStageNote.textContent = message;
}

function setCheckoutStep(step) {
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

function renderCartItems() {
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
          <div class="cart-item-art" aria-hidden="true">
            <span>PN</span>
          </div>

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
  if (!draft || !draft.fullName) {
    elements.customerSummary.textContent = "Completa tus datos para validar el checkout antes de pasar al pago.";
    return;
  }

  const shippingLabel = draft.shippingMethod === "retiro" ? "Retiro coordinado" : "Envio a domicilio";
  const address = draft.shippingMethod === "retiro"
    ? "Retiro coordinado en punto a definir."
    : [
        draft.addressLine1,
        draft.addressLine2,
        draft.city,
        draft.region,
        draft.postalCode
      ]
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

  elements.cartSubtotal.textContent = formatCurrency(subtotal);
  elements.cartShipping.textContent = shippingLabel;
  elements.cartTotal.textContent = formatCurrency(total);

  elements.checkoutSubtotal.textContent = formatCurrency(subtotal);
  elements.checkoutShipping.textContent = shippingLabel;
  elements.checkoutTotal.textContent = formatCurrency(total);

  elements.cartCount.textContent = String(getTotalQuantity());
}

function updateCheckoutState() {
  const hasItems = getCartItems().length > 0;
  const hasCheckoutUrl = Boolean(getCheckoutUrl());

  elements.continueCheckoutButton.disabled = !hasItems;
  elements.mercadoPagoButton.disabled = !hasItems;

  if (!hasItems) {
    setCartStageNote("Agrega al menos un producto antes de continuar al checkout.");
    setCheckoutStageNote("No hay items para procesar. Agrega productos y vuelve a intentarlo.");

    if (checkoutState.step === "checkout") {
      setCheckoutStep("cart");
    }

    return;
  }

  setCartStageNote("Continua cuando quieras cargar direccion, contacto y metodo de entrega.");
  setCheckoutStageNote(
    hasCheckoutUrl
      ? "Al confirmar se abrira tu checkout de Mercado Pago en una nueva pestana."
      : "El formulario ya valida datos, pero el cobro real sigue pendiente hasta configurar mercadopago-config.js."
  );
}

function syncCart() {
  renderCartItems();
  renderOrderSummary();
  renderCustomerSummary();
  updateCheckoutState();
}

function openCart(step = checkoutState.step) {
  elements.cartDrawer.classList.add("is-open");
  elements.cartDrawer.setAttribute("aria-hidden", "false");
  document.body.classList.add("cart-open");
  setCheckoutStep(step);
}

function closeCart() {
  elements.cartDrawer.classList.remove("is-open");
  elements.cartDrawer.setAttribute("aria-hidden", "true");
  document.body.classList.remove("cart-open");
}

function addToCart(productId) {
  const product = products.find((entry) => entry.id === productId);

  if (!product || product.status !== "available") {
    return;
  }

  const existingItem = cart.get(productId);

  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.set(productId, { product, quantity: 1 });
  }

  syncCart();
  openCart("cart");
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
  const formData = new FormData(elements.checkoutForm);
  const draft = {};

  for (const [key, value] of formData.entries()) {
    draft[key] = String(value).trim();
  }

  return draft;
}

function persistCheckoutDraft() {
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

function handleCheckoutSubmit(event) {
  event.preventDefault();

  if (!getCartItems().length) {
    setCheckoutStep("cart");
    return;
  }

  if (!elements.checkoutForm.checkValidity()) {
    elements.checkoutForm.reportValidity();
    setCheckoutStageNote("Completa todos los campos requeridos antes de avanzar al pago.");
    return;
  }

  persistCheckoutDraft();

  const checkoutUrl = getCheckoutUrl();

  if (!checkoutUrl) {
    setCheckoutStageNote(
      "Datos validados localmente. Para abrir el cobro real falta configurar checkoutUrl o generar una preferencia desde backend."
    );
    return;
  }

  setCheckoutStageNote("Datos validados. Redirigiendo al checkout de Mercado Pago...");
  window.open(checkoutUrl, "_blank", "noopener");
}

function setCurrentYear() {
  elements.currentYear.textContent = String(new Date().getFullYear());
}

function bindEvents() {
  elements.searchInput.addEventListener("input", (event) => {
    renderProducts(event.target.value);
  });

  elements.productGrid.addEventListener("click", handleProductGridClick);
  elements.cartItems.addEventListener("click", handleCartAction);

  elements.cartToggle.addEventListener("click", () => {
    openCart(checkoutState.step);
  });
  elements.cartOverlay.addEventListener("click", closeCart);
  elements.cartClose.addEventListener("click", closeCart);
  elements.continueCheckoutButton.addEventListener("click", handleContinueCheckout);
  elements.backToCartButton.addEventListener("click", () => setCheckoutStep("cart"));
  elements.checkoutForm.addEventListener("submit", handleCheckoutSubmit);
  elements.checkoutForm.addEventListener("input", persistCheckoutDraft);
  elements.checkoutForm.addEventListener("change", persistCheckoutDraft);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && elements.cartDrawer.classList.contains("is-open")) {
      closeCart();
    }
  });
}

function init() {
  restoreCheckoutDraft();
  renderProducts();
  syncCart();
  setCurrentYear();
  bindEvents();
  setCheckoutStep("cart");
}

init();
