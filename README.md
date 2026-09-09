# Lecturas de Tarde - Frontend Web Application

Aplicación web SPA (Single Page Application) desarrollada con **React** y **Vite**, diseñada con estética editorial cálida (*Warm Editorial Dark*) para la gestión omnicanal de consultas y atención a lectores a través de WhatsApp, Facebook Messenger e Instagram.

---

## 📖 Características Principales

* **Landing Page Editorial (`/`):**
  * Presentación premium de contenidos, lecturas recomendadas y atención personalizada.
  * Acceso directo al portal de operadores.
* **Bandeja de Entrada Omnicanal (`/inbox`):**
  * Vista de chats en tiempo real con filtrado por canal (WhatsApp, Instagram, Facebook).
  * Renderizado multimedia enriquecido: stickers transparentes, galería de imágenes con ampliación, reproductor integrado para notas de voz y documentos.
  * **Bloqueo Inteligente de Scroll:** Preserva la posición del usuario al leer mensajes antiguos sin saltos abruptos durante el refresco en vivo, con botón flotante `↓ Nuevos mensajes`.
  * Alternador de control de bot vs atención humana en 1 clic (*Handover Protocol*).
* **Panel de Configuración y Canales (`/settings`):**
  * **Escáner de Páginas de Facebook en 1 Clic (Meta Graph API v25.0):** Detección automática de Fan Pages y cuentas de Instagram vinculadas.
  * Formulario adaptativo de conexión manual por plataforma (Phone Number ID, Page ID, Instagram ID).
  * Personalización del mensaje del Bot de Bienvenida con variables dinámicas (`{{cliente}}`, `{{canal}}`).
  * Gestión de operadores y auditoría de eventos de Webhook.
* **Cumplimiento Legal y Políticas de Meta:**
  * Política de Privacidad (`/privacy`).
  * Términos del Servicio (`/terms`).
  * Instrucciones y Estado de Eliminación de Datos (`/data-deletion`).

---

## 🛠️ Stack Tecnológico

* **Framework:** React 19
* **Empaquetador y Dev Server:** Vite 6
* **Estilos:** Vanilla CSS moderno con diseño responsivo, glassmorphism y paleta dorada/azul noche
* **Iconografía y Tipografía:** Google Fonts (Cinzel, Outfit) y SVG optimizados
* **Conectividad:** Fetch API con credenciales `same-origin` y soporte para Socket.io

---

## 🚀 Instalación y Puesta en Marcha

### 1. Clonar el repositorio
```bash
git clone <URL_DEL_REPOSITORIO_FRONTEND>
cd <CARPETA_DEL_REPOSITORIO>
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Iniciar el servidor de desarrollo
```bash
npm run dev
```
La aplicación se abrirá en: `http://127.0.0.1:5173`.

> **Nota sobre el Proxy:** En modo desarrollo, `vite.config.js` redirige automáticamente las peticiones `/api`, `/health` y `/uploads` hacia el backend en `http://localhost:3000`.

### 4. Compilar para Producción
```bash
npm run build
```
Los archivos estáticos optimizados se generarán en la carpeta `dist/`.

---

## 🔒 Licencia y Autoría
Desarrollado para el sistema omnicanal de **Lecturas de Tarde** (lecturasdetarde.online). Todos los derechos reservados.
