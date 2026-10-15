# Retransmisión en vivo

Sitio estático (WebRTC + PeerJS). Una persona comparte la pestaña del partido en `/broadcast.html`
y el equipo lo ve en `/watch.html#CODIGO`. Se publica tal cual en Vercel (`vercel.json` usa la carpeta `public`).

- Transmitir: Chrome/Edge de escritorio; marcar "Compartir audio de la pestaña".
- El código secreto actúa como clave: quien lo conoce puede ver.
- El video va del navegador del transmisor a cada espectador (P2P), sirve para ~10-15 personas.
