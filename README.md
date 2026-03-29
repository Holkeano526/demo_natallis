# 🧵 Sistema de Registro - Sastrería Natalli's

Aplicación web modular orientada a la gestión de boletas, ingresos y control de caja para Sastrería Natalli's. 

Este proyecto utiliza una arquitectura **Serverless** alojada en [Vercel](https://vercel.com), actuando como Frontend e intermediario (Proxy), y utiliza **Google Sheets** (vía Google Apps Script) como base de datos (Backend).

---

## 🏗️ Arquitectura del Sistema

El sistema fue diseñado separando responsabilidades para garantizar seguridad, escalabilidad y evadir bloqueos de navegadores (CORS).

1. **Frontend (Cliente):** HTML, CSS y JS puros. Se ejecuta en el navegador del usuario.
2. **Middleware (Vercel Serverless Function):** Una API propia que protege las credenciales y redirige las peticiones de forma segura.
3. **Backend/DB (Google Apps Script):** Recibe las órdenes estructuradas y escribe/lee directamente en la hoja de cálculo de Google.

---

## 📂 Estructura de Directorios y Archivos

### `/index.html`
Es el cascarón visual de la aplicación. 
* **¿Por qué está aquí?** Es el punto de entrada estándar que busca Vercel al desplegar una web.
* **¿Qué hace?** Contiene la estructura DOM (el menú, la tabla, el formulario y el modal de login). No contiene estilos ni lógica pesada, solo enlaza los archivos `/css/style.css` y `/js/app.js`.

### `/css/style.css`
La hoja de estilos global.
* **¿Por qué está separada?** Para mantener el HTML limpio y modularizar el diseño.
* **¿Qué contiene?** Variables de colores (`--primary`, `--dark-bg`), diseño responsive (Mobile First), estilos de la librería SweetAlert2 adaptados, y las animaciones abstractas avanzadas (Mesh Gradient y Glassmorphism) de la pantalla de Login.

### `/js/app.js`
El cerebro del lado del cliente.
* **¿Por qué está separado?** Aislar la lógica de negocio del diseño visual permite depurar errores más rápido.
* **¿Qué hace?** * Maneja el estado de la sesión usando `sessionStorage` (para que el usuario no tenga que loguearse si recarga la página por accidente).
  * Controla la paginación y el ordenamiento de la tabla.
  * Formatea la fecha y hora proveniente de Google.
  * Captura los eventos de los botones (Guardar, Entregar, Editar) y ejecuta la función `fetch()` enviando el payload a nuestra ruta segura `/api/google`.

### `/api/google.js`
La barrera de seguridad (Serverless Function de Vercel).
* **¿Por qué está aquí?** Si el Frontend hablara directamente con Google, la URL secreta de Apps Script quedaría expuesta en el navegador, y saltarían alertas de seguridad **CORS**.
* **¿Qué hace?** Actúa como un servidor "Proxy". 
  1. Recibe la petición del frontend (incluyendo la contraseña ingresada).
  2. Compara la contraseña contra la variable de entorno `APP_PASSWORD` oculta en Vercel.
  3. Si es correcta, este archivo hace la petición "Servidor a Servidor" hacia Google Apps Script (ignorando CORS).
  4. Devuelve los datos limpios al frontend.

---

## 🔐 Seguridad y Variables de Entorno

El sistema no expone contraseñas en el código fuente. La seguridad del Login está gestionada a través de las variables de entorno de Vercel.

* **Variable:** `APP_PASSWORD`
* **Uso:** Define la contraseña maestra requerida para visualizar el Dashboard y enviar registros.
* **Configuración:** Para cambiar la contraseña, se debe ingresar al panel de Vercel > *Project Settings* > *Environment Variables*, actualizar el valor de `APP_PASSWORD` y realizar un *Redeploy* del proyecto.

---

## 🗄️ Backend (Código Externo)

Aunque no reside en este repositorio, el sistema depende de un script alojado en Google Apps Script (`Código.gs`).

* **Función principal:** Actúa como una API REST recibiendo peticiones `POST` a través de la función `doPost(e)`.
* **Seguridad:** Verifica que no existan boletas duplicadas y que los montos "a cuenta" tengan coherencia matemática antes de escribir en la hoja `Registro`.

---
*Documentación generada para el mantenimiento y escalabilidad de la infraestructura de TI de Sastrería Natalli's.*
