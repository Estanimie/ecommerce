# Deploy simple en Render

## Que es Render
Render es un hosting. En criollo: otra computadora en internet que deja tu tienda y tu backend prendidos las 24 horas.

## Por que te lo recomiendo
- Tu proyecto ya tiene un servidor Node listo (`server.js`).
- Render corre ese servidor sin que tengamos que reescribir todo para Netlify Functions.
- Nos da una URL publica HTTPS, que Mercado Pago necesita para redireccionar y para mandar webhooks.

## Que vas a hacer ahi
1. Crear una cuenta en Render.
2. Conectar tu GitHub.
3. Elegir este repo.
4. Crear un `Web Service`.
5. Pegar las variables de entorno.
6. Deploy.

## Variables que vas a poner en Render
- `MP_ENVIRONMENT=test`
- `MP_STATEMENT_DESCRIPTOR=PISTANERA`
- `MP_ACCESS_TOKEN=...`
- `MP_WEBHOOK_SECRET=...`
- `APP_BASE_URL=https://tu-servicio.onrender.com`
- `API_BASE_URL=https://tu-servicio.onrender.com`
- `MP_PUBLIC_KEY=` opcional por ahora

## Flujo real
- Cliente entra a la tienda
- Hace click en comprar
- El backend crea una preferencia en Mercado Pago
- Mercado Pago cobra
- Mercado Pago le acredita el pago a tu cuenta de prueba
- Mercado Pago manda webhook al backend
- El backend marca la orden como pagada

## Despues del primer deploy
Cuando Render te de la URL final del servicio:
1. La copias
2. La pegas en `APP_BASE_URL` y `API_BASE_URL`
3. En Mercado Pago configuras el webhook:
   `https://tu-servicio.onrender.com/api/mercadopago/webhook`

## Importante
No subas `.env` a GitHub.
