// ─── Truco Criollo Online Network Engine (Multi-Peer Ultra-Resilient WebSocket / MQTT) ──
import mqtt, { type MqttClient } from 'mqtt';
import type { Card, MatchType, CallType, RoomSeat } from './types';

export const DEFAULT_AVATARS = ['🤠', '😎', '🧉', '😼', '🐎', '🎭'];

export type NetworkMessage =
  // 1v1 legacy / compatibility messages
  | { type: 'JOIN'; playerName: string; peerId?: string }
  | { type: 'JOIN_ACK'; hostName: string; goal: 15 | 30; withFlor: boolean; matchType?: MatchType; seatIndex?: number; seats?: RoomSeat[] }
  | { type: 'HOST_START_MATCH'; matchType?: MatchType; seats?: RoomSeat[]; goal?: 15 | 30; withFlor?: boolean }
  | { type: 'GUEST_READY' }
  | { type: 'START_ROUND'; hand: Card[]; oppHandCount: number; mano: 'player' | 'opponent'; roundNum: number; hostName?: string }
  | { type: 'PLAY_CARD'; card: Card; trickIndex: number }
  | { type: 'CALL'; call: 'envido' | 'real_envido' | 'falta_envido' | 'truco' | 'retruco' | 'vale4' | 'flor' }
  | { type: 'RESPONSE'; resp: 'quiero' | 'no_quiero'; toCall: string }
  | { type: 'ENVIDO_POINTS'; points: number }
  | { type: 'GO_MAZO' }
  | { type: 'SENA'; sena: string; gesture?: string }
  | { type: 'CHAT'; text: string; from: string }
  | { type: 'REVANCHE' }

  // Multi-Player (2v2 and 3v3) & Room Lobby messages
  | { type: 'JOIN_REQUEST'; peerId: string; playerName: string; avatar?: string }
  | { type: 'ROOM_STATE'; matchType: MatchType; goal: 15 | 30; withFlor: boolean; hostName: string; seats: RoomSeat[] }
  | { type: 'CHANGE_SEAT'; peerId: string; targetSeatIndex: number }
  | { type: 'START_MATCH_MULTI'; matchType: MatchType; seats: RoomSeat[]; goal: 15 | 30; withFlor: boolean }
  | { type: 'START_ROUND_MULTI'; manoSeat: number; roundNum: number }
  | { type: 'DEAL_HAND_MULTI'; targetSeat: number; targetPeerId?: string; hand: Card[]; manoSeat: number; roundNum: number }
  | { type: 'PLAY_CARD_MULTI'; seatIndex: number; team: 0 | 1; card: Card; trickIndex: number }
  | { type: 'CALL_MULTI'; seatIndex: number; team: 0 | 1; call: CallType }
  | { type: 'RESPONSE_MULTI'; seatIndex: number; team: 0 | 1; resp: 'quiero' | 'no_quiero'; toCall: string }
  | { type: 'ENVIDO_POINTS_MULTI'; seatIndex: number; team: 0 | 1; points: number }
  | { type: 'GO_MAZO_MULTI'; seatIndex: number; team: 0 | 1 }
  | { type: 'SENA_MULTI'; fromSeat: number; team: 0 | 1; sena: string; gesture?: string }
  | { type: 'CHAT_MULTI'; fromSeat: number; fromName: string; text: string };

export type NetworkStatus = 'disconnected' | 'connecting' | 'waiting_peer' | 'connected' | 'error';

export interface NetworkCallbacks {
  onStatusChange: (status: NetworkStatus, info?: string) => void;
  onMessage: (msg: NetworkMessage) => void;
}

const BROKERS = [
  'wss://broker.emqx.io:8084/mqtt',
  'wss://broker.hivemq.com:8884/mqtt',
  'wss://test.mosquitto.org:8081',
];

const ROOM_PREFIX = 'truco-ar/v4/rooms/';

export class TrucoNetwork {
  private client: MqttClient | null = null;
  public roomCode: string = '';
  public isHost: boolean = false;
  public callbacks: NetworkCallbacks;
  public readonly myPeerId: string = 'p_' + Math.random().toString(36).slice(2, 9);
  public mySeatIndex: number = 0;
  public myPlayerName: string = '';
  public hostName: string = '';
  public matchType: MatchType = '1v1';
  public goal: 15 | 30 = 15;
  public withFlor: boolean = false;
  public seats: RoomSeat[] = [];

  private pendingQueue: NetworkMessage[] = [];
  private handshakeTimer: any = null;
  private keepaliveTimer: any = null;
  private visibilityHandler: (() => void) | null = null;
  public hasHandshakeCompleted: boolean = false;
  private currentBrokerIdx: number = 0;
  private broadcastTopic: string = '';
  private peerDirectTopic: string = '';
  private mySendTopic: string = '';
  private myListenTopic: string = '';
  private isSubscribed: boolean = false;

  private readonly sessionId: string = Math.random().toString(36).slice(2, 10);
  private sendSeq: number = 0;
  private seenSeqs: Set<string> = new Set();
  private everConnected: boolean = false;
  private joinAttempts: number = 0;

  constructor(callbacks: NetworkCallbacks) {
    this.callbacks = callbacks;
    this.setupVisibilityListener();
  }

  public setMessageCallback(fn: (msg: NetworkMessage) => void) {
    this.callbacks.onMessage = fn;
  }

  // Detectar cuando el usuario vuelve de WhatsApp o desbloquea el celular
  private setupVisibilityListener() {
    if (typeof document !== 'undefined') {
      this.visibilityHandler = () => {
        if (document.visibilityState === 'visible') {
          console.log('[TrucoNetwork] Retorno a primer plano en el celular');
          if (this.client && !this.client.connected) {
            console.log('[TrucoNetwork] Reconectando cliente de red...');
            try {
              this.client.reconnect();
            } catch (e) {
              console.warn('[TrucoNetwork] Error reconectando:', e);
            }
          }
        }
      };
      document.addEventListener('visibilitychange', this.visibilityHandler);
    }
  }

  private startKeepalive() {
    this.stopKeepalive();
    this.keepaliveTimer = setInterval(() => {
      if (this.client && this.client.connected) {
        // Enviar ping si es necesario
      } else if (this.client && !this.client.connected && !this.client.disconnecting && !this.client.reconnecting) {
        try {
          this.client.reconnect();
        } catch {}
      }
    }, 5000);
  }

  private stopKeepalive() {
    if (this.keepaliveTimer) {
      clearInterval(this.keepaliveTimer);
      this.keepaliveTimer = null;
    }
  }

  public initSeats(matchType: MatchType, hostName: string) {
    const total = matchType === '1v1' ? 2 : matchType === '2v2' ? 4 : 6;
    const oldSeats = [...this.seats];
    this.seats = Array.from({ length: total }, (_, i) => {
      if (i === 0) {
        return {
          seatIndex: 0,
          peerId: this.myPeerId,
          name: hostName,
          team: 0 as const,
          avatar: DEFAULT_AVATARS[0],
          isHost: true,
          isConnected: true,
        };
      }
      const existing = oldSeats.find(s => s.seatIndex === i && s.peerId);
      if (existing) {
        return { ...existing, team: (i % 2 === 0 ? 0 : 1) as 0 | 1 };
      }
      return {
        seatIndex: i,
        peerId: '',
        name: '',
        team: (i % 2 === 0 ? 0 : 1) as 0 | 1,
        avatar: DEFAULT_AVATARS[i],
        isHost: false,
        isConnected: false,
      };
    });
  }

  // ─── Create Room as Host ──────────────────────────────────────────
  public createRoom(
    roomCode: string,
    hostPlayerName: string = 'Vos',
    matchType: MatchType = '1v1',
    goal: 15 | 30 = 15,
    withFlor: boolean = false
  ) {
    this.destroy();
    this.isHost = true;
    this.hasHandshakeCompleted = true;
    this.currentBrokerIdx = 0;
    this.everConnected = false;
    this.roomCode = roomCode.toUpperCase().trim();
    this.myPlayerName = hostPlayerName;
    this.hostName = hostPlayerName;
    this.matchType = matchType;
    this.goal = goal;
    this.withFlor = withFlor;
    this.mySeatIndex = 0;

    this.initSeats(matchType, hostPlayerName);

    this.broadcastTopic = `${ROOM_PREFIX}${this.roomCode}/all`;
    this.peerDirectTopic = `${ROOM_PREFIX}${this.roomCode}/peer/${this.myPeerId}`;
    this.mySendTopic = `${ROOM_PREFIX}${this.roomCode}/host`;
    this.myListenTopic = `${ROOM_PREFIX}${this.roomCode}/guest`;

    this.callbacks.onStatusChange('connecting', 'Conectando con la red del juego...');
    this.connectMqtt();
  }

  // ─── Join Room as Guest ───────────────────────────────────────────
  public joinRoom(roomCode: string, myName: string) {
    this.destroy();
    this.isHost = false;
    this.hasHandshakeCompleted = false;
    this.currentBrokerIdx = 0;
    this.everConnected = false;
    this.joinAttempts = 0;
    this.roomCode = roomCode.toUpperCase().trim();
    this.myPlayerName = myName;

    this.broadcastTopic = `${ROOM_PREFIX}${this.roomCode}/all`;
    this.peerDirectTopic = `${ROOM_PREFIX}${this.roomCode}/peer/${this.myPeerId}`;
    this.mySendTopic = `${ROOM_PREFIX}${this.roomCode}/guest`;
    this.myListenTopic = `${ROOM_PREFIX}${this.roomCode}/host`;

    this.callbacks.onStatusChange('connecting', `Buscando la sala ${this.roomCode}...`);
    this.connectMqtt(myName);
  }

  public setRoomConfig(matchType: MatchType, goal: 15 | 30, withFlor: boolean) {
    if (!this.isHost) return;
    this.matchType = matchType;
    this.goal = goal;
    this.withFlor = withFlor;
    this.initSeats(matchType, this.hostName);
    this.broadcastRoomState();
  }

  public broadcastRoomState() {
    if (!this.isHost) return;
    this.sendMessage({
      type: 'ROOM_STATE',
      matchType: this.matchType,
      goal: this.goal,
      withFlor: this.withFlor,
      hostName: this.hostName,
      seats: this.seats,
    });
  }

  public requestChangeSeat(targetSeatIndex: number) {
    if (this.isHost) {
      const curIdx = this.seats.findIndex(s => s.peerId === this.myPeerId);
      if (curIdx !== -1 && targetSeatIndex >= 0 && targetSeatIndex < this.seats.length) {
        if (!this.seats[targetSeatIndex].peerId) {
          const moving = this.seats[curIdx];
          this.seats[targetSeatIndex] = {
            ...moving,
            seatIndex: targetSeatIndex,
            team: (targetSeatIndex % 2 === 0 ? 0 : 1) as 0 | 1,
          };
          this.seats[curIdx] = {
            seatIndex: curIdx,
            peerId: '',
            name: '',
            team: (curIdx % 2 === 0 ? 0 : 1) as 0 | 1,
            avatar: DEFAULT_AVATARS[curIdx],
            isHost: false,
            isConnected: false,
          };
          this.mySeatIndex = targetSeatIndex;
          this.broadcastRoomState();
        }
      }
    } else {
      this.sendMessage({
        type: 'CHANGE_SEAT',
        peerId: this.myPeerId,
        targetSeatIndex,
      });
    }
  }

  private connectMqtt(guestName?: string) {
    if (!this.visibilityHandler) this.setupVisibilityListener();
    const brokerUrl = BROKERS[this.currentBrokerIdx];
    const rolePrefix = this.isHost ? 'host' : 'guest';
    const clientId = `truco-${rolePrefix}-${this.roomCode}-${this.myPeerId}`;

    console.log(`[TrucoNetwork] Conectando a ${brokerUrl} con clientId ${clientId}`);

    try {
      this.client = mqtt.connect(brokerUrl, {
        clientId,
        keepalive: 15,
        clean: true,
        reconnectPeriod: 2000,
        connectTimeout: 8000,
      });

      this.startKeepalive();

      this.client.on('connect', () => {
        this.everConnected = true;
        console.log(`[TrucoNetwork] Conectado exitosamente al broker MQTT (${brokerUrl})`);

        const topicsToSub = [
          this.broadcastTopic,
          this.peerDirectTopic,
          this.myListenTopic,
        ].filter(Boolean);

        this.client?.subscribe(topicsToSub, { qos: 1 }, (err) => {
          if (err) {
            console.error('[TrucoNetwork] Error al suscribirse:', err);
            this.callbacks.onStatusChange('error', 'Error al conectarse a la sala');
            return;
          }

          this.isSubscribed = true;
          console.log(`[TrucoNetwork] Suscripto a:`, topicsToSub);

          if (this.isHost) {
            this.callbacks.onStatusChange(
              'waiting_peer',
              `Sala ${this.roomCode} lista (${this.matchType}). Esperando que entren tus amigos.`
            );
            this.broadcastRoomState();
          } else {
            this.callbacks.onStatusChange(
              'connecting',
              `Conectado a la sala ${this.roomCode}. Saludando al anfitrión...`
            );
            if (guestName) {
              this.startGuestHandshake(guestName);
            }
          }

          this.flushQueue();
        });
      });

      this.client.on('message', (_topic, payload) => {
        try {
          const raw = payload.toString();
          const env = JSON.parse(raw) as any;

          // Ignorar mensajes enviados por mí mismo
          if (env._fromPeerId === this.myPeerId) return;

          const dedupeKey = `${env._sid || '0'}:${env._s || '0'}`;
          if (this.seenSeqs.has(dedupeKey)) return;
          this.seenSeqs.add(dedupeKey);
          if (this.seenSeqs.size > 800) {
            const oldest = this.seenSeqs.values().next().value;
            if (oldest !== undefined) this.seenSeqs.delete(oldest);
          }

          const { _s, _sid, _fromPeerId, ...msg } = env;
          void _s; void _sid; void _fromPeerId;
          console.log('[TrucoNetwork] Mensaje recibido:', msg.type);

          // Si soy el Host y alguien pide unirse:
          if (this.isHost && (msg.type === 'JOIN_REQUEST' || msg.type === 'JOIN')) {
            const pId = msg.peerId || (msg.type === 'JOIN' ? `guest_${Date.now()}` : '');
            const pName = msg.playerName;
            let seatIdx = this.seats.findIndex(s => s.peerId === pId);
            if (seatIdx === -1) {
              seatIdx = this.seats.findIndex(s => !s.peerId);
            }
            if (seatIdx !== -1) {
              this.seats[seatIdx] = {
                seatIndex: seatIdx,
                peerId: pId,
                name: pName,
                team: (seatIdx % 2 === 0 ? 0 : 1) as 0 | 1,
                avatar: DEFAULT_AVATARS[seatIdx] || '😎',
                isHost: false,
                isConnected: true,
              };
              this.broadcastRoomState();
              this.callbacks.onStatusChange('connected', `¡${pName} se unió a la mesa!`);
            }
            // Enviar JOIN_ACK para compatibilidad 1v1
            this.sendMessage({
              type: 'JOIN_ACK',
              hostName: this.hostName,
              goal: this.goal,
              withFlor: this.withFlor,
              matchType: this.matchType,
              seats: this.seats,
            });
          }

          // Si soy el Host y alguien solicita cambiar de asiento:
          if (this.isHost && msg.type === 'CHANGE_SEAT') {
            const { peerId, targetSeatIndex } = msg;
            const curIdx = this.seats.findIndex(s => s.peerId === peerId);
            if (curIdx !== -1 && targetSeatIndex >= 0 && targetSeatIndex < this.seats.length) {
              const target = this.seats[targetSeatIndex];
              if (!target.peerId) {
                const moving = this.seats[curIdx];
                this.seats[targetSeatIndex] = {
                  ...moving,
                  seatIndex: targetSeatIndex,
                  team: (targetSeatIndex % 2 === 0 ? 0 : 1) as 0 | 1,
                };
                this.seats[curIdx] = {
                  seatIndex: curIdx,
                  peerId: '',
                  name: '',
                  team: (curIdx % 2 === 0 ? 0 : 1) as 0 | 1,
                  avatar: DEFAULT_AVATARS[curIdx],
                  isHost: false,
                  isConnected: false,
                };
                this.broadcastRoomState();
              }
            }
          }

          // Si recibo ROOM_STATE (información actualizada de la sala):
          if (msg.type === 'ROOM_STATE') {
            this.hasHandshakeCompleted = true;
            this.stopHandshake();
            this.matchType = msg.matchType;
            this.goal = msg.goal;
            this.withFlor = msg.withFlor;
            this.hostName = msg.hostName;
            this.seats = msg.seats;
            const mySeat = this.seats.find(s => s.peerId === this.myPeerId);
            if (mySeat) {
              this.mySeatIndex = mySeat.seatIndex;
            }
            this.callbacks.onStatusChange('connected', `¡Conectado a la sala de ${msg.hostName}!`);
          }

          if (msg.type === 'JOIN_ACK') {
            this.hasHandshakeCompleted = true;
            this.stopHandshake();
            if (msg.seats) this.seats = msg.seats;
            if (msg.matchType) this.matchType = msg.matchType;
            const mySeat = this.seats.find(s => s.peerId === this.myPeerId);
            if (mySeat) {
              this.mySeatIndex = mySeat.seatIndex;
            }
            this.callbacks.onStatusChange('connected', `¡Conectado con ${msg.hostName}!`);
          }

          this.callbacks.onMessage(msg as NetworkMessage);
        } catch (e) {
          console.error('[TrucoNetwork] Error parseando mensaje de red:', e);
        }
      });

      this.client.on('reconnect', () => {
        this.callbacks.onStatusChange('connecting', 'Reconectando con la sala...');
      });

      this.client.on('close', () => {
        console.warn('[TrucoNetwork] Socket cerrado');
      });

      this.client.on('offline', () => {
        console.warn('[TrucoNetwork] Fuera de línea');
      });

      this.client.on('error', (err) => {
        console.error('[TrucoNetwork] Error de conexión:', err);
        if (this.everConnected) {
          this.callbacks.onStatusChange('connecting', 'Reconectando con la sala...');
          return;
        }
        if (this.currentBrokerIdx < BROKERS.length - 1) {
          this.currentBrokerIdx++;
          console.log(`[TrucoNetwork] Probando broker alternativo: ${BROKERS[this.currentBrokerIdx]}`);
          this.client?.end(true, () => {
            this.connectMqtt(guestName);
          });
        } else {
          this.callbacks.onStatusChange('error', 'Error en el servidor de juego. Reintentá en unos segundos.');
        }
      });
    } catch (e: any) {
      console.error('[TrucoNetwork] Error fatal al iniciar cliente:', e);
      this.callbacks.onStatusChange('error', `Error al iniciar red: ${e.message || 'desconocido'}`);
    }
  }

  private flushQueue() {
    if (!this.client || !this.client.connected || !this.isSubscribed) return;
    while (this.pendingQueue.length > 0) {
      const msg = this.pendingQueue.shift();
      if (msg) {
        try {
          this.publishMessage(msg);
        } catch (e) {
          console.error('[TrucoNetwork] Error al vaciar cola:', e);
        }
      }
    }
  }

  private publishMessage(msg: NetworkMessage) {
    const envelope = {
      ...msg,
      _s: ++this.sendSeq,
      _sid: this.sessionId,
      _fromPeerId: this.myPeerId,
    };
    const payload = JSON.stringify(envelope);

    if (this.broadcastTopic) {
      this.client?.publish(this.broadcastTopic, payload, { qos: 1 });
    }
    if (this.mySendTopic && this.mySendTopic !== this.broadcastTopic) {
      this.client?.publish(this.mySendTopic, payload, { qos: 1 });
    }
  }

  private startGuestHandshake(guestName: string) {
    this.stopHandshake();
    const sendJoin = () => {
      if (this.hasHandshakeCompleted) {
        this.stopHandshake();
        return;
      }
      if (this.client && this.client.connected) {
        try {
          this.publishMessage({
            type: 'JOIN_REQUEST',
            peerId: this.myPeerId,
            playerName: guestName,
          });
          this.publishMessage({
            type: 'JOIN',
            playerName: guestName,
            peerId: this.myPeerId,
          });
        } catch (e) {
          console.warn('[TrucoNetwork] Intento de JOIN fallido:', e);
        }
      }
      this.joinAttempts++;
      if (this.joinAttempts % 8 === 0 && this.joinAttempts < 24 && !this.hasHandshakeCompleted) {
        this.stopHandshake();
        this.isSubscribed = false;
        this.everConnected = false;
        this.currentBrokerIdx = (this.currentBrokerIdx + 1) % BROKERS.length;
        const old = this.client;
        this.client = null;
        old?.end(true, () => this.connectMqtt(guestName));
        return;
      }
      if (this.joinAttempts >= 25) {
        this.stopHandshake();
        if (!this.hasHandshakeCompleted) {
          this.callbacks.onStatusChange(
            'error',
            `No se encontró al anfitrión en la sala ${this.roomCode}. Verificá que tenga la mesa abierta.`
          );
        }
      }
    };

    sendJoin();
    this.handshakeTimer = setInterval(sendJoin, 1200);
  }

  private stopHandshake() {
    if (this.handshakeTimer) {
      clearInterval(this.handshakeTimer);
      this.handshakeTimer = null;
    }
  }

  public sendMessage(msg: NetworkMessage) {
    if (this.client && this.client.connected && this.isSubscribed) {
      try {
        this.flushQueue();
        this.publishMessage(msg);
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
    this.isSubscribed = false;

    if (this.visibilityHandler && typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
      this.visibilityHandler = null;
    }

    if (this.client) {
      try {
        this.client.end(true);
      } catch {}
      this.client = null;
    }
    this.callbacks.onStatusChange('disconnected');
  }
}
