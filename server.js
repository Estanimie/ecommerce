const fs = require("fs");
const path = require("path");
const http = require("http");
const crypto = require("crypto");
const { URL } = require("url");

loadEnvFile();

const products = require("./products-data.js");
const rootDir = __dirname;
const dataDir = path.join(rootDir, "data");
const ordersFile = path.join(dataDir, "orders.json");

const config = {
  port: Number.parseInt(process.env.PORT || "3000", 10),
  appBaseUrl: (process.env.APP_BASE_URL || renderExternalUrl || "").trim(),
  apiBaseUrl: Object.prototype.hasOwnProperty.call(process.env, "API_BASE_URL")
    ? String(process.env.API_BASE_URL || "").trim()
    : (process.env.API_BASE_URL || process.env.APP_BASE_URL || renderExternalUrl || "").trim(),
  mercadoPagoAccessToken: (process.env.MP_ACCESS_TOKEN || "").trim(),
  mercadoPagoPublicKey: (process.env.MP_PUBLIC_KEY || "").trim(),
  mercadoPagoWebhookSecret: (process.env.MP_WEBHOOK_SECRET || "").trim(),
  mercadoPagoEnvironment: (process.env.MP_ENVIRONMENT || "test").trim().toLowerCase(),
  statementDescriptor: (process.env.MP_STATEMENT_DESCRIPTOR || "").trim()
};

ensureDataStore();

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp"
};

function loadEnvFile() {
  const envPath = path.join(__dirname, ".env");

  if (!fs.existsSync(envPath)) {
    return;
  }

  const envLines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);

  envLines.forEach((line) => {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      return;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex === -1) {
      return;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    const value = rawValue.replace(/^['"]|['"]$/g, "");

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  });
}

function ensureDataStore() {
  fs.mkdirSync(dataDir, { recursive: true });

  if (!fs.existsSync(ordersFile)) {
    fs.writeFileSync(ordersFile, "[]\n", "utf8");
  }
}

function readOrders() {
  try {
    const raw = fs.readFileSync(ordersFile, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("No se pudo leer data/orders.json", error);
    return [];
  }
}

function writeOrders(orders) {
  fs.writeFileSync(ordersFile, `${JSON.stringify(orders, null, 2)}\n`, "utf8");
}

function appendOrderEvent(order, event) {
  if (!Array.isArray(order.events)) {
    order.events = [];
  }

  order.events.push({
    ...event,
    at: new Date().toISOString()
  });
}

function sendJson(response, statusCode, payload) {
  const body = JSON.stringify(payload);
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store"
  });
  response.end(body);
}

function sendText(response, statusCode, body) {
  response.writeHead(statusCode, {
    "Content-Type": "text/plain; charset=utf-8",
    "Content-Length": Buffer.byteLength(body)
  });
  response.end(body);
}

function resolveStaticPath(pathname) {
  if (pathname === "/" || pathname === "/index.html") {
    return path.join(rootDir, "index.html");
  }

  if (pathname === "/product" || pathname === "/product/" || pathname === "/product.html") {
    return path.join(rootDir, "product.html");
  }

  if (pathname === "/payment-result" || pathname === "/payment-result.html") {
    return path.join(rootDir, "payment-result.html");
  }

  const safePath = path.normalize(pathname).replace(/^([.][.][/\\])+/, "");
  const fullPath = path.join(rootDir, safePath);

  if (!fullPath.startsWith(rootDir)) {
    return null;
  }

  return fullPath;
}

function serveStaticFile(response, pathname) {
  const filePath = resolveStaticPath(pathname);

  if (!filePath || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    sendText(response, 404, "Not found");
    return;
  }

  const extension = path.extname(filePath).toLowerCase();
  const contentType = contentTypes[extension] || "application/octet-stream";
  const fileContent = fs.readFileSync(filePath);

  response.writeHead(200, {
    "Content-Type": contentType,
    "Content-Length": fileContent.length
  });
  response.end(fileContent);
}

async function readJsonBody(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  const rawBody = Buffer.concat(chunks).toString("utf8");

  if (!rawBody) {
    return {};
  }

  return JSON.parse(rawBody);
}

function createOrderId() {
  return `PN-${Date.now()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

function buildAbsoluteUrl(pathnameWithQuery, baseUrl = config.appBaseUrl) {
  if (!baseUrl) {
    return "";
  }

  return new URL(pathnameWithQuery, `${baseUrl.replace(/\/$/, "")}/`).toString();
}

function canUsePublicHttpsUrl(baseUrl) {
  return /^https:\/\//i.test(baseUrl || "");
}

function calculateShipping(subtotal, shippingMethod) {
  if (subtotal === 0) {
    return 0;
  }

  if (shippingMethod === "retiro") {
    return 0;
  }

  return subtotal >= 120000 ? 0 : 6500;
}

function normalizeCheckoutItems(rawItems) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw new Error("No hay items para cobrar.");
  }

  return rawItems.map((rawItem) => {
    const product = products.find((entry) => entry.id === rawItem.id);
    const quantity = Math.max(1, Number.parseInt(String(rawItem.quantity), 10) || 1);

    if (!product || product.status !== "available" || typeof product.price !== "number") {
      throw new Error(`Producto invalido: ${rawItem.id || "desconocido"}.`);
    }

    return {
      id: product.id,
      name: product.name,
      description: product.description,
      image: product.image,
      quantity,
      unitPrice: product.price,
      category: product.category
    };
  });
}

function normalizeCustomer(rawCustomer = {}) {
  const fullName = String(rawCustomer.fullName || "").trim();
  const nameParts = fullName.split(/\s+/).filter(Boolean);
  const payer = {};

  if (nameParts.length) {
    payer.name = nameParts.shift();
    if (nameParts.length) {
      payer.surname = nameParts.join(" ");
    }
  }

  if (rawCustomer.email) {
    payer.email = String(rawCustomer.email).trim();
  }

  if (rawCustomer.phone) {
    payer.phone = {
      number: String(rawCustomer.phone).trim()
    };
  }

  const addressLine = String(rawCustomer.addressLine1 || "").trim();

  if (addressLine) {
    payer.address = {
      street_name: addressLine,
      zip_code: String(rawCustomer.postalCode || "").trim()
    };
  }

  return {
    fullName,
    email: String(rawCustomer.email || "").trim(),
    phone: String(rawCustomer.phone || "").trim(),
    region: String(rawCustomer.region || "").trim(),
    addressLine1: addressLine,
    addressLine2: String(rawCustomer.addressLine2 || "").trim(),
    city: String(rawCustomer.city || "").trim(),
    postalCode: String(rawCustomer.postalCode || "").trim(),
    shippingMethod: String(rawCustomer.shippingMethod || "domicilio").trim() || "domicilio",
    notes: String(rawCustomer.notes || "").trim(),
    payer
  };
}

function buildMercadoPagoItems(items, shippingAmount) {
  const mercadopagoItems = items.map((item) => ({
    id: item.id,
    title: item.name,
    description: item.description,
    quantity: item.quantity,
    currency_id: "ARS",
    unit_price: item.unitPrice,
    picture_url: item.image ? buildAbsoluteUrl(`assets/${item.image}`) : undefined,
    category_id: item.category.toLowerCase()
  }));

  if (shippingAmount > 0) {
    mercadopagoItems.push({
      id: "envio-domicilio",
      title: "Envio a domicilio",
      description: "Costo logistico del pedido",
      quantity: 1,
      currency_id: "ARS",
      unit_price: shippingAmount,
      category_id: "shipping"
    });
  }

  return mercadopagoItems;
}

function sanitizeOrderForClient(order) {
  return {
    orderId: order.orderId,
    status: order.status,
    paymentStatus: order.paymentStatus || null,
    paymentId: order.paymentId || null,
    totalAmount: order.totalAmount,
    subtotalAmount: order.subtotalAmount,
    shippingAmount: order.shippingAmount,
    shippingMethod: order.shippingMethod,
    customer: {
      fullName: order.customer?.fullName || "",
      email: order.customer?.email || ""
    },
    items: Array.isArray(order.items)
      ? order.items.map((item) => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice
        }))
      : [],
    updatedAt: order.updatedAt,
    preferenceId: order.preferenceId || null
  };
}

async function mercadoPagoRequest(pathname, options = {}) {
  if (!config.mercadoPagoAccessToken) {
    throw new Error("Falta configurar MP_ACCESS_TOKEN en .env.");
  }

  const response = await fetch(`https://api.mercadopago.com${pathname}`, {
    method: options.method || "GET",
    headers: {
      Authorization: `Bearer ${config.mercadoPagoAccessToken}`,
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const details = payload.message || payload.error || JSON.stringify(payload);
    throw new Error(`Mercado Pago respondio con error: ${details}`);
  }

  return payload;
}

function buildPreferencePayload(items, customer, shippingAmount, orderId) {
  if (!canUsePublicHttpsUrl(config.appBaseUrl)) {
    throw new Error("APP_BASE_URL debe ser una URL publica con HTTPS para las back_urls de Mercado Pago.");
  }

  if (!canUsePublicHttpsUrl(config.apiBaseUrl)) {
    throw new Error("API_BASE_URL debe ser una URL publica con HTTPS para recibir webhooks de Mercado Pago.");
  }

  const payload = {
    items: buildMercadoPagoItems(items, shippingAmount),
    external_reference: orderId,
    back_urls: {
      success: buildAbsoluteUrl("payment-result.html?status=approved", config.appBaseUrl),
      failure: buildAbsoluteUrl("payment-result.html?status=rejected", config.appBaseUrl),
      pending: buildAbsoluteUrl("payment-result.html?status=pending", config.appBaseUrl)
    },
    auto_return: "approved",
    notification_url: buildAbsoluteUrl("api/mercadopago/webhook", config.apiBaseUrl),
    payer: customer.payer,
    metadata: {
      order_id: orderId,
      source: "pista-nera-store",
      customer_email: customer.email || ""
    }
  };

  if (config.statementDescriptor) {
    payload.statement_descriptor = config.statementDescriptor;
  }

  return payload;
}

function selectCheckoutRedirect(preference) {
  if (config.mercadoPagoEnvironment === "production") {
    return preference.init_point;
  }

  return preference.sandbox_init_point || preference.init_point;
}

async function handleCreatePreference(request, response) {
  try {
    const body = await readJsonBody(request);
    const items = normalizeCheckoutItems(body.items);
    const customer = normalizeCustomer(body.customer);
    const subtotal = items.reduce((total, item) => total + item.quantity * item.unitPrice, 0);
    const shippingMethod = customer.shippingMethod || body.shippingMethod || "domicilio";
    const shippingAmount = calculateShipping(subtotal, shippingMethod);
    const totalAmount = subtotal + shippingAmount;
    const orderId = createOrderId();
    const preferencePayload = buildPreferencePayload(items, customer, shippingAmount, orderId);
    const preference = await mercadoPagoRequest("/checkout/preferences", {
      method: "POST",
      body: preferencePayload
    });

    const orders = readOrders();
    const order = {
      orderId,
      status: "preference_created",
      paymentStatus: "pending",
      subtotalAmount: subtotal,
      shippingAmount,
      totalAmount,
      shippingMethod,
      customer,
      items,
      preferenceId: preference.id,
      preferencePayload,
      redirectUrl: selectCheckoutRedirect(preference),
      initPoint: preference.init_point,
      sandboxInitPoint: preference.sandbox_init_point || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      events: []
    };

    appendOrderEvent(order, {
      type: "preference_created",
      preferenceId: preference.id,
      amount: totalAmount
    });

    orders.push(order);
    writeOrders(orders);

    sendJson(response, 201, {
      orderId,
      preferenceId: preference.id,
      redirectUrl: order.redirectUrl,
      publicKeyConfigured: Boolean(config.mercadoPagoPublicKey)
    });
  } catch (error) {
    sendJson(response, 400, {
      error: error instanceof Error ? error.message : "No se pudo crear la preferencia."
    });
  }
}

function getSignatureHeaderParts(signatureHeader) {
  return String(signatureHeader || "")
    .split(",")
    .map((segment) => segment.trim())
    .reduce((accumulator, segment) => {
      const [key, value] = segment.split("=", 2);
      if (key && value) {
        accumulator[key] = value;
      }
      return accumulator;
    }, {});
}

function safeCompareHex(a, b) {
  if (!a || !b) {
    return false;
  }

  const aBuffer = Buffer.from(a, "hex");
  const bBuffer = Buffer.from(b, "hex");

  if (aBuffer.length !== bBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(aBuffer, bBuffer);
}

function validateWebhookSignature(requestUrl, headers, resourceId) {
  if (!config.mercadoPagoWebhookSecret) {
    return {
      valid: false,
      skipped: true,
      reason: "MP_WEBHOOK_SECRET no esta configurado."
    };
  }

  const signatureHeader = headers["x-signature"];
  const requestId = headers["x-request-id"];

  if (!signatureHeader || !requestId) {
    return {
      valid: false,
      skipped: false,
      reason: "Faltan headers x-signature o x-request-id."
    };
  }

  const signatureParts = getSignatureHeaderParts(signatureHeader);
  const timestamp = signatureParts.ts;
  const incomingHash = signatureParts.v1;
  const requestUrlObject = new URL(requestUrl, "http://localhost");
  const dataId = resourceId || requestUrlObject.searchParams.get("data.id") || requestUrlObject.searchParams.get("id") || "";
  const manifestParts = [];

  if (dataId) {
    manifestParts.push(`id:${String(dataId).toLowerCase()};`);
  }
  if (requestId) {
    manifestParts.push(`request-id:${requestId};`);
  }
  if (timestamp) {
    manifestParts.push(`ts:${timestamp};`);
  }

  const manifest = manifestParts.join("");
  const expectedHash = crypto.createHmac("sha256", config.mercadoPagoWebhookSecret).update(manifest).digest("hex");

  return {
    valid: safeCompareHex(expectedHash, incomingHash),
    skipped: false,
    reason: manifest,
    expectedHash,
    incomingHash
  };
}

function findOrderById(orderId) {
  const orders = readOrders();
  return orders.find((order) => order.orderId === orderId) || null;
}

function updateOrderFromPayment(payment, notificationMeta) {
  const orders = readOrders();
  const externalReference = String(payment.external_reference || "").trim();
  let order = orders.find((entry) => entry.orderId === externalReference);

  if (!order) {
    order = {
      orderId: externalReference || `MP-${payment.id}`,
      status: "payment_notified",
      subtotalAmount: Number(payment.transaction_details?.total_paid_amount || payment.transaction_amount || 0),
      shippingAmount: 0,
      totalAmount: Number(payment.transaction_details?.total_paid_amount || payment.transaction_amount || 0),
      shippingMethod: "desconocido",
      customer: {
        fullName: "",
        email: payment.payer?.email || ""
      },
      items: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      events: []
    };
    orders.push(order);
  }

  order.paymentId = String(payment.id || "");
  order.paymentStatus = String(payment.status || "unknown");
  order.paymentStatusDetail = String(payment.status_detail || "");
  order.status = payment.status === "approved" ? "paid" : payment.status || "payment_notified";
  order.merchantOrderId = payment.order?.id ? String(payment.order.id) : order.merchantOrderId || null;
  order.totalAmount = Number(payment.transaction_details?.total_paid_amount || payment.transaction_amount || order.totalAmount || 0);
  order.updatedAt = new Date().toISOString();
  order.lastNotification = {
    resourceId: notificationMeta.resourceId,
    topic: notificationMeta.topic,
    signatureValid: notificationMeta.signatureValid,
    signatureSkipped: notificationMeta.signatureSkipped,
    requestId: notificationMeta.requestId || null,
    receivedAt: new Date().toISOString()
  };

  appendOrderEvent(order, {
    type: "payment_updated",
    paymentId: order.paymentId,
    paymentStatus: order.paymentStatus,
    topic: notificationMeta.topic,
    signatureValid: notificationMeta.signatureValid,
    signatureSkipped: notificationMeta.signatureSkipped
  });

  writeOrders(orders);
  return order;
}

async function handleWebhook(request, response) {
  let body = {};

  try {
    body = await readJsonBody(request);
  } catch (error) {
    sendJson(response, 400, { error: "Webhook con body invalido." });
    return;
  }

  const requestUrlObject = new URL(request.url, "http://localhost");
  const resourceId = requestUrlObject.searchParams.get("data.id")
    || requestUrlObject.searchParams.get("id")
    || body?.data?.id
    || body?.id
    || "";
  const topic = requestUrlObject.searchParams.get("type")
    || requestUrlObject.searchParams.get("topic")
    || body?.type
    || body?.topic
    || "unknown";
  const signature = validateWebhookSignature(request.url, request.headers, resourceId);

  if (!signature.valid && !signature.skipped) {
    sendJson(response, 401, {
      error: "Firma invalida en webhook de Mercado Pago."
    });
    return;
  }

  if (!resourceId) {
    sendJson(response, 200, {
      received: true,
      ignored: true,
      reason: "No se encontro data.id en la notificacion."
    });
    return;
  }

  try {
    if (!String(topic).includes("payment")) {
      sendJson(response, 200, {
        received: true,
        ignored: true,
        reason: `Topico no procesado: ${topic}`
      });
      return;
    }

    const payment = await mercadoPagoRequest(`/v1/payments/${resourceId}`);
    const order = updateOrderFromPayment(payment, {
      resourceId: String(resourceId),
      topic: String(topic),
      signatureValid: signature.valid,
      signatureSkipped: signature.skipped,
      requestId: request.headers["x-request-id"] || null
    });

    sendJson(response, 200, {
      received: true,
      orderId: order.orderId,
      paymentStatus: order.paymentStatus,
      signatureChecked: !signature.skipped,
      signatureValid: signature.valid
    });
  } catch (error) {
    console.error("Error procesando webhook de Mercado Pago", error);
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : "No se pudo procesar la notificacion."
    });
  }
}

function handleGetOrder(response, orderId) {
  const order = findOrderById(orderId);

  if (!order) {
    sendJson(response, 404, { error: "Orden no encontrada." });
    return;
  }

  sendJson(response, 200, { order: sanitizeOrderForClient(order) });
}

function handleHealth(response) {
  sendJson(response, 200, {
    ok: true,
    now: new Date().toISOString(),
    env: {
      port: config.port,
      appBaseUrl: config.appBaseUrl || null,
      apiBaseUrl: config.apiBaseUrl || null,
      mercadoPagoEnvironment: config.mercadoPagoEnvironment,
      hasAccessToken: Boolean(config.mercadoPagoAccessToken),
      hasPublicKey: Boolean(config.mercadoPagoPublicKey),
      hasWebhookSecret: Boolean(config.mercadoPagoWebhookSecret)
    }
  });
}

async function handleRequest(request, response) {
  const requestUrl = new URL(request.url, `http://${request.headers.host || "localhost"}`);

  if (request.method === "OPTIONS") {
    response.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
    });
    response.end();
    return;
  }

  if (request.method === "GET" && requestUrl.pathname === "/api/health") {
    handleHealth(response);
    return;
  }

  if (request.method === "POST" && requestUrl.pathname === "/api/create-preference") {
    await handleCreatePreference(request, response);
    return;
  }

  if (request.method === "POST" && requestUrl.pathname === "/api/mercadopago/webhook") {
    await handleWebhook(request, response);
    return;
  }

  if (request.method === "GET" && requestUrl.pathname.startsWith("/api/orders/")) {
    const orderId = decodeURIComponent(requestUrl.pathname.replace("/api/orders/", ""));
    handleGetOrder(response, orderId);
    return;
  }

  if (request.method !== "GET") {
    sendText(response, 405, "Method not allowed");
    return;
  }

  serveStaticFile(response, requestUrl.pathname);
}

const server = http.createServer((request, response) => {
  handleRequest(request, response).catch((error) => {
    console.error("Unhandled server error", error);
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : "Error interno del servidor."
    });
  });
});

if (require.main === module) {
  server.listen(config.port, () => {
    console.log(`Pista Nera server escuchando en http://localhost:${config.port}`);
  });
}

module.exports = {
  server,
  config,
  readOrders,
  buildPreferencePayload,
  validateWebhookSignature
};



