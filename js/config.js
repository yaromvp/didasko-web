/* ============================================================
   DIDÁSKO LIBRERÍA — config.js
   Configuración global compartida por main.js y admin.js.
   ⚠️  ESTE ES EL ÚNICO LUGAR donde debes editar:
       - La URL de Apps Script
       - El número de WhatsApp
       - El correo de contacto
       - El nombre de la librería
   ============================================================ */

'use strict';

// ============================================================
// CONFIGURACIÓN GLOBAL — ⚠️ REEMPLAZA ESTOS VALORES
// ============================================================
const CONFIG = {
  // ⚠️ URL del Web App de Google Apps Script (después de publicar)
  // Ejemplo: 'https://script.google.com/macros/s/ABC.../exec'
  //APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbzBQipco_Wk0aZXkWV7KNmFo1lGiOb4S6DXsGDdKFXk0LOKG-aws0USbv-6uNvkE0Y3aA/exec',
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbz6FOCTmL5HkPqGawWERg2pVnY92zA3EtrpW0eM65-2aa14p_Lg93TwuTcQ-rhT7kh-Qw/exec',
  // ⚠️ Número de WhatsApp en formato internacional (sin +, sin espacios)
  // Ejemplo peruano: 51962970894
  WHATSAPP_NUMBER: '51962970894',

  // ⚠️ Correo electrónico de contacto de la librería
  EMAIL_CONTACTO: 'libreriadidasko@gmail.com',

  // Nombre de la librería (usado en mensajes de WhatsApp/Email)
  NOMBRE_LIBRERIA: 'Didásko Librería',

  // Activa datos de demo cuando APPS_SCRIPT_URL no está configurada
  USAR_DEMO: false,
};
