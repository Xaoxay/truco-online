// ─── WebRTC P2P Multiplayer via PeerJS with Mobile CGNAT & TURN Support ──────
import Peer, { type DataConnection } from 'peerjs';
import type { Card } from './types';

export type NetworkMessage =
  | { type: 'JOIN'; playerName: string }
  | { type: 'JOIN_ACK'; hostName: string; goal: 15 | 30; withFlor: boolean }
  | { type: 'HOST_START_MATCH' }
  | { type: 'GUEST_READY' }
  | { type: 'START_ROUND'; hand: Card[]; oppHandCount: number; mano: 'player' | 'opponent'; roundNum: number; hostName?: string }
  | { type: 'PLAY_CARD'; card: Card; trickIndex: number }
  | { type: 'CALL'; call: 'envido' | 'real_envido' | 'falta_envido' | 'truco' | 'retruco' | 'vale4' | 'flor' }
  | { type: 'RESPONSE'; resp: 'quiero' | 'no_quiero'; toCall: string }
  | { type: 'ENVIDO_POINTS'; points: number }
  | { type: 'GO_MAZO' }
  | { type: 'SENA'; sena: string; gesture?: string }
  | { type: 'CHAT'; text: string; from: string }
  | { type: 'REVANCHE' };

export type NetworkStatus = 'disconnected' | 'connecting' | 'waiting_peer' | 'connected' | 'error';

export interface NetworkCallbacks {
  onStatusChange: (status: NetworkStatus, info?: string) => void;
  onMessage: (msg: NetworkMessage) => void;
}

const PEER_PREFIX = 'truco-ar-v3-';

// Servidores STUN y TURN de alta disponibilidad para atravesar redes móviles (4G/5G y Symmetric NAT)
export const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' },
  { urls: 'stun:global.stun.twilio.com:3478' },
  // OpenRelay TURN servers (Metered.ca) para celulares bajo CGNAT
  {
    urls: [
      'turn:openrelay.metered.ca:80',
      'turn:openrelay.metered.ca:443',
      'turn:openrelay.metered.ca:443?transport=tcp',
    ],
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
];

export class TrucoNetwork {
  private peer: Peer | null = null;
  private conn: DataConnection | null = null;
  public roomCode: string = '';
  public isHost: boolean = false;
  private callbacks: NetworkCallbacks;
  private pendingQueue: NetworkMessage[] = [];
  private handshakeTimer: any = null;
  private keepaliveTimer: any = null;
  private visibilityHandler: (() => void) | null = null;
  public hasHandshakeCompleted: boolean = false;

  constructor(callbacks: NetworkCallbacks) {
    this.callbacks = callbacks;
    this.setupVisibilityListener();
  }

  // Detectar cuando el usuario vuelve de WhatsApp u otra app en el celular
  private setupVisibilityListener() {
    if (typeof document !== 'undefined') {
      this.visibilityHandler = () => {
        if (document.visibilityState === 'visible') {
          if (this.peer && this.peer.disconnected && !this.peer.destroyed) {
            console.log('[TrucoNetwork] Retorno a la app: reconectando socket de señalización...');
            try {
              this.peer.reconnect();
            } catch (e) {
              console.warn('[TrucoNetwork] Error al reconectar:', e);
            }
          }
        }
      };
      document.addEventListener('visibilitychange', this.visibilityHandler);
    }
  }

  // Keepalive para evitar que el navegador móvil suspenda el WebSocket
  private startKeepalive() {
    this.stopKeepalive();
    this.keepaliveTimer = setInterval(() => {
      if (this.peer && !this.peer.destroyed) {
        if (this.peer.disconnected) {
          try { this.peer.reconnect(); } catch {}
        }
      }
    }, 8000);
  }

  private stopKeepalive() {
    if (this.keepaliveTimer) {
      clearInterval(this.keepaliveTimer);
      this.keepaliveTimer = null;
    }
  }

  // Create room as Host
  public createRoom(roomCode: string) {
    this.destroy();
    this.isHost = true;
    this.hasHandshakeCompleted = false;
    this.roomCode = roomCode.toUpperCase().trim();
    const peerId = PEER_PREFIX + this.roomCode.toLowerCase();

    this.callbacks.onStatusChange('connecting', 'Creando sala en el servidor...');

    this.peer = new Peer(peerId, {
      debug: 1,
      config: {
        iceServers: ICE_SERVERS,
        sdpSemantics: 'unified-plan',
      },
    });

    this.startKeepalive();

    this.peer.on('open', () => {
      this.callbacks.onStatusChange('waiting_peer', `Sala ${this.roomCode} lista. Esperando que se una tu amigo.`);
    });

    this.peer.on('connection', (connection) => {
      console.log('[TrucoNetwork] Conexión entrante recibida en el anfitrión');
      this.conn = connection;
      this.setupConnection();
    });

    this.peer.on('disconnected', () => {
      console.warn('[TrucoNetwork] Host desconectado del broker, reconectando...');
      if (this.peer && !this.peer.destroyed) {
        try { this.peer.reconnect(); } catch {}
      }
    });

    this.peer.on('error', (err) => {
      console.error('[TrucoNetwork] Error en Anfitrión:', err);
      if (err.type === 'unavailable-id') {
        this.callbacks.onStatusChange('error', 'El código de sala ya está en uso. Probá con otro código.');
      } else {
        this.callbacks.onStatusChange('error', `Error de red: ${err.message || 'desconocido'}`);
      }
    });
  }

  // Join room as Guest
  public joinRoom(roomCode: string, myName: string) {
    this.destroy();
    this.isHost = false;
    this.hasHandshakeCompleted = false;
    this.roomCode = roomCode.toUpperCase().trim();
    const targetPeerId = PEER_PREFIX + this.roomCode.toLowerCase();

    this.callbacks.onStatusChange('connecting', `Conectando con la sala ${this.roomCode}...`);

    this.peer = new Peer({
      debug: 1,
      config: {
        iceServers: ICE_SERVERS,
        sdpSemantics: 'unified-plan',
      },
    });

    this.startKeepalive();

    this.peer.on('open', () => {
      if (!this.peer) return;
      console.log(`[TrucoNetwork] Guest peer abierto. Conectando a target: ${targetPeerId}`);
      const connection = this.peer.connect(targetPeerId, {
        reliable: true,
        serialization: 'json',
      });
      this.conn = connection;
      this.setupConnection(myName);
    });

    this.peer.on('disconnected', () => {
      if (this.peer && !this.peer.destroyed) {
        try { this.peer.reconnect(); } catch {}
      }
    });

    this.peer.on('error', (err) => {
      console.error('[TrucoNetwork] Error en Invitado:', err);
      if (err.type === 'peer-unavailable') {
        this.callbacks.onStatusChange(
          'error',
          `No se encontró la sala ${this.roomCode}. Verificá que el anfitrión tenga la app abierta.`
        );
      } else {
        this.callbacks.onStatusChange('error', `Error de conexión: ${err.message || 'desconocido'}`);
      }
    });
  }

  private flushQueue() {
    if (!this.conn || !this.conn.open) return;
    while (this.pendingQueue.length > 0) {
      const msg = this.pendingQueue.shift();
      if (msg) {
        try {
          this.conn.send(msg);
        } catch (e) {
          console.error('[TrucoNetwork] Error al vaciar cola:', e);
        }
      }
    }
  }

  private startGuestHandshake(guestName: string) {
    this.stopHandshake();
    let attempts = 0;
    const sendJoin = () => {
      if (this.hasHandshakeCompleted) {
        this.stopHandshake();
        return;
      }
      if (this.conn && this.conn.open) {
        console.log(`[TrucoNetwork] Enviando saludo JOIN (intento ${attempts + 1})...`);
        try {
          this.conn.send({ type: 'JOIN', playerName: guestName });
        } catch (e) {
          console.warn('[TrucoNetwork] Intento de JOIN fallido:', e);
        }
      }
      attempts++;
      if (attempts >= 12) {
        this.stopHandshake();
      }
    };

    sendJoin();
    this.handshakeTimer = setInterval(sendJoin, 1000);
  }

  private stopHandshake() {
    if (this.handshakeTimer) {
      clearInterval(this.handshakeTimer);
      this.handshakeTimer = null;
    }
  }

  private setupConnection(guestName?: string) {
    if (!this.conn) return;

    const onOpened = () => {
      console.log('[TrucoNetwork] Canal de datos P2P ABIERTO exitosamente');
      this.callbacks.onStatusChange('connected', '¡Conectado con tu amigo!');
      this.flushQueue();

      if (!this.isHost && guestName) {
        this.startGuestHandshake(guestName);
      }
    };

    if (this.conn.open) {
      onOpened();
    } else {
      this.conn.on('open', onOpened);
    }

    this.conn.on('data', (data) => {
      try {
        const msg = data as NetworkMessage;
        if (msg.type === 'JOIN_ACK') {
          this.hasHandshakeCompleted = true;
          this.stopHandshake();
        }
        this.callbacks.onMessage(msg);
      } catch (e) {
        console.error('[TrucoNetwork] Error al parsear mensaje de red:', e);
      }
    });

    this.conn.on('close', () => {
      console.warn('[TrucoNetwork] Canal P2P cerrado por el rival');
      this.callbacks.onStatusChange('disconnected', 'Tu amigo se desconectó de la partida.');
    });

    this.conn.on('error', (err) => {
      console.error('[TrucoNetwork] Error en canal de datos P2P:', err);
      this.callbacks.onStatusChange('error', 'Error en la conexión con tu amigo.');
    });
  }

  public sendMessage(msg: NetworkMessage) {
    if (this.conn && this.conn.open) {
      try {
        this.conn.send(msg);
      } catch (e) {
        console.warn('[TrucoNetwork] Envío falló, encolando mensaje:', e);
        this.pendingQueue.push(msg);
      }
    } else {
      this.pendingQueue.push(msg);
    }
  }

  public destroy() {
    this.stopHandshake();
    this.stopKeepalive();
    this.pendingQueue = [];
    this.hasHandshakeCompleted = false;

    if (this.visibilityHandler && typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
      this.visibilityHandler = null;
    }

    if (this.conn) {
      try { this.conn.close(); } catch {}
      this.conn = null;
    }
    if (this.peer) {
      try { this.peer.destroy(); } catch {}
      this.peer = null;
    }
    this.callbacks.onStatusChange('disconnected');
  }
}
