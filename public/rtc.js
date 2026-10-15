const wsUrl = () => (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host;
const ICE = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
