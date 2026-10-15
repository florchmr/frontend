# Retransmisión en vivo (Champs 2026)

Sitio estático (WebRTC). Una persona comparte la pestaña del partido en `/broadcast.html` y el equipo lo ve en `/`.
Se publica tal cual en Vercel (`vercel.json` usa la carpeta `public`).

- Transmitir: Chrome/Edge de escritorio; marcar "Compartir audio de la pestaña".
- Señalización: solo HTTPS vía ntfy.sh (`public/signal.js`), sin WebSocket, para redes que lo bloquean.
  El plan gratuito de ntfy.sh limita los mensajes por día y por IP; el código usa pocos (latido cada 4 min).
- El código de sala está en `public/config.js`.
- El video va del navegador del transmisor a cada espectador (P2P), sirve para ~10-15 personas.
- `/diag.html` prueba la conexión del navegador.
