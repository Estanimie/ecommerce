(function initProducts(globalScope, factory) {
  const products = factory();

  if (typeof module !== "undefined" && module.exports) {
    module.exports = products;
  }

  globalScope.PISTA_NERA_PRODUCTS = products;
})(typeof globalThis !== "undefined" ? globalThis : window, () => [
  {
    id: "llanta-veloce-r19",
    name: "Llanta Veloce R19 Graphite",
    category: "Llantas",
    price: 245000,
    description: "Llanta premium en terminacion graphite satin con aro 19 y entrega inmediata.",
    status: "available",
    label: "Entrega inmediata",
    artClass: "product-art--photo",
    visualTitle: "R19",
    visualMeta: "Graphite satin",
    image: "rim-main.jpg",
    detailTarget: "product.html"
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
]);
