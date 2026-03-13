# Integracion Mercado Pago para Pista Nera

## Recomendacion simple
La forma mas facil de dejar esto cobrando es subir toda la app a Render y usar una sola URL para frontend + backend.
Netlify puede seguir sirviendo paginas estaticas, pero para cobrar de verdad igual necesitas un backend publico para Mercado Pago.

## Que ya quedo armado
- Servidor Node en `server.js` sin dependencias externas.
- Endpoint `POST /api/create-preference` para crear preferencias de Checkout Pro.
- Endpoint `POST /api/mercadopago/webhook` para recibir notificaciones y validar firma HMAC.
- Persistencia local de ordenes en `data/orders.json`.
- Pagina de retorno en `payment-result.html`.
- Frontend conectado al backend desde `app.js`.
- Config publica del frontend en `site-config.js` para apuntar la API a otro host si hace falta.
- Archivo `render.yaml` listo para ayudarte a desplegar en Render.

## Arquitectura recomendada
- `APP_BASE_URL`: URL publica de tu app en Render.
- `API_BASE_URL`: la misma URL publica de tu app en Render.
- Resultado: una sola URL, menos configuracion, menos errores.

## Que necesitas completar vos
1. Subir este repo actualizado a GitHub.
2. Crear una cuenta en Render y conectar GitHub.
3. Crear un `Web Service` desde este repo.
4. Pegar estas variables en Render:
   - `MP_ENVIRONMENT=test`
   - `MP_STATEMENT_DESCRIPTOR=PISTANERA`
   - `MP_ACCESS_TOKEN=...`
   - `MP_WEBHOOK_SECRET=...`
   - `APP_BASE_URL=https://tu-servicio.onrender.com`
   - `API_BASE_URL=https://tu-servicio.onrender.com`
5. En Mercado Pago registrar el webhook con esta URL exacta:
   `https://tu-servicio.onrender.com/api/mercadopago/webhook`

## Como levantarlo localmente
1. Ejecuta `npm start`
2. Abre `http://localhost:3000`

## Seguridad
- No pongas `MP_ACCESS_TOKEN` en el frontend.
- Corre el backend detras de HTTPS en produccion.
- No despaches pedidos por el retorno del navegador; usa el estado guardado por webhook.
- Cuando todo quede funcionando, te conviene regenerar el token que compartiste por chat.
