const STORAGE_KEY = "carrito_plants_shop";

let NEGOCIO = {
  nombre: "",
  descripcion: "",
  whatsapp: "",
};

let PRODUCTOS = [];
let productosPorId = {};

const state = {
  cantidades: {},
  carrito: {},
  seccionActual: "catalogo",
};

const els = {
  nombreNegocio: document.getElementById("nombre-negocio"),
  descripcionNegocio: document.getElementById("descripcion-negocio"),
  footerNombre: document.getElementById("footer-nombre"),
  productList: document.getElementById("product-list"),
  cartContent: document.getElementById("cart-content"),
  fabCart: document.getElementById("fab-cart"),
  fabBadge: document.getElementById("fab-badge"),
  toast: document.getElementById("toast"),
  btnCatalogo: document.getElementById("btn-catalogo"),
  btnCarrito: document.getElementById("btn-carrito"),
  seccionCatalogo: document.getElementById("catalogo"),
  seccionCarrito: document.getElementById("carrito"),
};

async function init() {
  try {
    await cargarDatosCatalogo();
    configurarNegocio();
    inicializarCantidades();
    cargarCarrito();
    bindEvents();
    renderCatalogo();
    actualizarBadge(false);
    actualizarFab();
  } catch (error) {
    console.error("Error al iniciar la app:", error);
    mostrarErrorCarga();
  }
}

async function cargarDatosCatalogo() {
  const response = await fetch("data/productos.json", { cache: "no-store" });

  if (!response.ok) {
    throw new Error("No se pudo cargar data/productos.json");
  }

  const data = await response.json();
  validarDatosCatalogo(data);

  NEGOCIO = data.negocio;
  PRODUCTOS = data.productos;
  productosPorId = Object.fromEntries(PRODUCTOS.map((p) => [p.id, p]));
}

function validarDatosCatalogo(data) {
  if (!data || typeof data !== "object") {
    throw new Error("El archivo JSON no tiene un formato válido");
  }

  if (!data.negocio || typeof data.negocio !== "object") {
    throw new Error("Falta la sección 'negocio'");
  }

  if (!Array.isArray(data.productos)) {
    throw new Error("La sección 'productos' debe ser un arreglo");
  }

  for (const producto of data.productos) {
    if (!producto.id || typeof producto.id !== "string") {
      throw new Error("Un producto no tiene 'id' válido");
    }

    if (!producto.nombre || typeof producto.nombre !== "string") {
      throw new Error(`El producto '${producto.id}' no tiene nombre válido`);
    }

    if (!Number.isFinite(producto.precio) || producto.precio < 0) {
      throw new Error(`El producto '${producto.id}' tiene precio inválido`);
    }

    if (typeof producto.emoji !== "string") {
      throw new Error(`El producto '${producto.id}' no tiene emoji válido`);
    }

    if (typeof producto.imagen !== "string") {
      throw new Error(`El producto '${producto.id}' tiene imagen inválida`);
    }
  }
}

function mostrarErrorCarga() {
  els.productList.innerHTML = `
    <div class="cart-empty">
      <span class="cart-empty-icon">⚠️</span>
      <p>No se pudo cargar el catálogo.<br>Revisa el archivo <strong>data/productos.json</strong>.</p>
    </div>
  `;
}

function configurarNegocio() {
  els.nombreNegocio.textContent = NEGOCIO.nombre;
  els.descripcionNegocio.textContent = NEGOCIO.descripcion;
  els.footerNombre.textContent = NEGOCIO.nombre;
  document.title = NEGOCIO.nombre;
}

function inicializarCantidades() {
  state.cantidades = {};

  for (const producto of PRODUCTOS) {
    state.cantidades[producto.id] = 0;
  }
}

function bindEvents() {
  els.fabCart.addEventListener("click", irAlCarrito);
  els.btnCatalogo.addEventListener("click", () => showSection("catalogo"));
  els.btnCarrito.addEventListener("click", () => showSection("carrito"));
}

function fmt(valor) {
  return "$" + Number(valor).toLocaleString("es-CL");
}

function guardarCarrito() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.carrito));
}

function cargarCarrito() {
  const guardado = localStorage.getItem(STORAGE_KEY);
  if (!guardado) return;

  try {
    const parsed = JSON.parse(guardado);
    if (parsed && typeof parsed === "object") {
      state.carrito = sanitizarCarrito(parsed);
    }
  } catch {
    state.carrito = {};
  }
}

function sanitizarCarrito(carritoRaw) {
  const carritoSeguro = {};

  for (const [id, item] of Object.entries(carritoRaw)) {
    const producto = productosPorId[id];
    if (!producto) continue;

    const qty = Number(item?.qty);
    if (!Number.isInteger(qty) || qty <= 0 || qty > 999) continue;

    carritoSeguro[id] = {
      id: producto.id,
      nombre: producto.nombre,
      precio: producto.precio,
      emoji: producto.emoji,
      imagen: producto.imagen,
      qty,
    };
  }

  return carritoSeguro;
}

function actualizarFab() {
  if (state.seccionActual === "carrito") {
    els.fabCart.classList.add("hidden");
  } else {
    els.fabCart.classList.remove("hidden");
  }
}

function actualizarBadge(animar) {
  const total = Object.values(state.carrito).reduce((acc, item) => acc + item.qty, 0);
  els.fabBadge.textContent = String(total);

  if (animar) {
    els.fabBadge.classList.remove("pop");
    void els.fabBadge.offsetWidth;
    els.fabBadge.classList.add("pop");
  }
}

function mostrarToast(msg) {
  els.toast.textContent = msg;
  els.toast.classList.add("show");

  setTimeout(() => {
    els.toast.classList.remove("show");
  }, 2000);
}

function createImageOrPlaceholder(producto) {
  if (producto.imagen) {
    const img = document.createElement("img");
    img.className = "card-img";
    img.src = producto.imagen;
    img.alt = producto.nombre;
    img.loading = "lazy";
    return img;
  }

  const placeholder = document.createElement("div");
  placeholder.className = "card-img-placeholder";
  placeholder.textContent = producto.emoji;
  return placeholder;
}

function renderCatalogo() {
  els.productList.innerHTML = "";

  for (const producto of PRODUCTOS) {
    const card = document.createElement("article");
    card.className = "product-card";

    card.appendChild(createImageOrPlaceholder(producto));

    const body = document.createElement("div");
    body.className = "card-body";

    const name = document.createElement("div");
    name.className = "card-name";
    name.textContent = producto.nombre;

    const price = document.createElement("div");
    price.className = "card-price";
    price.textContent = `${fmt(producto.precio)} c/u`;

    const qtyRow = document.createElement("div");
    qtyRow.className = "qty-row";

    const minusBtn = document.createElement("button");
    minusBtn.className = "qty-btn";
    minusBtn.type = "button";
    minusBtn.textContent = "−";
    minusBtn.addEventListener("click", () => cambiarQty(producto.id, -1));

    const qtyNum = document.createElement("span");
    qtyNum.className = "qty-num";
    qtyNum.id = `qty-${producto.id}`;
    qtyNum.textContent = String(state.cantidades[producto.id]);

    const plusBtn = document.createElement("button");
    plusBtn.className = "qty-btn";
    plusBtn.type = "button";
    plusBtn.textContent = "+";
    plusBtn.addEventListener("click", () => cambiarQty(producto.id, 1));

    qtyRow.append(minusBtn, qtyNum, plusBtn);

    const addBtn = document.createElement("button");
    addBtn.className = "add-btn";
    addBtn.id = `add-${producto.id}`;
    addBtn.type = "button";
    addBtn.disabled = state.cantidades[producto.id] === 0;
    addBtn.textContent = state.cantidades[producto.id] === 0 ? "Elige cantidad" : "Agregar al carro";
    addBtn.addEventListener("click", () => agregarAlCarro(producto.id));

    body.append(name, price, qtyRow, addBtn);
    card.appendChild(body);
    els.productList.appendChild(card);
  }
}

function cambiarQty(productId, delta) {
  const actual = state.cantidades[productId] || 0;
  const nuevo = Math.max(0, actual + delta);
  state.cantidades[productId] = nuevo;

  const qtyEl = document.getElementById(`qty-${productId}`);
  const addBtn = document.getElementById(`add-${productId}`);

  if (qtyEl) qtyEl.textContent = String(nuevo);

  if (addBtn) {
    addBtn.disabled = nuevo === 0;
    addBtn.textContent = nuevo === 0 ? "Elige cantidad" : "Agregar al carro";
  }
}

function agregarAlCarro(productId) {
  const producto = productosPorId[productId];
  const qty = state.cantidades[productId];

  if (!producto || qty === 0) return;

  if (state.carrito[productId]) {
    state.carrito[productId].qty += qty;
  } else {
    state.carrito[productId] = {
      id: producto.id,
      nombre: producto.nombre,
      precio: producto.precio,
      emoji: producto.emoji,
      imagen: producto.imagen,
      qty,
    };
  }

  state.cantidades[productId] = 0;
  guardarCarrito();
  actualizarBadge(true);
  renderCatalogo();
  mostrarToast(`✓ ${producto.nombre} agregado`);
}

function quitarDelCarro(productId) {
  delete state.carrito[productId];
  guardarCarrito();
  actualizarBadge(false);
  renderCarrito();
}

function createCartThumb(item) {
  const thumb = document.createElement("div");
  thumb.className = "cart-thumb";

  if (item.imagen) {
    const img = document.createElement("img");
    img.src = item.imagen;
    img.alt = item.nombre;
    img.loading = "lazy";
    thumb.appendChild(img);
  } else {
    thumb.textContent = item.emoji;
  }

  return thumb;
}

function renderCarrito() {
  const items = Object.values(state.carrito);

  if (items.length === 0) {
    const empty = document.createElement("div");
    empty.className = "cart-empty";

    const icon = document.createElement("span");
    icon.className = "cart-empty-icon";
    icon.textContent = "🛒";

    const text = document.createElement("p");
    text.innerHTML = "Tu carrito está vacío.<br>Agrega plantas desde el catálogo.";

    empty.append(icon, text);
    els.cartContent.innerHTML = "";
    els.cartContent.appendChild(empty);
    return;
  }

  const total = items.reduce((acc, item) => acc + item.precio * item.qty, 0);

  const layout = document.createElement("div");
  layout.className = "cart-layout";

  const list = document.createElement("div");
  list.className = "cart-list";

  for (const item of items) {
    const subtotal = item.precio * item.qty;

    const cartItem = document.createElement("div");
    cartItem.className = "cart-item";

    const left = document.createElement("div");
    left.className = "cart-item-left";

    const metaWrap = document.createElement("div");
    metaWrap.style.minWidth = "0";

    const name = document.createElement("div");
    name.className = "cart-item-name";
    name.textContent = item.nombre;

    const sub = document.createElement("div");
    sub.className = "cart-item-sub";
    sub.textContent = `${item.qty} × ${fmt(item.precio)}`;

    metaWrap.append(name, sub);
    left.append(createCartThumb(item), metaWrap);

    const right = document.createElement("div");
    right.className = "cart-item-right";

    const totalEl = document.createElement("span");
    totalEl.className = "cart-item-total";
    totalEl.textContent = fmt(subtotal);

    const removeBtn = document.createElement("button");
    removeBtn.className = "remove-btn";
    removeBtn.type = "button";
    removeBtn.title = "Quitar";
    removeBtn.textContent = "×";
    removeBtn.addEventListener("click", () => quitarDelCarro(item.id));

    right.append(totalEl, removeBtn);
    cartItem.append(left, right);
    list.appendChild(cartItem);
  }

  const sidebar = document.createElement("div");
  sidebar.className = "cart-sidebar";

  const summary = document.createElement("div");
  summary.className = "cart-summary";

  const totalRow = document.createElement("div");
  totalRow.className = "cart-total-row";

  const totalLabel = document.createElement("span");
  totalLabel.className = "cart-total-label";
  totalLabel.textContent = "Total del pedido";

  const totalValue = document.createElement("span");
  totalValue.className = "cart-total-value";
  totalValue.textContent = fmt(total);

  totalRow.append(totalLabel, totalValue);
  summary.appendChild(totalRow);

  const waBtn = document.createElement("button");
  waBtn.className = "wa-btn";
  waBtn.type = "button";
  waBtn.innerHTML = `
    <svg class="wa-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
    Enviar pedido por WhatsApp
  `;
  waBtn.addEventListener("click", pedirPorWhatsApp);

  const hint = document.createElement("p");
  hint.className = "cart-hint";
  hint.textContent = "Se abrirá WhatsApp con el detalle completo de tu pedido.";

  sidebar.append(summary, waBtn, hint);
  layout.append(list, sidebar);

  els.cartContent.innerHTML = "";
  els.cartContent.appendChild(layout);
}

function pedirPorWhatsApp() {
  const items = Object.values(state.carrito);
  if (items.length === 0) return;

  const lineas = items.map((item) => {
    return `• ${item.qty}x ${item.nombre} — ${fmt(item.precio * item.qty)}`;
  });

  const total = items.reduce((acc, item) => acc + item.precio * item.qty, 0);

  const msg =
    "Hola! Quiero hacer el siguiente pedido:\n\n" +
    lineas.join("\n") +
    "\n\nTotal: " + fmt(total) +
    "\n\n¿Está disponible para despacho?";

  const url = `https://wa.me/${NEGOCIO.whatsapp}?text=${encodeURIComponent(msg)}`;
  window.open(url, "_blank");
}

function showSection(id) {
  els.seccionCatalogo.classList.remove("visible");
  els.seccionCarrito.classList.remove("visible");
  els.btnCatalogo.classList.remove("active");
  els.btnCarrito.classList.remove("active");

  if (id === "catalogo") {
    els.seccionCatalogo.classList.add("visible");
    els.btnCatalogo.classList.add("active");
  } else {
    els.seccionCarrito.classList.add("visible");
    els.btnCarrito.classList.add("active");
    renderCarrito();
  }

  state.seccionActual = id;
  actualizarFab();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function irAlCarrito() {
  showSection("carrito");
}

init();