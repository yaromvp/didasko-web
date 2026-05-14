/* ============================================================
   DIDÁSKO LIBRERÍA — main.js
   Lógica del catálogo público:
   - Carga libros desde Google Apps Script
   - Filtros por categoría y búsqueda en tiempo real
   - Modal de detalle con botones WhatsApp y Email
   - Datos demo para cuando Apps Script no esté configurado
   ============================================================ */

'use strict';

// ============================================================
// CONFIGURACIÓN
// Los valores globales (APPS_SCRIPT_URL, WHATSAPP_NUMBER, etc.)
// se definen en js/config.js — edítalos ahí.
// ============================================================

// ============================================================
// DATOS DE DEMOSTRACIÓN
// Se usan cuando APPS_SCRIPT_URL no está configurada aún.
// Puedes borrar esto una vez conectes Google Sheets.
// ============================================================
const LIBROS_DEMO = [
  {
    id: '1', titulo: 'El nombre del viento', autor: 'Patrick Rothfuss',
    precio: '45.00', stock: '8', imagen_url: 'https://covers.openlibrary.org/b/id/8739161-L.jpg',
    descripcion: 'La fascinante historia de Kvothe, el legendario mago, contada por él mismo.',
    categoria: 'Fantasía', destacado: true
  },
  {
    id: '2', titulo: 'Cien años de soledad', autor: 'Gabriel García Márquez',
    precio: '38.00', stock: '3', imagen_url: 'https://covers.openlibrary.org/b/id/8228691-L.jpg',
    descripcion: 'La saga de la familia Buendía a lo largo de siete generaciones en el mítico pueblo de Macondo.',
    categoria: 'Literatura', destacado: false
  },
  {
    id: '3', titulo: 'Sapiens: De animales a dioses', autor: 'Yuval Noah Harari',
    precio: '52.00', stock: '0', imagen_url: 'https://covers.openlibrary.org/b/id/9255566-L.jpg',
    descripcion: 'Un recorrido provocador por la historia de la humanidad desde los primeros humanos hasta la era moderna.',
    categoria: 'Ensayo', destacado: true
  },
  {
    id: '4', titulo: '1984', autor: 'George Orwell',
    precio: '29.00', stock: '12', imagen_url: 'https://covers.openlibrary.org/b/id/8575708-L.jpg',
    descripcion: 'Una novela distópica que describe un mundo totalitario donde el Gran Hermano lo vigila todo.',
    categoria: 'Clásicos', destacado: false
  },
  {
    id: '5', titulo: 'El principito', autor: 'Antoine de Saint-Exupéry',
    precio: '22.00', stock: '15', imagen_url: 'https://covers.openlibrary.org/b/id/8356009-L.jpg',
    descripcion: 'Un clásico de la literatura universal que habla sobre la amistad, el amor y la pérdida de la infancia.',
    categoria: 'Clásicos', destacado: false
  },
  {
    id: '6', titulo: 'Atomic Habits', autor: 'James Clear',
    precio: '48.00', stock: '5', imagen_url: 'https://covers.openlibrary.org/b/id/12547893-L.jpg',
    descripcion: 'Una guía práctica y comprobada sobre cómo construir buenos hábitos y romper los malos.',
    categoria: 'Desarrollo Personal', destacado: true
  },
];

// ============================================================
// ESTADO DE LA APLICACIÓN
// ============================================================
let todosLosLibros = []; // Todos los libros cargados
let filtroCategoria = 'todos';
let filtroBusqueda = '';

// ============================================================
// INICIALIZACIÓN AL CARGAR LA PÁGINA
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  // Año del footer
  document.getElementById('year').textContent = new Date().getFullYear();

  // Enlaces del footer desde CONFIG (único lugar de edición)
  const footerWa = document.getElementById('footer-whatsapp');
  const footerEmail = document.getElementById('footer-email');
  if (footerWa) footerWa.href = `https://wa.me/${CONFIG.WHATSAPP_NUMBER}`;
  if (footerEmail) footerEmail.href = `mailto:${CONFIG.EMAIL_CONTACTO}`;

  // Efecto de navbar al hacer scroll
  initNavbarScroll();

  // Búsqueda (desktop y mobile)
  initSearch();

  // Modal cerrar
  document.getElementById('modal-close').addEventListener('click', cerrarModal);
  document.getElementById('book-modal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('book-modal')) cerrarModal();
  });

  // Cerrar modal con Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') cerrarModal();
  });

  // Toggle búsqueda mobile
  document.getElementById('btn-search-mobile').addEventListener('click', () => {
    const bar = document.getElementById('mobile-search-bar');
    bar.classList.toggle('hidden');
    if (!bar.classList.contains('hidden')) {
      document.getElementById('search-mobile').focus();
    }
  });

  // Cargar libros
  cargarLibros();
});

// ============================================================
// NAVBAR — efecto glass al hacer scroll
// ============================================================
function initNavbarScroll() {
  const navbar = document.getElementById('navbar');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 60) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  }, { passive: true });
}

// ============================================================
// BÚSQUEDA — sincroniza desktop y mobile
// ============================================================
function initSearch() {
  const desktopInput = document.getElementById('search-desktop');
  const mobileInput = document.getElementById('search-mobile');

  const onSearch = (e) => {
    filtroBusqueda = e.target.value.trim().toLowerCase();
    // Sincroniza los dos campos
    desktopInput.value = filtroBusqueda;
    mobileInput.value = filtroBusqueda;
    renderLibros();
  };

  desktopInput.addEventListener('input', onSearch);
  mobileInput.addEventListener('input', onSearch);
}

// ============================================================
// CARGA DE LIBROS — desde Apps Script o datos demo
// ============================================================
async function cargarLibros() {
  mostrarSkeletons();

  // Si la URL no está configurada, usar datos demo
  if (!CONFIG.APPS_SCRIPT_URL || CONFIG.APPS_SCRIPT_URL === 'TU_APPS_SCRIPT_URL') {
    if (CONFIG.USAR_DEMO) {
      console.warn('[Didásko] Usando datos demo. Configura APPS_SCRIPT_URL en main.js');
      setTimeout(() => {
        todosLosLibros = LIBROS_DEMO;
        ocultarSkeletons();
        construirFiltros();
        renderLibros();
      }, 800); // Simular tiempo de carga
    }
    return;
  }

  try {
    const url = `${CONFIG.APPS_SCRIPT_URL}?action=getBooks`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.success && Array.isArray(data.books)) {
      todosLosLibros = data.books;
    } else {
      throw new Error(data.error || 'Respuesta inválida');
    }
  } catch (err) {
    console.error('[Didásko] Error al cargar libros:', err);
    mostrarToast('No se pudo cargar el catálogo. Usando datos de ejemplo.', 'error');
    todosLosLibros = LIBROS_DEMO; // Fallback a demo
  }

  ocultarSkeletons();
  construirFiltros();
  renderLibros();
}

// ============================================================
// SKELETONS DE CARGA — placeholders animados
// ============================================================
function mostrarSkeletons() {
  const container = document.getElementById('loading-state');
  container.innerHTML = Array(6).fill(0).map(() => `
    <div class="book-card overflow-hidden">
      <div class="skeleton" style="aspect-ratio:2/3; width:100%;"></div>
      <div class="p-4 space-y-2">
        <div class="skeleton h-4 w-3/4 rounded"></div>
        <div class="skeleton h-3 w-1/2 rounded"></div>
        <div class="skeleton h-4 w-1/3 rounded mt-2"></div>
      </div>
    </div>
  `).join('');
  container.style.display = 'grid';
}

function ocultarSkeletons() {
  const container = document.getElementById('loading-state');
  container.style.display = 'none';
  container.innerHTML = '';
}

// ============================================================
// CONSTRUIR PILLS DE CATEGORÍA dinámicamente
// ============================================================
function construirFiltros() {
  // Obtener todas las categorías, separando por comas y limpiando espacios
  const todasLasCategorias = todosLosLibros.reduce((acc, libro) => {
    if (libro.categoria) {
      const cats = libro.categoria.split(',').map(c => c.trim()).filter(Boolean);
      return acc.concat(cats);
    }
    return acc;
  }, []);

  const categoriasUnicas = [...new Set(todasLasCategorias)].sort();
  const bar = document.getElementById('filter-bar');

  // Mantener el botón "Todos" y agregar el resto
  bar.innerHTML = `<button class="filter-pill active" data-category="todos">Todos</button>`;

  categoriasUnicas.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'filter-pill';
    btn.dataset.category = cat;
    btn.textContent = cat;
    bar.appendChild(btn);
  });

  // Evento de clic en filtros
  bar.addEventListener('click', (e) => {
    const pill = e.target.closest('.filter-pill');
    if (!pill) return;

    // Marcar el activo
    bar.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');

    filtroCategoria = pill.dataset.category;
    renderLibros();
  });
}

// ============================================================
// RENDERIZAR GRID DE LIBROS con filtros aplicados
// ============================================================
function renderLibros() {
  const grid = document.getElementById('books-grid');
  const emptyState = document.getElementById('empty-state');

  // Aplicar filtros
  let librosFiltrados = todosLosLibros;

  if (filtroCategoria !== 'todos') {
    librosFiltrados = librosFiltrados.filter(l => {
      if (!l.categoria) return false;
      const cats = l.categoria.split(',').map(c => c.trim());
      return cats.includes(filtroCategoria);
    });
  }

  if (filtroBusqueda) {
    librosFiltrados = librosFiltrados.filter(l =>
      l.titulo?.toLowerCase().includes(filtroBusqueda) ||
      l.autor?.toLowerCase().includes(filtroBusqueda)
    );
  }

  // Sin resultados
  if (librosFiltrados.length === 0) {
    grid.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');

  // Renderizar tarjetas
  grid.innerHTML = librosFiltrados.map((libro, i) => crearTarjetaHTML(libro, i)).join('');

  // Agregar eventos de clic a cada tarjeta
  grid.querySelectorAll('.book-card[data-id]').forEach(card => {
    card.addEventListener('click', () => {
      const libro = todosLosLibros.find(l => l.id === card.dataset.id);
      if (libro) abrirModal(libro);
    });
  });
}

// ============================================================
// HTML DE UNA TARJETA DE LIBRO
// ============================================================
function crearTarjetaHTML(libro, index) {
  const stockNum = parseInt(libro.stock) || 0;
  /*const stockBadge = stockNum === 0
    ? `<span class="stock-badge stock-none">Agotado</span>`
    : `<span class="stock-badge stock-ok">Disponible</span>`;*/

  const featuredBadge = (libro.destacado === true || libro.destacado === 'TRUE')
    ? `<div class="featured-badge">⭐ Destacado</div>`
    : '';

  const precio = libro.precio ? `$${parseFloat(libro.precio).toFixed(2)}` : '';

  const delayClass = `card-delay-${(index % 4) + 1}`;

  return `
    <article class="book-card animate-slide-up ${delayClass}" data-id="${libro.id}"
      role="button" tabindex="0" aria-label="Ver detalles de ${libro.titulo}"
      onkeydown="if(event.key==='Enter'||event.key===' ') this.click()">
      <div class="book-img-wrapper relative">
        ${featuredBadge}
        <img
          src="${libro.imagen_url || ''}"
          alt="Portada de ${libro.titulo}"
          loading="lazy"
          onerror="this.parentElement.innerHTML='<div class=\\'img-fallback\\'><i class=\\'fas fa-book\\'></i></div>'"
        />
      </div>
      <div class="p-4">
        <span class="text-teal text-xs font-semibold tracking-wider uppercase opacity-80">
          ${libro.categoria ? libro.categoria.split(',').map(c => c.trim()).join(' • ') : ''}
        </span>
        <h3 class="font-serif text-base font-semibold text-cream mt-1 leading-snug line-clamp-2">
          ${libro.titulo}
        </h3>
        <p class="text-cream/50 text-xs mt-0.5 truncate">${libro.autor}</p>
        <div class="flex items-center justify-between mt-3">
          <span class="font-serif text-lg font-bold text-gold">${precio}</span>
          ${/*stockBadge*/''}
        </div>
      </div>
    </article>
  `;
}

// ============================================================
// MODAL DE DETALLE
// ============================================================
function abrirModal(libro) {
  const stockNum = parseInt(libro.stock) || 0;
  let stockHTML, stockClass;

  if (stockNum === 0) {
    stockHTML = 'Agotado (Bajo pedido)';
    stockClass = 'stock-none';
  } else {
    stockHTML = 'Disponible';
    stockClass = 'stock-ok';
  }

  // Llenar datos del modal
  document.getElementById('modal-img').src = libro.imagen_url || '';
  document.getElementById('modal-img').alt = `Portada de ${libro.titulo}`;
  document.getElementById('modal-img').onerror = function () {
    this.parentElement.innerHTML = '<div class="img-fallback"><i class="fas fa-book"></i></div>';
  };
  document.getElementById('modal-category').textContent = libro.categoria ? libro.categoria.split(',').map(c => c.trim()).join(' • ') : '';
  document.getElementById('modal-title').textContent = libro.titulo || '';
  document.getElementById('modal-author').textContent = `por ${libro.autor || ''}`;
  document.getElementById('modal-desc').textContent = libro.descripcion || 'Sin descripción disponible.';
  document.getElementById('modal-price').textContent = libro.precio ? `$${parseFloat(libro.precio).toFixed(2)}` : '';

  /*const stockEl = document.getElementById('modal-stock');
  stockEl.className = `stock-badge ${stockClass}`;
  stockEl.textContent = stockHTML;*/

  // Generar link de WhatsApp
  const msgStock = stockNum === 0 ? 'Sé que no está disponible, pero me gustaría saber si pueden encargarlo.' : '¿Podrían confirmarme disponibilidad?';
  const mensajeWA = encodeURIComponent(
    `¡Hola! Estoy interesado/a en el libro *"${libro.titulo}"* de ${libro.autor}. ${msgStock} Gracias.`
  );
  document.getElementById('btn-whatsapp').href =
    `https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=${mensajeWA}`;

  // Generar link de Email
  const asuntoEmail = encodeURIComponent(`Consulta sobre: ${libro.titulo}`);
  const cuerpoEmail = encodeURIComponent(
    `Hola, ${CONFIG.NOMBRE_LIBRERIA}.\n\n` +
    `Me gustaría consultar sobre el libro "${libro.titulo}" de ${libro.autor}.\n` +
    `Precio: $${libro.precio}\n\n` +
    `${stockNum === 0 ? 'Me gustaría saber si es posible encargarlo.' : 'Por favor, indíquenme disponibilidad y forma de pago.'}\n\nGracias.`
  );
  document.getElementById('btn-email').href =
    `mailto:${CONFIG.EMAIL_CONTACTO}?subject=${asuntoEmail}&body=${cuerpoEmail}`;

  // Botones siempre activos para permitir pedidos
  const actions = document.getElementById('modal-actions');
  actions.style.opacity = '1';
  actions.style.pointerEvents = 'auto';

  // Mostrar modal
  document.getElementById('book-modal').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function cerrarModal() {
  document.getElementById('book-modal').classList.remove('open');
  document.body.style.overflow = '';
}

// ============================================================
// RESET DE FILTROS
// ============================================================
function resetFilters() {
  filtroCategoria = 'todos';
  filtroBusqueda = '';
  document.getElementById('search-desktop').value = '';
  document.getElementById('search-mobile').value = '';
  document.querySelectorAll('.filter-pill').forEach((p, i) => {
    p.classList.toggle('active', i === 0);
  });
  renderLibros();
}

// ============================================================
// TOAST — notificaciones breves en pantalla
// ============================================================
function mostrarToast(mensaje, tipo = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  const icon = tipo === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle';
  const color = tipo === 'success' ? 'text-teal' : 'text-red-400';

  toast.className = `toast ${tipo}`;
  toast.innerHTML = `<i class="fas ${icon} ${color}"></i><span>${mensaje}</span>`;

  container.appendChild(toast);

  // Auto-remover después de 3 segundos
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
