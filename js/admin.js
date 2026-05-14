/* ============================================================
   DIDÁSKO LIBRERÍA — admin.js
   Lógica del panel de administración:
   - Login con validación contra Apps Script
   - Token de sesión en sessionStorage
   - CRUD completo de libros (agregar, editar, eliminar)
   - Tabla con estadísticas y búsqueda
   ============================================================ */

'use strict';

// ============================================================
// CONFIGURACIÓN
// Los valores globales (APPS_SCRIPT_URL, etc.) se definen en
// js/config.js — edítalos ahí (se carga antes en el HTML).
// ============================================================

// Clave del token en sessionStorage
const TOKEN_KEY = 'didasko_admin_token';

// ============================================================
// ESTADO DEL PANEL
// ============================================================
let librosAdmin = [];
let modoEdicion = false;
let idLibroAEliminar = null;

// ============================================================
// INICIALIZACIÓN
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  // Si ya hay token guardado, saltar al panel directamente
  const tokenGuardado = sessionStorage.getItem(TOKEN_KEY);
  if (tokenGuardado) {
    mostrarPanel();
    cargarLibrosAdmin();
  }

  // Formulario de login
  document.getElementById('login-form').addEventListener('submit', handleLogin);

  // Toggle visibilidad de contraseña
  document.getElementById('toggle-password').addEventListener('click', () => {
    const input = document.getElementById('login-password');
    const icon  = document.querySelector('#toggle-password i');
    if (input.type === 'password') {
      input.type = 'text';
      icon.className = 'fas fa-eye-slash text-sm';
    } else {
      input.type = 'password';
      icon.className = 'fas fa-eye text-sm';
    }
  });

  // Logout
  document.getElementById('btn-logout').addEventListener('click', logout);

  // Botón "Nuevo Libro"
  document.getElementById('btn-add-book').addEventListener('click', abrirModalNuevo);

  // Cerrar modales
  document.getElementById('form-modal-close').addEventListener('click', cerrarModalForm);
  document.getElementById('form-cancel-btn').addEventListener('click', cerrarModalForm);
  document.getElementById('delete-cancel-btn').addEventListener('click', cerrarModalDelete);

  // Cerrar al hacer clic fuera
  document.getElementById('book-form-modal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('book-form-modal')) cerrarModalForm();
  });
  document.getElementById('delete-modal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('delete-modal')) cerrarModalDelete();
  });

  // Cerrar con Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { cerrarModalForm(); cerrarModalDelete(); }
  });

  // Formulario guardar libro
  document.getElementById('book-form').addEventListener('submit', guardarLibro);

  // Confirmar eliminación
  document.getElementById('delete-confirm-btn').addEventListener('click', confirmarEliminacion);

  // Búsqueda en tabla admin
  document.getElementById('admin-search').addEventListener('input', (e) => {
    const query = e.target.value.trim().toLowerCase();
    filtrarTablaAdmin(query);
  });
});

// ============================================================
// LOGIN — valida contra Apps Script
// ============================================================
async function handleLogin(e) {
  e.preventDefault();
  const btn = document.getElementById('login-btn');
  const errorEl = document.getElementById('login-error');
  const password = document.getElementById('login-password').value;

  errorEl.classList.add('hidden');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin text-xs"></i> Verificando...';

  // Si la URL de Apps Script no está configurada, usar contraseña demo
  if (!CONFIG.APPS_SCRIPT_URL || CONFIG.APPS_SCRIPT_URL === 'TU_APPS_SCRIPT_URL') {
    console.warn('[Didásko] Apps Script no configurado. Usando login demo (contraseña: admin123)');
    if (password === 'admin123') {
      sessionStorage.setItem(TOKEN_KEY, 'demo-token-' + Date.now());
      mostrarPanel();
      cargarLibrosAdmin();
    } else {
      mostrarErrorLogin();
    }
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-lock-open text-xs"></i> Ingresar al Panel';
    return;
  }

  try {
    const response = await fetch(CONFIG.APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'login', password }),
    });
    const data = await response.json();

    if (data.success && data.token) {
      sessionStorage.setItem(TOKEN_KEY, data.token);
      mostrarPanel();
      cargarLibrosAdmin();
    } else {
      mostrarErrorLogin();
    }
  } catch (err) {
    console.error('[Didásko] Error en login:', err);
    mostrarErrorLogin('Error de conexión. Verifica tu internet.');
  }

  btn.disabled = false;
  btn.innerHTML = '<i class="fas fa-lock-open text-xs"></i> Ingresar al Panel';
}

function mostrarErrorLogin(msg = '') {
  const errorEl = document.getElementById('login-error');
  if (msg) errorEl.querySelector('span').textContent = msg;
  errorEl.classList.remove('hidden');
  document.getElementById('login-password').focus();
}

// ============================================================
// MOSTRAR / OCULTAR PANTALLAS
// ============================================================
function mostrarPanel() {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('admin-panel').classList.remove('hidden');
  document.getElementById('admin-panel').classList.add('flex');
}

function mostrarLogin() {
  document.getElementById('admin-panel').classList.add('hidden');
  document.getElementById('admin-panel').classList.remove('flex');
  document.getElementById('login-screen').classList.remove('hidden');
}

function logout() {
  sessionStorage.removeItem(TOKEN_KEY);
  librosAdmin = [];
  document.getElementById('login-password').value = '';
  document.getElementById('login-error').classList.add('hidden');
  mostrarLogin();
}

// ============================================================
// CARGAR LIBROS en el panel admin
// ============================================================
async function cargarLibrosAdmin() {
  // Demo mode
  if (!CONFIG.APPS_SCRIPT_URL || CONFIG.APPS_SCRIPT_URL === 'TU_APPS_SCRIPT_URL') {
    librosAdmin = [
      { id: '1', titulo: 'El nombre del viento', autor: 'Patrick Rothfuss', precio: '45.00', stock: '8', imagen_url: '', descripcion: '', categoria: 'Fantasía', destacado: true },
      { id: '2', titulo: 'Cien años de soledad', autor: 'Gabriel García Márquez', precio: '38.00', stock: '3', imagen_url: '', descripcion: '', categoria: 'Literatura', destacado: false },
      { id: '3', titulo: 'Sapiens', autor: 'Yuval Noah Harari', precio: '52.00', stock: '0', imagen_url: '', descripcion: '', categoria: 'Ensayo', destacado: true },
    ];
    actualizarEstadisticas();
    renderTablaAdmin(librosAdmin);
    return;
  }

  try {
    const url = `${CONFIG.APPS_SCRIPT_URL}?action=getBooks`;
    const res  = await fetch(url);
    const data = await res.json();

    if (data.success && Array.isArray(data.books)) {
      librosAdmin = data.books;
      actualizarEstadisticas();
      renderTablaAdmin(librosAdmin);
    } else {
      throw new Error(data.error);
    }
  } catch (err) {
    console.error('[Didásko] Error al cargar libros admin:', err);
    mostrarToastAdmin('Error al cargar los libros.', 'error');
  }
}

// ============================================================
// ESTADÍSTICAS
// ============================================================
function actualizarEstadisticas() {
  document.getElementById('stat-total').textContent = librosAdmin.length;
  document.getElementById('stat-featured').textContent =
    librosAdmin.filter(l => l.destacado === true || l.destacado === 'TRUE').length;
  document.getElementById('stat-no-stock').textContent =
    librosAdmin.filter(l => parseInt(l.stock) === 0).length;
  const todasLasCategorias = librosAdmin.reduce((acc, libro) => {
    if (libro.categoria) {
      const cats = libro.categoria.split(',').map(c => c.trim()).filter(Boolean);
      return acc.concat(cats);
    }
    return acc;
  }, []);
  document.getElementById('stat-cats').textContent = new Set(todasLasCategorias).size;
}

// ============================================================
// TABLA DE LIBROS ADMIN
// ============================================================
function renderTablaAdmin(libros) {
  const tbody = document.getElementById('admin-books-tbody');
  const emptyEl = document.getElementById('admin-empty');

  if (libros.length === 0) {
    tbody.innerHTML = '';
    emptyEl.classList.remove('hidden');
    return;
  }

  emptyEl.classList.add('hidden');

  tbody.innerHTML = libros.map(libro => {
    const stockNum = parseInt(libro.stock) || 0;
    const stockClass = stockNum === 0 ? 'stock-none' : stockNum <= 3 ? 'stock-low' : 'stock-ok';
    const destacadoIcon = (libro.destacado === true || libro.destacado === 'TRUE')
      ? '<i class="fas fa-star text-gold"></i>'
      : '<i class="fas fa-star text-cream/20"></i>';

    const imgSrc = libro.imagen_url
      ? `<img src="${libro.imagen_url}" alt="" class="w-10 h-14 object-cover rounded-lg bg-white/5" onerror="this.src=''">`
      : `<div class="w-10 h-14 rounded-lg bg-white/05 flex items-center justify-center"><i class="fas fa-book text-cream/20 text-xs"></i></div>`;

    return `
      <tr>
        <td>${imgSrc}</td>
        <td>
          <p class="font-medium text-cream text-sm">${libro.titulo}</p>
          <p class="text-cream/50 text-xs">${libro.autor}</p>
        </td>
        <td>
          <span class="text-teal text-xs font-medium">
            ${libro.categoria ? libro.categoria.split(',').map(c => c.trim()).join(' • ') : '—'}
          </span>
        </td>
        <td class="text-gold font-semibold font-serif">$${parseFloat(libro.precio || 0).toFixed(2)}</td>
        <td><span class="stock-badge ${stockClass}">${libro.stock}</span></td>
        <td class="text-center">${destacadoIcon}</td>
        <td>
          <div class="flex items-center justify-center gap-2">
            <button onclick='editarLibro("${libro.id}")'
              class="btn-ghost py-1.5 px-3 text-xs hover:text-teal"
              aria-label="Editar ${libro.titulo}">
              <i class="fas fa-edit mr-1"></i>Editar
            </button>
            <button onclick='confirmarEliminar("${libro.id}", "${libro.titulo.replace(/"/g,"'")}")'
              class="btn-ghost py-1.5 px-3 text-xs text-red-400/80 hover:text-red-400"
              aria-label="Eliminar ${libro.titulo}">
              <i class="fas fa-trash mr-1"></i>Eliminar
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function filtrarTablaAdmin(query) {
  const filtrados = query
    ? librosAdmin.filter(l =>
        l.titulo?.toLowerCase().includes(query) ||
        l.autor?.toLowerCase().includes(query) ||
        l.categoria?.toLowerCase().includes(query))
    : librosAdmin;
  renderTablaAdmin(filtrados);
}

// ============================================================
// MODAL AGREGAR / EDITAR
// ============================================================
function abrirModalNuevo() {
  modoEdicion = false;
  document.getElementById('form-modal-title').textContent = 'Nuevo Libro';
  document.getElementById('form-submit-label').textContent = 'Guardar Libro';
  document.getElementById('book-form').reset();
  document.getElementById('book-id').value = '';
  document.getElementById('form-error').classList.add('hidden');
  document.getElementById('book-form-modal').classList.add('open');
  document.body.style.overflow = 'hidden';
  document.getElementById('book-titulo').focus();
}

function editarLibro(id) {
  const libro = librosAdmin.find(l => l.id === id);
  if (!libro) return;

  modoEdicion = true;
  document.getElementById('form-modal-title').textContent = 'Editar Libro';
  document.getElementById('form-submit-label').textContent = 'Actualizar Libro';
  document.getElementById('form-error').classList.add('hidden');

  // Llenar formulario
  document.getElementById('book-id').value        = libro.id;
  document.getElementById('book-titulo').value    = libro.titulo || '';
  document.getElementById('book-autor').value     = libro.autor || '';
  document.getElementById('book-categoria').value = libro.categoria || '';
  document.getElementById('book-precio').value    = libro.precio || '';
  document.getElementById('book-stock').value     = libro.stock || '0';
  document.getElementById('book-imagen').value    = libro.imagen_url || '';
  document.getElementById('book-desc').value      = libro.descripcion || '';
  document.getElementById('book-destacado').checked =
    libro.destacado === true || libro.destacado === 'TRUE';

  document.getElementById('book-form-modal').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function cerrarModalForm() {
  document.getElementById('book-form-modal').classList.remove('open');
  document.body.style.overflow = '';
}

// ============================================================
// GUARDAR LIBRO (add o update)
// ============================================================
async function guardarLibro(e) {
  e.preventDefault();

  const titulo    = document.getElementById('book-titulo').value.trim();
  const autor     = document.getElementById('book-autor').value.trim();
  const categoria = document.getElementById('book-categoria').value.trim();
  const precio    = document.getElementById('book-precio').value.trim();
  const stock     = document.getElementById('book-stock').value.trim();

  // Validación básica
  if (!titulo || !autor || !categoria || !precio || !stock) {
    document.getElementById('form-error-msg').textContent = 'Completa todos los campos requeridos (*).';
    document.getElementById('form-error').classList.remove('hidden');
    return;
  }

  const libro = {
    id:          document.getElementById('book-id').value || null,
    titulo,
    autor,
    categoria,
    precio:      parseFloat(precio).toFixed(2),
    stock:       parseInt(stock),
    imagen_url:  document.getElementById('book-imagen').value.trim(),
    descripcion: document.getElementById('book-desc').value.trim(),
    destacado:   document.getElementById('book-destacado').checked,
  };

  const submitBtn = document.getElementById('form-submit-btn');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin text-xs"></i> Guardando...';

  const accion = modoEdicion ? 'updateBook' : 'addBook';

  // Demo mode
  if (!CONFIG.APPS_SCRIPT_URL || CONFIG.APPS_SCRIPT_URL === 'TU_APPS_SCRIPT_URL') {
    await simularDelay(600);
    if (modoEdicion) {
      const idx = librosAdmin.findIndex(l => l.id === libro.id);
      if (idx !== -1) librosAdmin[idx] = libro;
    } else {
      libro.id = 'demo-' + Date.now();
      librosAdmin.push(libro);
    }
    finalizarGuardado(true, modoEdicion);
    submitBtn.disabled = false;
    submitBtn.innerHTML = `<i class="fas fa-save text-xs"></i> <span id="form-submit-label">${modoEdicion ? 'Actualizar Libro' : 'Guardar Libro'}</span>`;
    return;
  }

  try {
    const token = sessionStorage.getItem(TOKEN_KEY);
    const res = await fetch(CONFIG.APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: accion, book: libro, token }),
    });
    const data = await res.json();

    if (data.success) {
      finalizarGuardado(true, modoEdicion);
      await cargarLibrosAdmin(); // Recargar tabla
    } else if (data.error === 'No autorizado') {
      logout();
    } else {
      throw new Error(data.error);
    }
  } catch (err) {
    console.error('[Didásko] Error al guardar:', err);
    mostrarToastAdmin('Error al guardar el libro.', 'error');
  }

  submitBtn.disabled = false;
  submitBtn.innerHTML = `<i class="fas fa-save text-xs"></i> <span>${modoEdicion ? 'Actualizar Libro' : 'Guardar Libro'}</span>`;
}

function finalizarGuardado(exito, fueEdicion) {
  if (exito) {
    cerrarModalForm();
    actualizarEstadisticas();
    renderTablaAdmin(librosAdmin);
    mostrarToastAdmin(
      fueEdicion ? 'Libro actualizado exitosamente.' : 'Libro agregado exitosamente.',
      'success'
    );
  }
}

// ============================================================
// ELIMINAR LIBRO
// ============================================================
function confirmarEliminar(id, nombre) {
  idLibroAEliminar = id;
  document.getElementById('delete-book-name').textContent = `"${nombre}"`;
  document.getElementById('delete-modal').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function cerrarModalDelete() {
  idLibroAEliminar = null;
  document.getElementById('delete-modal').classList.remove('open');
  document.body.style.overflow = '';
}

async function confirmarEliminacion() {
  if (!idLibroAEliminar) return;

  const btn = document.getElementById('delete-confirm-btn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin text-xs mr-1"></i> Eliminando...';

  // Demo mode
  if (!CONFIG.APPS_SCRIPT_URL || CONFIG.APPS_SCRIPT_URL === 'TU_APPS_SCRIPT_URL') {
    await simularDelay(500);
    librosAdmin = librosAdmin.filter(l => l.id !== idLibroAEliminar);
    cerrarModalDelete();
    actualizarEstadisticas();
    renderTablaAdmin(librosAdmin);
    mostrarToastAdmin('Libro eliminado.', 'success');
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-trash text-xs mr-1"></i> Sí, eliminar';
    return;
  }

  try {
    const token = sessionStorage.getItem(TOKEN_KEY);
    const res = await fetch(CONFIG.APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'deleteBook', id: idLibroAEliminar, token }),
    });
    const data = await res.json();

    if (data.success) {
      cerrarModalDelete();
      mostrarToastAdmin('Libro eliminado exitosamente.', 'success');
      await cargarLibrosAdmin();
    } else if (data.error === 'No autorizado') {
      logout();
    } else {
      throw new Error(data.error);
    }
  } catch (err) {
    console.error('[Didásko] Error al eliminar:', err);
    mostrarToastAdmin('Error al eliminar el libro.', 'error');
  }

  btn.disabled = false;
  btn.innerHTML = '<i class="fas fa-trash text-xs mr-1"></i> Sí, eliminar';
}

// ============================================================
// TOAST — notificaciones del admin
// ============================================================
function mostrarToastAdmin(mensaje, tipo = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  const icon = tipo === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle';
  const color = tipo === 'success' ? 'text-teal' : 'text-red-400';

  toast.className = `toast ${tipo}`;
  toast.innerHTML = `<i class="fas ${icon} ${color}"></i><span>${mensaje}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Utilidad: simular delay para modo demo
function simularDelay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
