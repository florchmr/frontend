# Retransmisión en vivo

Una persona abre el portal del torneo (con su login), comparte esa pestaña y el resto del equipo la ve por WebRTC.

```
npm install
BROADCAST_KEY=miclave WATCH_KEY=otraclave npm start   # WATCH_KEY es opcional
```

- Transmitir: `/broadcast.html` (Chrome/Edge de escritorio; marcar "Compartir audio de la pestaña")
- Ver: `/watch.html`

Notas: `getDisplayMedia` requiere HTTPS (o localhost) en producción. El video sale desde el navegador del transmisor hacia cada espectador (P2P), así que sirve para grupos chicos (~10-15). Para más gente o redes restrictivas hace falta un servidor TURN/SFU.
