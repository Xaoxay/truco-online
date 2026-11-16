// ─── Truco Criollo Online Network Engine (Ultra-Resilient WebSocket / MQTT) ──
import mqtt, { type MqttClient } from 'mqtt';
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
  private pendingQueue: NetworkMessage[] = [];
  private handshakeTimer: any = null;
  private keepaliveTimer: any = null;
  private visibilityHandler: (() => void) | null = null;
  public hasHandshakeCompleted: boolean = false;
  private currentBrokerIdx: number = 0;
  private mySendTopic: string = '';
  private myListenTopic: string = '';
  private isSubscribed: boolean = false;
  // Cada mensaje viaja con (sid, seq) para descartar duplicados (MQTT QoS 1 puede entregar dos veces)
  private readonly sessionId: string = Math.random().toString(36).slice(2, 10);
  private sendSeq: number = 0;
  private peerSid: string = '';
  private seenSeqs: Set<number> = new Set();
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

  // ─── Create Room as Host ──────────────────────────────────────────
  public createRoom(roomCode: string) {
    this.destroy();
    this.isHost = true;
    this.hasHandshakeCompleted = false;
    this.currentBrokerIdx = 0;
    this.everConnected = false;
    this.roomCode = roomCode.toUpperCase().trim();
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
    this.mySendTopic = `${ROOM_PREFIX}${this.roomCode}/guest`;
    this.myListenTopic = `${ROOM_PREFIX}${this.roomCode}/host`;

    this.callbacks.onStatusChange('connecting', `Buscando la sala ${this.roomCode}...`);
    this.connectMqtt(myName);
  }

  private connectMqtt(guestName?: string) {
    if (!this.visibilityHandler) this.setupVisibilityListener();
    const brokerUrl = BROKERS[this.currentBrokerIdx];
    const rolePrefix = this.isHost ? 'host' : 'guest';
    const clientId = `truco-${rolePrefix}-${this.roomCode}-${Math.random().toString(16).slice(2, 8)}`;

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
        this.client?.subscribe(this.myListenTopic, { qos: 1 }, (err) => {
          if (err) {
            console.error('[TrucoNetwork] Error al suscribirse a:', this.myListenTopic, err);
            this.callbacks.onStatusChange('error', 'Error al conectarse a la sala');
            return;
          }

          this.isSubscribed = true;
          console.log(`[TrucoNetwork] Suscripto exitosamente a: ${this.myListenTopic}`);

          if (this.isHost) {
            this.callbacks.onStatusChange(
              'waiting_peer',
              `Sala ${this.roomCode} lista. Esperando que se una tu amigo.`
            );
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

      this.client.on('message', (topic, payload) => {
        if (topic !== this.myListenTopic) return;
        try {
          const raw = payload.toString();
          const env = JSON.parse(raw) as NetworkMessage & { _s?: number; _sid?: string };
          // Deduplicación: el mismo (sid, seq) no se procesa dos veces
          if (typeof env._s === 'number' && env._sid) {
            if (env._sid !== this.peerSid) {
              this.peerSid = env._sid;
              this.seenSeqs = new Set();
            }
            if (this.seenSeqs.has(env._s)) return;
            this.seenSeqs.add(env._s);
            if (this.seenSeqs.size > 500) {
              const oldest = this.seenSeqs.values().next().value;
              if (oldest !== undefined) this.seenSeqs.delete(oldest);
            }
          }
          const { _s, _sid, ...msg } = env;
          void _s; void _sid;
          console.log('[TrucoNetwork] Mensaje entrante recibido:', msg.type);

          if (msg.type === 'JOIN_ACK') {
            this.hasHandshakeCompleted = true;
            this.stopHandshake();
            this.callbacks.onStatusChange('connected', `¡Conectado con tu amigo ${msg.hostName}!`);
          } else if (msg.type === 'JOIN') {
            this.callbacks.onStatusChange('connected', `¡${msg.playerName} se unió a la mesa!`);
          }

          this.callbacks.onMessage(msg as NetworkMessage);
        } catch (e) {
          console.error('[TrucoNetwork] Error parseando mensaje de red:', e);
        }
      });

      this.client.on('reconnect', () => {
        console.log('[TrucoNetwork] Reconectando socket MQTT...');
        this.callbacks.onStatusChange('connecting', 'Reconectando con la sala...');
      });

      this.client.on('close', () => {
        console.warn('[TrucoNetwork] Socket de red cerrado');
      });

      this.client.on('offline', () => {
        console.warn('[TrucoNetwork] Conexión fuera de línea');
      });

      this.client.on('error', (err) => {
        console.error('[TrucoNetwork] Error de conexión:', err);
        if (this.everConnected) {
          // Ya estábamos en la sala: mqtt.js reintenta solo contra el MISMO broker.
          // Cambiar de broker acá dejaba a los dos jugadores en servidores distintos.
          this.callbacks.onStatusChange('connecting', 'Reconectando con la sala...');
          return;
        }
        // Si falla el broker principal, probar el siguiente broker
        if (this.currentBrokerIdx < BROKERS.length - 1) {
          this.currentBrokerIdx++;
          console.log(`[TrucoNetwork] Intentando con broker alternativo: ${BROKERS[this.currentBrokerIdx]}`);
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
    const envelope = { ...msg, _s: ++this.sendSeq, _sid: this.sessionId };
    this.client!.publish(this.mySendTopic, JSON.stringify(envelope), { qos: 1 });
  }

  private startGuestHandshake(guestName: string) {
    this.stopHandshake();
    const sendJoin = () => {
      if (this.hasHandshakeCompleted) {
        this.stopHandshake();
        return;
      }
      if (this.client && this.client.connected) {
        console.log(`[TrucoNetwork] Enviando saludo JOIN como '${guestName}' (intento ${this.joinAttempts + 1})...`);
        try {
          this.client.publish(
            this.mySendTopic,
            JSON.stringify({ type: 'JOIN', playerName: guestName }),
            { qos: 1 }
          );
        } catch (e) {
          console.warn('[TrucoNetwork] Intento de JOIN fallido:', e);
        }
      }
      this.joinAttempts++;
      // Si el anfitrión no aparece, probar el siguiente broker (el anfitrión puede estar en otro)
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
        this.flushQueue(); // mantiene el orden si había mensajes en espera
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