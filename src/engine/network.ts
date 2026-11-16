// ─── WebRTC P2P Multiplayer via PeerJS ────────────────────────────
import Peer, { type DataConnection } from 'peerjs';
import type { Card, TrucoLevel, EnvidoType } from './types';

export type NetworkMessage =
  | { type: 'JOIN'; playerName: string }
  | { type: 'JOIN_ACK'; hostName: string; goal: 15 | 30; withFlor: boolean }
  | { type: 'START_ROUND'; hand: Card[]; oppHandCount: number; mano: 'player' | 'opponent'; roundNum: number }
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

const PEER_PREFIX = 'truco-ar-v2-';

export class TrucoNetwork {
  private peer: Peer | null = null;
  private conn: DataConnection | null = null;
  public roomCode: string = '';
  public isHost: boolean = false;
  private callbacks: NetworkCallbacks;

  constructor(callbacks: NetworkCallbacks) {
    this.callbacks = callbacks;
  }

  // Create room as Host
  public createRoom(roomCode: string) {
    this.destroy();
    this.isHost = true;
    this.roomCode = roomCode.toUpperCase().trim();
    const peerId = PEER_PREFIX + this.roomCode.toLowerCase();

    this.callbacks.onStatusChange('connecting', 'Conectando al servidor de salas...');

    this.peer = new Peer(peerId, {
      debug: 1,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
        ],
      },
    });

    this.peer.on('open', () => {
      this.callbacks.onStatusChange('waiting_peer', `Sala ${this.roomCode} lista. Esperando que se una tu amigo.`);
    });

    this.peer.on('connection', (connection) => {
      this.conn = connection;
      this.setupConnection();
    });

    this.peer.on('error', (err) => {
      console.error('PeerJS Host Error:', err);
      if (err.type === 'unavailable-id') {
        this.callbacks.onStatusChange('error', 'El código de sala ya está en uso. Probá con otro código.');
      } else {
        this.callbacks.onStatusChange('error', `Error de conexión: ${err.message || 'desconocido'}`);
      }
    });
  }

  // Join room as Guest
  public joinRoom(roomCode: string, myName: string) {
    this.destroy();
    this.isHost = false;
    this.roomCode = roomCode.toUpperCase().trim();
    const targetPeerId = PEER_PREFIX + this.roomCode.toLowerCase();

    this.callbacks.onStatusChange('connecting', `Buscando sala ${this.roomCode}...`);

    this.peer = new Peer({
      debug: 1,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
        ],
      },
    });

    this.peer.on('open', () => {
      if (!this.peer) return;
      const connection = this.peer.connect(targetPeerId, {
        reliable: true,
      });
      this.conn = connection;
      this.setupConnection(myName);
    });

    this.peer.on('error', (err) => {
      console.error('PeerJS Guest Error:', err);
      if (err.type === 'peer-unavailable') {
        this.callbacks.onStatusChange('error', `No se encontró la sala ${this.roomCode}. Verificá el código con tu amigo.`);
      } else {
        this.callbacks.onStatusChange('error', `Error de conexión: ${err.message || 'desconocido'}`);
      }
    });
  }

  private setupConnection(guestName?: string) {
    if (!this.conn) return;

    this.conn.on('open', () => {
      this.callbacks.onStatusChange('connected', '¡Conectado con tu amigo!');
      if (!this.isHost && guestName) {
        this.sendMessage({ type: 'JOIN', playerName: guestName });
      }
    });

    this.conn.on('data', (data) => {
      try {
        const msg = data as NetworkMessage;
        this.callbacks.onMessage(msg);
      } catch (e) {
        console.error('Error parsing network msg:', e);
      }
    });

    this.conn.on('close', () => {
      this.callbacks.onStatusChange('disconnected', 'Tu amigo se desconectó de la partida.');
    });

    this.conn.on('error', (err) => {
      console.error('DataConnection error:', err);
      this.callbacks.onStatusChange('error', 'Error en la conexión con tu amigo.');
    });
  }

  public sendMessage(msg: NetworkMessage) {
    if (this.conn && this.conn.open) {
      this.conn.send(msg);
    }
  }

  public destroy() {
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
