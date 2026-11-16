import React, { useState, useEffect, useRef } from 'react';
import type { Card as CardType, PlayerId, TrucoLevel, EnvidoType, RoomConfig, RoundState } from '../engine/types';
import { otherPlayer } from '../engine/types';
import { CardFace, CardBack } from './Card';
import { PlayerHandsHoldingCards, OpponentHandsHoldingCards } from './HandsHoldingCards';
import { TableDeck, CutModal } from './TableDeck';
import ScoreSheet, { PhaseDisplay } from './ScoreSheet';
import {
  soundCardPlay,
  soundCall,
  soundTruco,
  soundWinRound,
  soundLoseRound,
  soundMatchWin,
  soundButton,
} from '../engine/audio';
import { dealHands, dealMultiHands } from '../engine/deck';
import {
  compareTrickCards,
  calculateEnvido,
  hasFlor,
  checkRoundWinner,
  evaluateTeamTrick,
  checkTeamRoundWinner,
  canCallEnvido,
  canCallTruco,
  nextTrucoLevel,
  whoGoesFirst,
  envidoQuieroPoints,
  envidoNoQuieroPoints,
  trucoWinPoints,
  faltaEnvidoPoints,
} from '../engine/rules';
import {
  botChooseCard,
  botShouldCallEnvido,
  botRespondEnvido,
  botShouldCallTruco,
  botRespondTruco,
  botPhrase,
} from '../engine/bot';
import type { TrucoNetwork, NetworkMessage } from '../engine/network';

interface GameBoardProps {
  config: RoomConfig;
  network?: TrucoNetwork | null;
  onExit: () => void;
  isDesktop?: boolean;
  onToggleLayout?: () => void;
  initialRoundData?: any;
}

interface PlayedSlot {
  playerCard: CardType | null;
  oppCard: CardType | null;
  winner: PlayerId | 'tie' | null;
}

type PendingCall = {
  type: 'envido' | 'real_envido' | 'falta_envido' | 'truco' | 'retruco' | 'vale4' | 'flor';
  caller: PlayerId;
};

const emptyTricks = (): PlayedSlot[] => [
  { playerCard: null, oppCard: null, winner: null },
  { playerCard: null, oppCard: null, winner: null },
  { playerCard: null, oppCard: null, winner: null },
];

const isEnvidoType = (t: string) => t === 'envido' || t === 'real_envido' || t === 'falta_envido';
const isTrucoType = (t: string) => t === 'truco' || t === 'retruco' || t === 'vale4';

export default function GameBoard({ config, network, onExit, isDesktop = false, onToggleLayout, initialRoundData }: GameBoardProps) {
  const matchType = config.matchType || '1v1';
  const isMulti = matchType === '2v2' || matchType === '3v3';

  const defaultMultiSeats = matchType === '2v2' ? [
    { seatIndex: 0, name: config.playerName || 'Vos', team: 0 as const, avatar: '🤠', isMe: true },
    { seatIndex: 1, name: config.opponentName || 'Rival 1', team: 1 as const, avatar: '😎', isMe: false },
    { seatIndex: 2, name: 'El Chaja (Compañero)', team: 0 as const, avatar: '🤠', isMe: false },
    { seatIndex: 3, name: 'El Zorro (Rival 2)', team: 1 as const, avatar: '😼', isMe: false },
  ] : [
    { seatIndex: 0, name: config.playerName || 'Vos', team: 0 as const, avatar: '🤠', isMe: true },
    { seatIndex: 1, name: config.opponentName || 'Rival 1', team: 1 as const, avatar: '😎', isMe: false },
    { seatIndex: 2, name: 'El Chaja (Compañero 1)', team: 0 as const, avatar: '🤠', isMe: false },
    { seatIndex: 3, name: 'El Zorro (Rival 2)', team: 1 as const, avatar: '😼', isMe: false },
    { seatIndex: 4, name: 'Martín Fierro (Compañero 2)', team: 0 as const, avatar: '🧉', isMe: false },
    { seatIndex: 5, name: 'Don Segundo (Rival 3)', team: 1 as const, avatar: '🐎', isMe: false },
  ];

  // ─── Refs "vivos" ───────────────────────────────────────────────
  // Los timers y los mensajes de red corren mucho después del render que los
  // creó. Si leyeran el estado de React verían valores viejos (mano, turno,
  // puntaje, cartas del bot...) y la partida se trababa tras varias manos.
  // Cada setter de abajo actualiza el ref EN EL ACTO y luego el estado.
  const scoreRef = useRef({ p: 0, o: 0 });
  const turnRef = useRef<PlayerId>('player');
  const manoRef = useRef<PlayerId>('player');
  const pendingCallRef = useRef<PendingCall | null>(null);
  const trucoLevelRef = useRef<TrucoLevel>('none');
  const trucoCallerRef = useRef<PlayerId | null>(null);
  const envidoPlayedRef = useRef(false);
  const firstCardPlayedRef = useRef(false);
  const currentTrickRef = useRef(0);
  const tricksRef = useRef<PlayedSlot[]>(emptyTricks());
  const playerHandRef = useRef<CardType[]>([]);
  const oppHandCardsRef = useRef<CardType[]>([]);
  const roundEndedRef = useRef(false);
  const matchOverRef = useRef(false);
  const remoteEnvidoRef = useRef<number | null>(null);
  const pendingEnvidoRef = useRef<string | null>(null);
  const roundNumRef = useRef(0);
  const lastRoundNumRef = useRef(0);
  const currentTurnSeatRef = useRef(0);
  const manoSeatRef = useRef(0);
  const multiWinnersRef = useRef<(0 | 1 | 'tie')[]>([]);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const speechTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const multiHandsRef = useRef<CardType[][]>([]);
  const multiInitialHandsRef = useRef<CardType[][]>([]);
  const currentTrickPlaysRef = useRef<{
    seatIndex: number;
    team: 0 | 1;
    card: CardType;
    playerName: string;
  }[]>([]);

  const [multiHands, setMultiHandsState] = useState<CardType[][]>([]);
  const setMultiHands = (v: CardType[][]) => { multiHandsRef.current = v; setMultiHandsState(v); };
  const [currentTurnSeat, setCurrentTurnSeatState] = useState(0);
  const setCurrentTurnSeat = (v: number) => { currentTurnSeatRef.current = v; setCurrentTurnSeatState(v); };
  const [, setManoSeatState] = useState(0);
  const setManoSeat = (v: number) => { manoSeatRef.current = v; setManoSeatState(v); };
  const [currentTrickPlays, setCurrentTrickPlaysState] = useState<{
    seatIndex: number;
    team: 0 | 1;
    card: CardType;
    playerName: string;
  }[]>([]);
  const setCurrentTrickPlays = (v: {
    seatIndex: number;
    team: 0 | 1;
    card: CardType;
    playerName: string;
  }[]) => { currentTrickPlaysRef.current = v; setCurrentTrickPlaysState(v); };
  const [, setMultiTrickWinnersState] = useState<(0 | 1 | 'tie')[]>([]);
  const setMultiTrickWinners = (v: (0 | 1 | 'tie')[]) => { multiWinnersRef.current = v; setMultiTrickWinnersState(v); };

  // Score state
  const [scorePlayer, setScorePlayerState] = useState(0);
  const [scoreOpp, setScoreOppState] = useState(0);
  const setScorePlayer = (v: number) => { scoreRef.current.p = v; setScorePlayerState(v); };
  const setScoreOpp = (v: number) => { scoreRef.current.o = v; setScoreOppState(v); };
  const [scoreSheetOpen, setScoreSheetOpen] = useState(false);

  // Round / Hand state
  const [playerHand, setPlayerHandState] = useState<CardType[]>([]);
  const setPlayerHand = (v: CardType[]) => { playerHandRef.current = v; setPlayerHandState(v); };
  const [oppHandCards, setOppHandCardsState] = useState<CardType[]>([]);
  const setOppHandCards = (v: CardType[]) => { oppHandCardsRef.current = v; setOppHandCardsState(v); };
  const [oppCardsCount, setOppCardsCount] = useState(3);
  const [currentTrick, setCurrentTrickState] = useState(0);
  const setCurrentTrick = (v: number) => { currentTrickRef.current = v; setCurrentTrickState(v); };
  const [tricks, setTricksState] = useState<PlayedSlot[]>(emptyTricks);
  const setTricks = (v: PlayedSlot[]) => { tricksRef.current = v; setTricksState(v); };

  // Turn & phase
  const [, setManoState] = useState<PlayerId>('player');
  const setMano = (v: PlayerId) => { manoRef.current = v; setManoState(v); };
  const [turn, setTurnState] = useState<PlayerId>('player');
  const setTurn = (v: PlayerId) => { turnRef.current = v; setTurnState(v); };
  const [pendingCall, setPendingCallState] = useState<PendingCall | null>(null);
  const setPendingCall = (v: PendingCall | null) => { pendingCallRef.current = v; setPendingCallState(v); };

  const [trucoLevel, setTrucoLevelState] = useState<TrucoLevel>('none');
  const setTrucoLevel = (v: TrucoLevel) => { trucoLevelRef.current = v; setTrucoLevelState(v); };
  const [trucoCaller, setTrucoCallerState] = useState<PlayerId | null>(null);
  const setTrucoCaller = (v: PlayerId | null) => { trucoCallerRef.current = v; setTrucoCallerState(v); };
  const [envidoPlayed, setEnvidoPlayedState] = useState(false);
  const setEnvidoPlayed = (v: boolean) => { envidoPlayedRef.current = v; setEnvidoPlayedState(v); };
  const [firstCardPlayed, setFirstCardPlayedState] = useState(false);
  const setFirstCardPlayed = (v: boolean) => { firstCardPlayedRef.current = v; setFirstCardPlayedState(v); };

  // UI speech & alerts
  const [speechText, setSpeechText] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [playerGesture, setPlayerGesture] = useState<string | null>(null);
  const [oppGesture, setOppGesture] = useState<string | null>(null);
  const [matchWinner, setMatchWinner] = useState<PlayerId | null>(null);
  const [isShufflingDeck, setIsShufflingDeck] = useState(false);
  const [cutData, setCutData] = useState<{
    playerCard: CardType;
    oppCard: CardType;
    starterName: string;
  } | null>(null);

  // Sincronización en tiempo real para partidas online y cálculo exacto de tantos
  const initialPlayerHandRef = useRef<CardType[]>([]);
  const initialOppHandRef = useRef<CardType[]>([]);
  const [initialPlayerHand, setInitialPlayerHand] = useState<CardType[]>([]);
  const [initialOppHand, setInitialOppHand] = useState<CardType[]>([]);

  // En pasa-y-juega no se muestran mis cartas mientras le toca al rival
  const hideMyCards = config.mode === 'local' && (pendingCall ? pendingCall.caller === 'player' : turn === 'opponent');

  const myEnvidoPoints = calculateEnvido(initialPlayerHand.length === 3 ? initialPlayerHand : playerHand);

  const handleShuffleAndCut = () => {
    soundButton();
    setIsShufflingDeck(true);
    setTimeout(() => {
      setIsShufflingDeck(false);
      const sample = dealHands();
      const pCard = sample.playerHand[0];
      const oCard = sample.opponentHand[0];
      const pWins = pCard.power >= oCard.power;
      const starter = pWins ? config.playerName : config.opponentName;
      setCutData({
        playerCard: pCard,
        oppCard: oCard,
        starterName: starter,
      });
      // Solo informativo: NO toca el turno (antes podía dejar la mano trabada).
    }, 700);
  };

  // Keyboard Shortcuts for PC Desktop Play
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const key = e.key.toLowerCase();
      const isMyTurn = isMulti ? currentTurnSeat === 0 : turn === 'player';

      // [1], [2], [3] play cards
      if (key === '1' && playerHand.length >= 1 && isMyTurn && !pendingCall) {
        handlePlayCard(0);
      } else if (key === '2' && playerHand.length >= 2 && isMyTurn && !pendingCall) {
        handlePlayCard(1);
      } else if (key === '3' && playerHand.length >= 3 && isMyTurn && !pendingCall) {
        handlePlayCard(2);
      }
      // [E] Envido
      else if (key === 'e' && !envidoPlayed && !firstCardPlayed && currentTrick === 0 && !pendingCall) {
        handlePlayerCall('envido');
      }
      // [T] Truco / Retruco / Vale 4
      else if (key === 't') {
        if (pendingCall && pendingCall.caller === 'opponent' && pendingCall.type === 'truco') {
          handlePlayerCall('retruco');
        } else if (pendingCall && pendingCall.caller === 'opponent' && pendingCall.type === 'retruco') {
          handlePlayerCall('vale4');
        } else if (!pendingCall) {
          if (trucoLevel === 'none') handlePlayerCall('truco');
          else if (trucoLevel === 'truco' && trucoCaller === 'opponent') handlePlayerCall('retruco');
          else if (trucoLevel === 'retruco' && trucoCaller === 'opponent') handlePlayerCall('vale4');
        }
      }
      // [Q] Quiero
      else if (key === 'q' && pendingCall && pendingCall.caller === 'opponent') {
        handleCallResponse('player', 'quiero', pendingCall.type);
      }
      // [N] No Quiero
      else if (key === 'n' && pendingCall && pendingCall.caller === 'opponent') {
        handleCallResponse('player', 'no_quiero', pendingCall.type);
      }
      // [M] Mazo
      else if (key === 'm') {
        handleMazo();
      }
      // [S] ScoreSheet
      else if (key === 's') {
        setScoreSheetOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [playerHand, turn, currentTurnSeat, isMulti, pendingCall, currentTrick, envidoPlayed, firstCardPlayed, trucoLevel, trucoCaller]);

  // Pass & Play curtain state (for local 2-player on same device)
  const isPassAndPlay = config.mode === 'local' && !isMulti;
  const [passPlayCurtain, setPassPlayCurtain] = useState(false);
  const [passPlayFor, setPassPlayFor] = useState<PlayerId>('player');

  const showToast = (msg: string) => {
    setToastMsg(msg);
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastMsg(null), 2500);
  };

  const showSpeech = (text: string) => {
    setSpeechText(text);
    clearTimeout(speechTimerRef.current);
    speechTimerRef.current = setTimeout(() => setSpeechText(null), 2800);
  };

  // ─── Utilidades de partida ─────────────────────────────────────
  // IMPORTANTE: todo lo que corre dentro de timers o mensajes de red lee los
  // refs (siempre actualizados) y NUNCA el estado de un render viejo. Ese era el
  // origen del bug: tras varias manos los closures tenían turno, mano, puntaje y
  // mano del bot de rondas anteriores y la partida quedaba trabada.
  const later = (fn: () => void, ms: number) => {
    const id = setTimeout(fn, ms);
    timersRef.current.push(id);
  };

  /** Suma tantos con los valores reales. Devuelve true si terminó la partida. */
  const addScore = (who: PlayerId, pts: number): boolean => {
    if (matchOverRef.current) return true;
    if (pts <= 0) return false;
    if (who === 'player') setScorePlayer(scoreRef.current.p + pts);
    else setScoreOpp(scoreRef.current.o + pts);
    const { p, o } = scoreRef.current;
    if (p >= config.goal) {
      matchOverRef.current = true;
      soundMatchWin();
      setMatchWinner('player');
      return true;
    }
    if (o >= config.goal) {
      matchOverRef.current = true;
      soundLoseRound();
      setMatchWinner('opponent');
      return true;
    }
    return false;
  };

  const resetMatch = () => {
    matchOverRef.current = false;
    setScorePlayer(0);
    setScoreOpp(0);
    setMatchWinner(null);
  };

  const scheduleNextRound = (delay: number) => {
    if (isMulti) {
      const next = (manoSeatRef.current + 1) % defaultMultiSeats.length;
      later(() => startNewRoundMulti(next), delay);
    } else {
      later(() => startNewRound(otherPlayer(manoRef.current)), delay);
    }
  };

  const clearRoundTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };

  const resetRoundState = () => {
    clearRoundTimers();
    setTricks(emptyTricks());
    setCurrentTrick(0);
    setPendingCall(null);
    setTrucoLevel('none');
    setTrucoCaller(null);
    setEnvidoPlayed(false);
    setFirstCardPlayed(false);
    remoteEnvidoRef.current = null;
    pendingEnvidoRef.current = null;
    roundEndedRef.current = false;
  };

  // ─── Multi-Player (2v2 and 3v3) Game Engine ───────────────────
  const startNewRoundMulti = (nextManoSeat: number) => {
    if (matchOverRef.current) return;
    const seatCount = defaultMultiSeats.length;
    const hands = dealMultiHands(seatCount);
    resetRoundState();
    multiInitialHandsRef.current = hands.map(h => [...h]);
    initialPlayerHandRef.current = hands[0];
    setInitialPlayerHand(hands[0]);
    setPlayerHand(hands[0]);
    setMultiHands(hands);
    setCurrentTrickPlays([]);
    setMultiTrickWinners([]);
    setManoSeat(nextManoSeat);
    setCurrentTurnSeat(nextManoSeat);

    soundWinRound();
    showToast(`¡Nueva mano (${matchType}) repartida para ${seatCount} gauchos!`);

    if (nextManoSeat !== 0) {
      later(() => runMultiBotTurn(nextManoSeat, hands, 0, []), 900);
    }
  };

  const runMultiBotTurn = (
    seatIdx: number,
    curHands: CardType[][],
    trickIdx: number,
    existingPlays: { seatIndex: number; team: 0 | 1; card: CardType; playerName: string }[]
  ) => {
    if (matchOverRef.current || roundEndedRef.current) return;
    if (currentTrickRef.current !== trickIdx) return; // turno viejo
    if (existingPlays.some(p => p.seatIndex === seatIdx)) return; // ya jugó en esta mano

    // Si hay un canto esperando respuesta, el bot espera
    if (pendingCallRef.current) {
      later(() => runMultiBotTurn(seatIdx, curHands, trickIdx, existingPlays), 600);
      return;
    }

    const botHand = curHands[seatIdx];
    if (!botHand || botHand.length === 0) return;

    const cardIndex = Math.floor(Math.random() * botHand.length);
    const card = botHand[cardIndex];
    const newHand = botHand.filter((_, i) => i !== cardIndex);

    const baseHands = multiHandsRef.current.length === defaultMultiSeats.length ? multiHandsRef.current : curHands;
    const updatedHands = [...baseHands];
    updatedHands[seatIdx] = newHand;
    setMultiHands(updatedHands);

    soundCardPlay();
    const seatInfo = defaultMultiSeats[seatIdx];
    const play = {
      seatIndex: seatIdx,
      team: seatInfo.team,
      card,
      playerName: seatInfo.name,
    };
    const updatedPlays = [...existingPlays, play];
    setCurrentTrickPlays(updatedPlays);
    setFirstCardPlayed(true);

    const seatCount = defaultMultiSeats.length;
    if (updatedPlays.length === seatCount) {
      later(() => resolveMultiTrick(updatedPlays, trickIdx, updatedHands), 800);
    } else {
      const nextSeat = (seatIdx + 1) % seatCount;
      setCurrentTurnSeat(nextSeat);
      if (nextSeat !== 0) {
        later(() => runMultiBotTurn(nextSeat, updatedHands, trickIdx, updatedPlays), 900);
      }
    }
  };

  const resolveMultiTrick = (
    plays: { seatIndex: number; team: 0 | 1; card: CardType; playerName: string }[],
    trickIdx: number,
    curHands: CardType[][]
  ) => {
    if (matchOverRef.current || roundEndedRef.current) return;
    if (multiWinnersRef.current.length > trickIdx) return; // ya resuelta

    const result = evaluateTeamTrick(plays);
    const updatedWinners = [...multiWinnersRef.current, result.winnerTeam];
    setMultiTrickWinners(updatedWinners);

    if (result.winnerTeam === 0) {
      soundWinRound();
      showToast(`¡Ganamos la ${trickIdx + 1}ª mano con ${result.winningPlay?.card.label}!`);
    } else if (result.winnerTeam === 1) {
      showToast(`Ellos ganaron la ${trickIdx + 1}ª mano con ${result.winningPlay?.card.label}`);
    } else {
      showToast(`¡Parda en la ${trickIdx + 1}ª mano!`);
    }

    const manoTeam = defaultMultiSeats[manoSeatRef.current].team;
    const roundWinner = checkTeamRoundWinner(updatedWinners, manoTeam);

    if (roundWinner !== null) {
      later(() => finishMultiRound(roundWinner), 1200);
    } else {
      const nextTrickIdx = trickIdx + 1;
      setCurrentTrick(nextTrickIdx);
      setCurrentTrickPlays([]);

      const nextLeader = result.winningPlay && result.winnerTeam !== 'tie'
        ? result.winningPlay.seatIndex
        : manoSeatRef.current;
      setCurrentTurnSeat(nextLeader);

      if (nextLeader !== 0) {
        later(() => runMultiBotTurn(nextLeader, curHands, nextTrickIdx, []), 900);
      }
    }
  };

  const finishMultiRound = (winnerTeam: 0 | 1) => {
    if (roundEndedRef.current || matchOverRef.current) return;
    roundEndedRef.current = true;
    const pts = trucoWinPoints(trucoLevelRef.current);
    const winner: PlayerId = winnerTeam === 0 ? 'player' : 'opponent';

    if (winnerTeam === 0) {
      soundWinRound();
      showToast(`¡Nosotros nos llevamos la mano! (+${pts} tantos)`);
    } else {
      soundLoseRound();
      showToast(`Ellos se llevan la mano (+${pts} tantos)`);
    }

    if (addScore(winner, pts)) return;
    scheduleNextRound(1800);
  };

  // ─── Start a new round (1v1: bot / local / online-anfitrión) ────
  const startNewRound = (nextMano: PlayerId) => {
    if (matchOverRef.current) return;
    // Online: SOLO el anfitrión reparte. El invitado espera el START_ROUND.
    if (config.mode === 'online' && network && !network.isHost) return;

    const { playerHand: pHand, opponentHand: oHand } = dealHands();
    resetRoundState();
    setMano(nextMano);
    setTurn(nextMano);

    initialPlayerHandRef.current = pHand;
    initialOppHandRef.current = oHand;
    setInitialPlayerHand(pHand);
    setInitialOppHand(oHand);

    setPlayerHand(pHand);
    setOppHandCards(oHand);
    setOppCardsCount(3);

    if (config.mode === 'online' && network && network.isHost) {
      roundNumRef.current += 1;
      network.sendMessage({
        type: 'START_ROUND',
        hand: oHand,
        oppHandCount: 3,
        mano: nextMano === 'player' ? 'opponent' : 'player', // perspectiva del invitado
        roundNum: roundNumRef.current,
        hostName: config.playerName,
      });
    }

    if (isPassAndPlay) {
      setPassPlayFor(nextMano);
      setPassPlayCurtain(true);
    } else {
      soundWinRound();
      showToast('¡Nueva mano repartida!');
    }

    // Si el bot es mano, juega primero
    if (config.mode === 'bot' && nextMano === 'opponent') {
      later(() => runBotTurn(), 900);
    }
  };

  /** Invitado: aplica una mano repartida por el anfitrión. */
  const applyGuestRound = (msg: { hand: CardType[]; oppHandCount?: number; mano?: PlayerId; roundNum?: number }) => {
    resetRoundState();
    setPlayerHand(msg.hand);
    setInitialPlayerHand(msg.hand);
    initialPlayerHandRef.current = msg.hand;
    setOppCardsCount(msg.oppHandCount || 3);
    const m: PlayerId = msg.mano || 'player';
    setMano(m);
    setTurn(m);
    lastRoundNumRef.current = msg.roundNum ?? lastRoundNumRef.current + 1;
  };

  // Initialize first round on mount
  useEffect(() => {
    if (isMulti) {
      startNewRoundMulti(0);
      return;
    }
    if (config.mode === 'online' && network && !network.isHost) {
      if (
        initialRoundData &&
        initialRoundData.hand &&
        initialRoundData.hand.length > 0 &&
        (initialRoundData.roundNum ?? 1) > lastRoundNumRef.current
      ) {
        applyGuestRound(initialRoundData);
      }
      // Avisar al anfitrión que el invitado ya montó el tablero
      network.sendMessage({ type: 'GUEST_READY' });
      return;
    }
    startNewRound('player');
  }, [initialRoundData]);

  // Cancelar timers pendientes al salir del tablero
  useEffect(() => {
    return () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
  }, []);

  // ─── Network Message Listener ──────────────────────────────────
  const handleNetMsg = (msg: NetworkMessage) => {
    switch (msg.type) {
      case 'START_ROUND': {
        if (network?.isHost) break;
        // Descarta duplicados (MQTT puede entregar un mensaje dos veces)
        if ((msg.roundNum ?? 0) <= lastRoundNumRef.current) break;
        applyGuestRound(msg);
        soundWinRound();
        showToast('¡Nueva mano! Repartió ' + (msg.hostName || config.opponentName));
        break;
      }
      case 'ENVIDO_POINTS': {
        remoteEnvidoRef.current = msg.points;
        if (pendingEnvidoRef.current) {
          const callType = pendingEnvidoRef.current;
          pendingEnvidoRef.current = null;
          settleEnvido(callType, myEnvidoNow(), msg.points);
        }
        break;
      }
      case 'HOST_START_MATCH': {
        if (!network?.isHost) network?.sendMessage({ type: 'GUEST_READY' });
        break;
      }
      case 'PLAY_CARD': {
        if (matchOverRef.current) break;
        if (applyOpponentCard(msg.card, msg.trickIndex)) {
          soundCardPlay();
          setOppCardsCount(prev => Math.max(0, prev - 1));
        }
        break;
      }
      case 'CALL': {
        if (matchOverRef.current || roundEndedRef.current) break;
        const pend = pendingCallRef.current;
        if (pend && pend.caller === 'opponent' && pend.type === msg.call) break; // duplicado
        // Subir un canto de truco = aceptar implícitamente el anterior
        if (pend && pend.caller === 'player' && isTrucoType(pend.type) && isTrucoType(msg.call)) {
          setTrucoLevel(pend.type as TrucoLevel);
          setTrucoCaller('player');
        }
        soundTruco();
        setPendingCall({ type: msg.call, caller: 'opponent' });
        showSpeech(`¡${msg.call.toUpperCase().replace('_', ' ')}!`);
        break;
      }
      case 'RESPONSE': {
        const pend = pendingCallRef.current;
        // Solo vale si yo tengo un canto esperando esa respuesta (evita duplicados)
        if (!pend || pend.caller !== 'player' || pend.type !== msg.toCall) break;
        handleCallResponse('opponent', msg.resp, msg.toCall);
        break;
      }
      case 'GO_MAZO': {
        if (roundEndedRef.current || matchOverRef.current) break;
        showToast(`${config.opponentName} se fue al mazo`);
        awardTrucoTo('player');
        break;
      }
      case 'SENA': {
        const gesture = msg.gesture || msg.sena?.match(/[\p{Emoji}\u200d]+/gu)?.[0] || '😉';
        setOppGesture(gesture);
        setTimeout(() => setOppGesture(null), 2500);
        break;
      }
      case 'CHAT': {
        showSpeech(msg.text);
        break;
      }
      case 'GUEST_READY': {
        if (network?.isHost) {
          if (initialOppHandRef.current.length === 3) {
            // Reenvía la mano actual; el invitado ignora si ya la tiene (mismo roundNum)
            network.sendMessage({
              type: 'START_ROUND',
              hand: initialOppHandRef.current,
              oppHandCount: 3,
              mano: manoRef.current === 'player' ? 'opponent' : 'player',
              roundNum: roundNumRef.current,
              hostName: config.playerName,
            });
          } else {
            startNewRound('player');
          }
        }
        break;
      }
      case 'JOIN': {
        if (network?.isHost) {
          network.sendMessage({
            type: 'JOIN_ACK',
            hostName: config.playerName || 'Anfitrión',
            goal: config.goal,
            withFlor: config.withFlor,
          });
        }
        break;
      }
      case 'REVANCHE': {
        resetMatch();
        if (network?.isHost) startNewRound('player');
        break;
      }
      default:
        break;
    }
  };

  // Se re-registra en cada render, y además todo lo que lee son refs.
  useEffect(() => {
    if (config.mode !== 'online' || !network) return;
    network.setMessageCallback(handleNetMsg);
  });

  // ─── Playing a card ─────────────────────────────────────────────
  const handlePlayCard = (index: number) => {
    if (matchOverRef.current || roundEndedRef.current) return;

    if (isMulti) {
      if (currentTurnSeatRef.current !== 0 || pendingCallRef.current !== null || currentTrickRef.current >= 3) return;
      if (currentTrickPlaysRef.current.some(p => p.seatIndex === 0)) return;
      const card = playerHandRef.current[index];
      if (!card) return;
      soundCardPlay();
      const newHand = playerHandRef.current.filter((_, i) => i !== index);
      setPlayerHand(newHand);
      const updatedHands = [...multiHandsRef.current];
      updatedHands[0] = newHand;
      setMultiHands(updatedHands);
      setFirstCardPlayed(true);

      const trickIdx = currentTrickRef.current;
      const play = {
        seatIndex: 0,
        team: 0 as const,
        card,
        playerName: config.playerName || 'Vos',
      };
      const updatedPlays = [...currentTrickPlaysRef.current, play];
      setCurrentTrickPlays(updatedPlays);

      const seatCount = defaultMultiSeats.length;
      if (updatedPlays.length === seatCount) {
        setCurrentTurnSeat(-1); // nadie juega mientras se resuelve la mano
        later(() => resolveMultiTrick(updatedPlays, trickIdx, updatedHands), 800);
      } else {
        const nextSeat = 1;
        setCurrentTurnSeat(nextSeat);
        later(() => runMultiBotTurn(nextSeat, updatedHands, trickIdx, updatedPlays), 900);
      }
      return;
    }

    if (turnRef.current !== 'player' || pendingCallRef.current !== null || currentTrickRef.current >= 3) return;

    const trickIdx = currentTrickRef.current;
    const card = playerHandRef.current[index];
    if (!card) return;
    // Evita tirar dos cartas en la misma mano (doble toque)
    if (tricksRef.current[trickIdx].playerCard !== null) return;

    soundCardPlay();
    const newHand = playerHandRef.current.filter((_, i) => i !== index);
    setPlayerHand(newHand);
    setFirstCardPlayed(true);

    // Record on table
    const updated = [...tricksRef.current];
    updated[trickIdx] = { ...updated[trickIdx], playerCard: card };
    setTricks(updated);

    if (config.mode === 'online' && network) {
      network.sendMessage({ type: 'PLAY_CARD', card, trickIndex: trickIdx });
    }

    if (updated[trickIdx].oppCard !== null) {
      resolveTrick(updated, trickIdx);
    } else {
      setTurn('opponent');
      if (config.mode === 'bot') {
        later(() => runBotTurn(), 800);
      } else if (isPassAndPlay) {
        setPassPlayFor('opponent');
        setPassPlayCurtain(true);
      }
    }
  };

  /** Carta del rival (bot, red o pasa-y-juega). Devuelve false si se ignoró. */
  const applyOpponentCard = (card: CardType, trickIdx: number): boolean => {
    if (trickIdx < 0 || trickIdx > 2 || matchOverRef.current || roundEndedRef.current) return false;
    const base = tricksRef.current;
    if (base[trickIdx].oppCard !== null) return false; // duplicado

    const updated = [...base];
    updated[trickIdx] = { ...updated[trickIdx], oppCard: card };
    setTricks(updated);
    setFirstCardPlayed(true);

    if (updated[trickIdx].playerCard !== null) {
      later(() => resolveTrick(tricksRef.current, trickIdx), 400);
    } else {
      setTurn('player');
      if (isPassAndPlay) {
        setPassPlayFor('player');
        setPassPlayCurtain(true);
      }
    }
    return true;
  };

  /** Pasa-y-juega: el rival tira una carta de su mano. */
  const handlePlayCardOpp = (index: number) => {
    if (!isPassAndPlay || matchOverRef.current || roundEndedRef.current) return;
    if (turnRef.current !== 'opponent' || pendingCallRef.current !== null || currentTrickRef.current >= 3) return;
    const trickIdx = currentTrickRef.current;
    if (tricksRef.current[trickIdx].oppCard !== null) return;
    const card = oppHandCardsRef.current[index];
    if (!card) return;
    const newHand = oppHandCardsRef.current.filter((_, i) => i !== index);
    setOppHandCards(newHand);
    setOppCardsCount(newHand.length);
    soundCardPlay();
    applyOpponentCard(card, trickIdx);
  };

  // ─── Resolve Trick ──────────────────────────────────────────────
  const resolveTrick = (currentTricks: PlayedSlot[], trickIdx: number) => {
    if (matchOverRef.current || roundEndedRef.current) return;
    const slot = currentTricks[trickIdx];
    if (!slot || !slot.playerCard || !slot.oppCard || slot.winner !== null) return;

    const winner = compareTrickCards(slot.playerCard, slot.oppCard);
    const updated = [...currentTricks];
    updated[trickIdx] = { ...slot, winner };
    setTricks(updated);

    if (winner === 'player') {
      showToast(`¡Ganaste la ${trickIdx + 1}ª mano!`);
    } else if (winner === 'opponent') {
      showToast(`${config.opponentName} ganó la ${trickIdx + 1}ª mano`);
    } else {
      showToast(`¡Parda en la ${trickIdx + 1}ª mano!`);
    }

    // Check if round winner is decided
    const convertedTricks = updated.map(t => ({
      cards: [],
      winner: t.winner,
    }));
    const roundWinner = checkRoundWinner(convertedTricks, manoRef.current);

    if (roundWinner !== null) {
      later(() => finishRound(roundWinner), 1000);
    } else {
      // Next trick
      const nextTrickIdx = trickIdx + 1;
      setCurrentTrick(nextTrickIdx);

      // Winner of previous trick leads next (en parda abre el mano)
      const nextLeader: PlayerId = winner === 'tie' ? manoRef.current : winner;
      setTurn(nextLeader);

      if (nextLeader === 'opponent') {
        if (config.mode === 'bot') {
          later(() => runBotTurn(), 900);
        } else if (isPassAndPlay) {
          setPassPlayFor('opponent');
          setPassPlayCurtain(true);
        }
      } else if (isPassAndPlay && nextLeader === 'player') {
        setPassPlayFor('player');
        setPassPlayCurtain(true);
      }
    }
  };

  // ─── Finish Round ───────────────────────────────────────────────
  const finishRound = (roundWinner: PlayerId) => {
    if (roundEndedRef.current || matchOverRef.current) return;
    roundEndedRef.current = true;
    const pts = trucoWinPoints(trucoLevelRef.current);

    if (roundWinner === 'player') {
      soundWinRound();
      showToast(`¡Ganaste la mano! (+${pts} tantos)`);
    } else {
      soundLoseRound();
      showToast(`${config.opponentName} se lleva la mano (+${pts} tantos)`);
    }

    if (addScore(roundWinner, pts)) return;
    scheduleNextRound(1800);
  };

  // ─── Award Truco points on Mazo or Rejection ─────────────────────
  // Al rechazar (o irse al mazo) se pagan los puntos del truco YA aceptado:
  // nada → 1, truco → 2, retruco → 3, vale cuatro → 4 (antes pagaba de menos).
  const awardTrucoTo = (winner: PlayerId) => {
    if (roundEndedRef.current || matchOverRef.current) return;
    roundEndedRef.current = true;
    const pts = trucoWinPoints(trucoLevelRef.current);

    if (winner === 'player') {
      showToast(`¡Ganaste los puntos de la mano! (+${pts} tantos)`);
    } else {
      showToast(`${config.opponentName} sumó ${pts} tantos`);
    }

    if (addScore(winner, pts)) return;
    scheduleNextRound(1500);
  };

  // ─── Bot Turn Logic ─────────────────────────────────────────────
  const runBotTurn = () => {
    if (config.mode !== 'bot' || matchOverRef.current || roundEndedRef.current) return;
    // Idempotente: si ya no es su turno, tiene un canto pendiente o ya jugó, no hace nada
    if (turnRef.current !== 'opponent' || pendingCallRef.current !== null) return;
    const trickIdx = currentTrickRef.current;
    if (trickIdx > 2) return;
    if (tricksRef.current[trickIdx].oppCard !== null) return;

    const botHand = oppHandCardsRef.current;
    if (botHand.length === 0) return;
    const curPlayerHand = playerHandRef.current;

    const roundView = (): RoundState => ({
      playerHand: curPlayerHand,
      opponentHand: botHand,
      tricks: [],
      currentTrick: trickIdx,
      mano: manoRef.current,
      trucoLevel: trucoLevelRef.current,
      trucoCaller: trucoCallerRef.current,
      envidoPlayed: envidoPlayedRef.current,
      firstCardPlayed: firstCardPlayedRef.current,
    });

    const { p: scoreP, o: scoreO } = scoreRef.current;

    // 1. Should bot call Envido?
    if (!envidoPlayedRef.current && !firstCardPlayedRef.current && trickIdx === 0 &&
        botShouldCallEnvido(botHand, roundView(), scoreO, scoreP)) {
      soundCall();
      setPendingCall({ type: 'envido', caller: 'opponent' });
      showSpeech(botPhrase('envido'));
      return;
    }

    // 2. Should bot call Truco?
    if (canCallTruco(roundView(), 'opponent') && botShouldCallTruco(botHand, roundView(), scoreO, scoreP)) {
      const nextLevel = nextTrucoLevel(trucoLevelRef.current);
      if (nextLevel && nextLevel !== 'none') {
        soundTruco();
        setPendingCall({ type: nextLevel, caller: 'opponent' });
        showSpeech(botPhrase(nextLevel as any));
        return;
      }
    }

    // 3. Play card
    const botTricks = tricksRef.current.map(t => ({
      cards: [
        ...(t.playerCard ? [{ player: 'player' as PlayerId, card: t.playerCard }] : []),
        ...(t.oppCard ? [{ player: 'opponent' as PlayerId, card: t.oppCard }] : []),
      ],
      winner: t.winner,
    }));
    const cardIdx = botChooseCard(botHand, { ...roundView(), tricks: botTricks });

    const botCard = botHand[cardIdx];
    if (!botCard) return;
    const newOppHand = botHand.filter((_, i) => i !== cardIdx);
    setOppHandCards(newOppHand);
    setOppCardsCount(newOppHand.length);
    soundCardPlay();
    applyOpponentCard(botCard, trickIdx);
  };

  /** Si el bot tiene que seguir jugando después de resolver un canto, lo reanuda. */
  const resumeBotIfNeeded = () => {
    if (isMulti) return;
    if (config.mode === 'bot' && turnRef.current === 'opponent') {
      later(() => runBotTurn(), 900);
    }
  };

  // ─── Call Handlers (Envido, Truco, Mazo) ─────────────────────────
  const handlePlayerCall = (
    callType: 'envido' | 'real_envido' | 'falta_envido' | 'truco' | 'retruco' | 'vale4',
    who: PlayerId = 'player'
  ) => {
    if (matchOverRef.current || roundEndedRef.current) return;
    const other = otherPlayer(who);
    const pend = pendingCallRef.current;
    if (pend && pend.caller === who) return; // ya hay un canto mío esperando respuesta
    if (isEnvidoType(callType) && envidoPlayedRef.current) return;

    // Subir un truco pendiente del rival = aceptar implícitamente el anterior
    if (pend && pend.caller === other && isTrucoType(pend.type) && isTrucoType(callType)) {
      setTrucoLevel(pend.type as TrucoLevel);
      setTrucoCaller(other);
    }

    soundTruco();
    setPendingCall({ type: callType, caller: who });

    if (who === 'player') {
      if (config.mode === 'online' && network) {
        network.sendMessage({ type: 'CALL', call: callType });
      } else if (config.mode === 'bot' || isMulti) {
        later(() => botRespondToCall(callType), 1000);
      } else if (isPassAndPlay) {
        setPassPlayFor('opponent');
        setPassPlayCurtain(true);
      }
    } else if (isPassAndPlay) {
      setPassPlayFor('player');
      setPassPlayCurtain(true);
    }
  };

  const botRespondToCall = (callType: string) => {
    if (matchOverRef.current || roundEndedRef.current) return;
    const pend = pendingCallRef.current;
    if (!pend || pend.caller !== 'player' || pend.type !== callType) return; // ya no corresponde

    const { p: scoreP, o: scoreO } = scoreRef.current;

    const getMultiTeamBestEnvidoHand = (team: 0 | 1): CardType[] => {
      const hands = multiInitialHandsRef.current.filter((_, idx) => idx % 2 === team && _.length > 0);
      if (hands.length === 0) return [];
      return hands.reduce((best, h) => (calculateEnvido(h) > calculateEnvido(best) ? h : best), hands[0]);
    };
    const getMultiTeamBestHand = (team: 0 | 1): CardType[] => {
      const hands = multiHandsRef.current.filter((_, idx) => idx % 2 === team && _.length > 0);
      if (hands.length === 0) return [];
      const maxPower = (h: CardType[]) => Math.max(...h.map(c => c.power));
      return hands.reduce((best, h) => (maxPower(h) > maxPower(best) ? h : best), hands[0]);
    };

    if (isEnvidoType(callType)) {
      const botEnvidoHand = isMulti
        ? getMultiTeamBestEnvidoHand(1)
        : (initialOppHandRef.current.length === 3 ? initialOppHandRef.current : oppHandCardsRef.current);
      const resp = botRespondEnvido(botEnvidoHand, callType, scoreO, scoreP, config.goal);
      showSpeech(botPhrase(resp));
      handleCallResponse('opponent', resp, callType);
    } else {
      const botTrucoHand = isMulti ? getMultiTeamBestHand(1) : oppHandCardsRef.current;
      const resp = botRespondTruco(botTrucoHand, callType as TrucoLevel, {
        playerHand: playerHandRef.current,
        opponentHand: botTrucoHand,
        tricks: [],
        currentTrick: currentTrickRef.current,
        mano: manoRef.current,
        trucoLevel: trucoLevelRef.current,
        trucoCaller: trucoCallerRef.current,
        envidoPlayed: envidoPlayedRef.current,
        firstCardPlayed: firstCardPlayedRef.current,
      }, scoreO, scoreP);

      showSpeech(botPhrase(resp));
      if (resp === 'retruco' || resp === 'vale4') {
        // Subir = aceptar el canto del jugador
        setTrucoLevel(callType as TrucoLevel);
        setTrucoCaller('player');
        setPendingCall({ type: resp, caller: 'opponent' });
      } else {
        handleCallResponse('opponent', resp, callType);
      }
    }
  };

  // ─── Envido ─────────────────────────────────────────────────────
  const myEnvidoNow = () =>
    calculateEnvido(
      initialPlayerHandRef.current.length === 3 ? initialPlayerHandRef.current : playerHandRef.current
    );

  /** Reparte los tantos del envido cuando ya se conocen los puntos de ambos. */
  const settleEnvido = (callType: string, pEnvido: number, oEnvido: number) => {
    remoteEnvidoRef.current = null;
    const isPlayerMano = manoRef.current === 'player';
    const playerWins = pEnvido > oEnvido || (pEnvido === oEnvido && isPlayerMano);

    let pts = envidoQuieroPoints(callType);
    if (callType === 'falta_envido') {
      const { p, o } = scoreRef.current;
      pts = playerWins ? faltaEnvidoPoints(p, o, config.goal) : faltaEnvidoPoints(o, p, config.goal);
    }

    // Los tantos se suman YA (con refs); solo los mensajes se muestran con demora
    const ended = addScore(playerWins ? 'player' : 'opponent', pts);

    if (isPlayerMano) {
      showToast(`Vos (Mano): ¡${pEnvido} de Envido!`);
      later(() => {
        if (playerWins) {
          showSpeech(`¡Son buenas! (Tengo ${oEnvido})`);
          showToast(`¡Ganaste el Envido (${pEnvido} a ${oEnvido})! (+${pts} tantos)`);
          soundWinRound();
        } else {
          showSpeech(`¡${oEnvido} son mejores!`);
          showToast(`${config.opponentName} ganó el Envido con ${oEnvido} tantos (+${pts})`);
        }
      }, 1100);
    } else {
      showSpeech(`¡${oEnvido} de Envido!`);
      later(() => {
        if (playerWins) {
          showToast(`¡${pEnvido} son mejores! Ganaste el Envido (+${pts} tantos)`);
          soundWinRound();
        } else {
          showToast(`Son buenas (${config.opponentName} se lleva ${pts} tantos)`);
        }
      }, 1100);
    }
    return ended;
  };

  const resolveEnvidoQuiero = (callType: string) => {
    if (isMulti) {
      const team0Hands = multiInitialHandsRef.current.filter((_, idx) => idx % 2 === 0 && _.length > 0);
      const team1Hands = multiInitialHandsRef.current.filter((_, idx) => idx % 2 === 1 && _.length > 0);
      const team0Pts = team0Hands.length ? Math.max(...team0Hands.map(calculateEnvido)) : myEnvidoNow();
      const team1Pts = team1Hands.length ? Math.max(...team1Hands.map(calculateEnvido)) : 0;
      settleEnvido(callType, team0Pts, team1Pts);
      return;
    }
    const myPts = myEnvidoNow();
    if (config.mode === 'online' && network) {
      // Cada lado manda sus puntos y espera los del otro: así no importa quién llegue primero
      network.sendMessage({ type: 'ENVIDO_POINTS', points: myPts });
      if (remoteEnvidoRef.current === null) {
        pendingEnvidoRef.current = callType;
        return;
      }
      settleEnvido(callType, myPts, remoteEnvidoRef.current);
      return;
    }
    const oppPts = calculateEnvido(
      initialOppHandRef.current.length === 3 ? initialOppHandRef.current : oppHandCardsRef.current
    );
    settleEnvido(callType, myPts, oppPts);
  };

  // ─── Resolve Call Response (Quiero / No Quiero) ───────────────────
  const handleCallResponse = (responder: PlayerId, resp: 'quiero' | 'no_quiero', callType: string) => {
    if (matchOverRef.current || roundEndedRef.current) return;
    const caller: PlayerId = otherPlayer(responder);

    if (config.mode === 'online' && network && responder === 'player') {
      network.sendMessage({ type: 'RESPONSE', resp, toCall: callType });
    }

    setPendingCall(null);

    // 1. Envido Resolution
    if (isEnvidoType(callType)) {
      setEnvidoPlayed(true);
      if (resp === 'no_quiero') {
        const pts = envidoNoQuieroPoints(callType);
        if (caller === 'player') {
          showToast(`¡Ganaste el Envido! (+${pts} tantos)`);
        } else {
          showToast(`${config.opponentName} sumó ${pts} tantos de Envido`);
        }
        if (addScore(caller, pts)) return;
      } else {
        resolveEnvidoQuiero(callType);
        if (matchOverRef.current) return;
      }
    }

    // 2. Truco Resolution
    if (isTrucoType(callType)) {
      if (resp === 'no_quiero') {
        awardTrucoTo(caller);
        return;
      }
      setTrucoLevel(callType as TrucoLevel);
      setTrucoCaller(caller);
      showToast(`¡${callType.toUpperCase()} aceptado!`);
    }

    // 3. Seguir jugando: el bot retoma su turno / se pasa el celu en modo local
    if (isPassAndPlay && responder !== turnRef.current) {
      setPassPlayFor(turnRef.current);
      setPassPlayCurtain(true);
    }
    resumeBotIfNeeded();
  };

  const handleMazo = (who: PlayerId = 'player') => {
    if (matchOverRef.current || roundEndedRef.current) return;
    soundButton();
    if (who === 'player') {
      showToast('Te fuiste al mazo');
      if (config.mode === 'online' && network) {
        network.sendMessage({ type: 'GO_MAZO' });
      }
    } else {
      showToast(`${config.opponentName} se fue al mazo`);
    }
    awardTrucoTo(otherPlayer(who));
  };

  const handleSendSena = (gesture: string) => {
    soundButton();
    setPlayerGesture(gesture);
    setTimeout(() => setPlayerGesture(null), 2500);

    if (isMulti) {
      setTimeout(() => {
        setOppGesture('😉');
        setTimeout(() => setOppGesture(null), 2200);
      }, 900);
      return;
    }

    if (config.mode === 'online' && network) {
      network.sendMessage({ type: 'SENA', sena: gesture, gesture });
    }
  };

  const handleSendChat = (text: string) => {
    soundButton();
    showSpeech(text);
    if (config.mode === 'online' && network) {
      network.sendMessage({ type: 'CHAT', text, from: config.playerName });
    }
  };

  return (
    <div className={`game-layout-wrapper ${isDesktop ? 'desktop-board-layout' : ''}`}>
      {/* Desktop Matchstick Sidebar */}
      {isDesktop && (
        <aside className="desktop-scoreboard-sidebar">
          <div className="desktop-scoreboard-header">
            <div className="home-badge" style={{ marginBottom: 6 }}>🇦🇷 ANOTADOR ARGENTINO</div>
            <h3>Fósforos en Vivo</h3>
            <span className="desktop-goal-text">Partida {matchType} a {config.goal} tantos</span>
          </div>

          <div className="desktop-stick-cols">
            <div className="desktop-stick-col">
              <div className="desktop-stick-name">{isMulti ? 'Nosotros' : config.playerName}</div>
              <div className="desktop-stick-pts">{scorePlayer}</div>
              <PhaseDisplay
                label={config.goal === 30 ? 'Malas' : 'Tantos'}
                score={Math.min(scorePlayer, 15)}
                max={15}
                active={true}
              />
              {config.goal === 30 && (
                <PhaseDisplay
                  label="Buenas"
                  score={Math.max(0, scorePlayer - 15)}
                  max={15}
                  active={scorePlayer >= 15}
                />
              )}
            </div>

            <div className="desktop-stick-divider" />

            <div className="desktop-stick-col">
              <div className="desktop-stick-name">{isMulti ? 'Ellos' : config.opponentName}</div>
              <div className="desktop-stick-pts">{scoreOpp}</div>
              <PhaseDisplay
                label={config.goal === 30 ? 'Malas' : 'Tantos'}
                score={Math.min(scoreOpp, 15)}
                max={15}
                active={true}
              />
              {config.goal === 30 && (
                <PhaseDisplay
                  label="Buenas"
                  score={Math.max(0, scoreOpp - 15)}
                  max={15}
                  active={scoreOpp >= 15}
                />
              )}
            </div>
          </div>

          <div className="desktop-shortcuts-guide">
            <h5>⌨️ Atajos de Teclado PC</h5>
            <div className="shortcut-row"><span>Tirar carta:</span> <b>[1] [2] [3]</b></div>
            <div className="shortcut-row"><span>Cantar Truco:</span> <b>[T]</b></div>
            <div className="shortcut-row"><span>Cantar Envido:</span> <b>[E]</b></div>
            <div className="shortcut-row"><span>Quiero / No Quiero:</span> <b>[Q] / [N]</b></div>
            <div className="shortcut-row"><span>Irse al Mazo:</span> <b>[M]</b></div>
          </div>
        </aside>
      )}

      {/* Main Table */}
      <div className="game-table-container wooden-table">
        {/* Top HUD */}
        <div className="game-hud">
          <div className="anotador-mini" onClick={() => setScoreSheetOpen(true)}>
            <div className="score-team">
              <span className="team-lbl">{isMulti ? 'Nosotros' : config.playerName}</span>
              <span className="team-pts">{scorePlayer}</span>
            </div>
            <div className="score-divider"></div>
            <div className="score-team">
              <span className="team-lbl">{isMulti ? 'Ellos' : config.opponentName}</span>
              <span className="team-pts">{scoreOpp}</span>
            </div>
            <span style={{ fontSize: 13, color: 'var(--gold)' }}>📋</span>
          </div>

          <div className="round-info-pill">
            Mano {currentTrick + 1} • {matchType.toUpperCase()} • A {config.goal} pts {trucoLevel !== 'none' && `• ${trucoLevel.toUpperCase()}`}
          </div>

          <div className="hud-actions-right">
            {onToggleLayout && (
              <button
                className="btn-layout-toggle"
                onClick={onToggleLayout}
                title={isDesktop ? "Cambiar a vista celular" : "Cambiar a vista pantalla completa PC"}
              >
                {isDesktop ? "📱 Vista Móvil" : "🖥️ Vista PC"}
              </button>
            )}
            <button className="btn-game-menu" onClick={onExit} title="Salir al menú">
              ✕
            </button>
          </div>
        </div>

        {/* Center Felt / Table Area */}
        {isMulti ? (
          <div className="table-felt-multi">
            {speechText && <div className="speech-bubble active" style={{ top: 20 }}>{speechText}</div>}

            {/* Top Row: Partner (in 2v2) or Partners/Rivals (in 3v3) */}
            <div className="table-row-top">
              {matchType === '2v2' ? (
                <div className={`seat-chip team-0 ${currentTurnSeat === 2 ? 'current-turn' : ''}`}>
                  <span className="seat-avatar">🤠</span>
                  <span className="seat-name">El Chaja (Compañero)</span>
                  <span className="seat-card-count">🃏 {multiHands[2]?.length ?? 3}</span>
                  {currentTurnSeat === 2 && <span className="turn-indicator-pulse"></span>}
                </div>
              ) : (
                <>
                  <div className={`seat-chip team-0 ${currentTurnSeat === 2 ? 'current-turn' : ''}`}>
                    <span className="seat-avatar">🤠</span>
                    <span className="seat-name">El Chaja (Compañero 1)</span>
                    <span className="seat-card-count">🃏 {multiHands[2]?.length ?? 3}</span>
                    {currentTurnSeat === 2 && <span className="turn-indicator-pulse"></span>}
                  </div>
                  <div className={`seat-chip team-1 ${currentTurnSeat === 3 ? 'current-turn' : ''}`}>
                    <span className="seat-avatar">😼</span>
                    <span className="seat-name">El Zorro (Rival 2)</span>
                    <span className="seat-card-count">🃏 {multiHands[3]?.length ?? 3}</span>
                    {currentTurnSeat === 3 && <span className="turn-indicator-pulse"></span>}
                  </div>
                  <div className={`seat-chip team-0 ${currentTurnSeat === 4 ? 'current-turn' : ''}`}>
                    <span className="seat-avatar">🧉</span>
                    <span className="seat-name">Martín Fierro (Compañero 2)</span>
                    <span className="seat-card-count">🃏 {multiHands[4]?.length ?? 3}</span>
                    {currentTurnSeat === 4 && <span className="turn-indicator-pulse"></span>}
                  </div>
                </>
              )}
            </div>

            {/* Middle Row: Left Rival, Center Cards, Right Rival */}
            <div className="table-row-middle">
              <div className={`seat-chip team-1 ${currentTurnSeat === 1 ? 'current-turn' : ''}`}>
                <span className="seat-avatar">😎</span>
                <span className="seat-name">{config.opponentName || 'Rival 1'}</span>
                <span className="seat-card-count">🃏 {multiHands[1]?.length ?? 3}</span>
                {currentTurnSeat === 1 && <span className="turn-indicator-pulse"></span>}
              </div>

              {/* Cards played in this trick */}
              <div className="table-center-felt-cards">
                {currentTrickPlays.length === 0 ? (
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>
                    Mesa {currentTrick + 1}ª Mano ({matchType})
                  </span>
                ) : (
                  currentTrickPlays.map((p, idx) => (
                    <div key={idx} className="multi-played-card">
                      <span className={`card-owner-tag team-${p.team}`}>
                        {p.playerName.split(' ')[0]}
                      </span>
                      <CardFace card={p.card} small disabled />
                    </div>
                  ))
                )}
              </div>

              <div className={`seat-chip team-1 ${currentTurnSeat === (matchType === '2v2' ? 3 : 5) ? 'current-turn' : ''}`}>
                <span className="seat-avatar">🐎</span>
                <span className="seat-name">{matchType === '2v2' ? 'El Zorro' : 'Don Segundo'}</span>
                <span className="seat-card-count">🃏 {multiHands[matchType === '2v2' ? 3 : 5]?.length ?? 3}</span>
                {currentTurnSeat === (matchType === '2v2' ? 3 : 5) && <span className="turn-indicator-pulse"></span>}
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Opponent Area con Manos sosteniendo cartas */}
            <div className="opponent-area">
              <OpponentHandsHoldingCards
                cardsCount={oppCardsCount}
                isTurn={turn === 'opponent'}
                name={config.opponentName}
                avatar={config.mode === 'bot' ? '🤠' : '😎'}
              />

              {/* Floating Gesture Pop for Opponent (SOLO el gesto, sin palabra) */}
              {oppGesture && (
                <div className="floating-gesture-bubble opp-gesture-pop">
                  {oppGesture}
                </div>
              )}

              {/* Speech Balloon */}
              {speechText && <div className="speech-bubble active">{speechText}</div>}
            </div>

            {/* The Felt Table (Center - Tapete verde embutido en madera) */}
            <div className="felt-center wood-table-felt-inset">
              <div className="table-center-layout">
                {/* Mazo al costado para mezclar / cortar y ver quién arranca */}
                <TableDeck onShuffleAndCut={handleShuffleAndCut} isShuffling={isShufflingDeck} />

                <div className="trick-slots-container">
                  {tricks.map((trick, idx) => (
                    <div key={idx} className="trick-column">
                      <span className="trick-label">{idx + 1}ª</span>
                      <div className="trick-slot-opp">
                        {trick.oppCard && <CardFace card={trick.oppCard} small disabled />}
                      </div>
                      <div className="trick-slot-me">
                        {trick.playerCard && <CardFace card={trick.playerCard} small disabled />}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Player Area (Bottom) */}
        <div className="player-area">
          {/* Floating Gesture Pop for Player (SOLO el gesto, sin palabra) */}
          {playerGesture && (
            <div className="floating-gesture-bubble player-gesture-pop">
              {playerGesture}
            </div>
          )}

          {/* Identificación del Jugador con su Nombre y Turno visible en la mesa */}
          <div className="player-badge-container">
            <div className={`player-badge ${(isMulti ? currentTurnSeat === 0 : turn === 'player') ? 'player-turn-active' : ''}`} aria-label={`Jugador: ${config.playerName}`}>
              <span className="player-avatar">🤠</span>
              <span className="player-name">{config.playerName || 'Vos'}</span>
              {(isMulti ? currentTurnSeat === 0 : turn === 'player') && <span className="turn-indicator-pulse" title="Es tu turno de jugar"></span>}
            </div>
          </div>

          {/* Callouts Bar */}
          <div className="player-callouts-bar">
            {pendingCall && pendingCall.caller === 'opponent' ? (
              <>
                <button
                  className="btn-callout quiero-action"
                  onClick={() => handleCallResponse('player', 'quiero', pendingCall.type)}
                >
                  <span>
                    ¡Quiero! {pendingCall.type.includes('envido') && `(${myEnvidoPoints} pts)`}
                  </span> {isDesktop && <kbd className="btn-kbd">Q</kbd>}
                </button>
                <button
                  className="btn-callout no-quiero-action"
                  onClick={() => handleCallResponse('player', 'no_quiero', pendingCall.type)}
                >
                  <span>No Quiero</span> {isDesktop && <kbd className="btn-kbd">N</kbd>}
                </button>
                {pendingCall.type === 'truco' && (
                  <button
                    className="btn-callout truco-action"
                    onClick={() => handlePlayerCall('retruco')}
                  >
                    <span>¡Retruco!</span> {isDesktop && <kbd className="btn-kbd">T</kbd>}
                  </button>
                )}
                {pendingCall.type === 'retruco' && (
                  <button
                    className="btn-callout truco-action"
                    onClick={() => handlePlayerCall('vale4')}
                  >
                    <span>¡Vale Cuatro!</span> {isDesktop && <kbd className="btn-kbd">T</kbd>}
                  </button>
                )}
              </>
            ) : (
              <>
                {!envidoPlayed && !firstCardPlayed && currentTrick === 0 && (
                  <>
                    <button className="btn-callout envido-btn" onClick={() => handlePlayerCall('envido')}>
                      <span>Envido ({myEnvidoPoints} pts)</span> {isDesktop && <kbd className="btn-kbd">E</kbd>}
                    </button>
                    <button className="btn-callout" onClick={() => handlePlayerCall('real_envido')}>
                      <span>Real Envido</span>
                    </button>
                    <button className="btn-callout" onClick={() => handlePlayerCall('falta_envido')}>
                      <span>Falta Envido</span>
                    </button>
                  </>
                )}

                {trucoLevel === 'none' && (
                  <button className="btn-callout truco-action" onClick={() => handlePlayerCall('truco')}>
                    <span>¡Truco!</span> {isDesktop && <kbd className="btn-kbd">T</kbd>}
                  </button>
                )}
                {trucoLevel === 'truco' && trucoCaller === 'opponent' && (
                  <button className="btn-callout truco-action" onClick={() => handlePlayerCall('retruco')}>
                    <span>¡Retruco!</span> {isDesktop && <kbd className="btn-kbd">T</kbd>}
                  </button>
                )}
                {trucoLevel === 'retruco' && trucoCaller === 'opponent' && (
                  <button className="btn-callout truco-action" onClick={() => handlePlayerCall('vale4')}>
                    <span>¡Vale Cuatro!</span> {isDesktop && <kbd className="btn-kbd">T</kbd>}
                  </button>
                )}

                <button className="btn-callout mazo-btn" onClick={() => handleMazo()}>
                  <span>Al Mazo</span> {isDesktop && <kbd className="btn-kbd">M</kbd>}
                </button>
              </>
            )}
          </div>

          {/* Botones de acción directa para Tirar Carta (no depende exclusivamente de tocar el naipe) */}
          {(isMulti ? currentTurnSeat === 0 && pendingCall === null : turn === 'player' && pendingCall === null) && playerHand.length > 0 && (
            <div className="quick-throw-cards-bar" role="toolbar" aria-label="Tirar Carta">
              <span className="quick-throw-title">Tirar:</span>
              {playerHand.map((c, idx) => (
                <button
                  key={c.id}
                  type="button"
                  className="btn-callout btn-throw-chip"
                  onClick={() => handlePlayCard(idx)}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    handlePlayCard(idx);
                  }}
                  title={`Tirar ${c.label}`}
                >
                  <span className="throw-chip-suit">
                    {c.suit === 'espada' ? '⚔️' : c.suit === 'basto' ? '🌿' : c.suit === 'oro' ? '🪙' : '🏆'}
                  </span>
                  <span className="throw-chip-num">{c.num}</span>
                  {isDesktop && <kbd className="btn-kbd">{idx + 1}</kbd>}
                </button>
              ))}
            </div>
          )}

          {/* Pasa y Juega: controles del rival (mismo celular) */}
          {isPassAndPlay && !passPlayCurtain && !matchWinner && (
            pendingCall && pendingCall.caller === 'player' ? (
              <div className="player-callouts-bar" role="toolbar" aria-label={`Respuesta de ${config.opponentName}`}>
                <span className="quick-throw-title">{config.opponentName}:</span>
                <button
                  className="btn-callout quiero-action"
                  onClick={() => handleCallResponse('opponent', 'quiero', pendingCall.type)}
                >
                  <span>¡Quiero!</span>
                </button>
                <button
                  className="btn-callout no-quiero-action"
                  onClick={() => handleCallResponse('opponent', 'no_quiero', pendingCall.type)}
                >
                  <span>No Quiero</span>
                </button>
                {pendingCall.type === 'truco' && (
                  <button className="btn-callout truco-action" onClick={() => handlePlayerCall('retruco', 'opponent')}>
                    <span>¡Retruco!</span>
                  </button>
                )}
                {pendingCall.type === 'retruco' && (
                  <button className="btn-callout truco-action" onClick={() => handlePlayerCall('vale4', 'opponent')}>
                    <span>¡Vale Cuatro!</span>
                  </button>
                )}
              </div>
            ) : pendingCall === null && turn === 'opponent' && (
              <div className="quick-throw-cards-bar" role="toolbar" aria-label={`Turno de ${config.opponentName}`}>
                <span className="quick-throw-title">{config.opponentName}:</span>
                {oppHandCards.map((c, idx) => (
                  <button
                    key={c.id}
                    type="button"
                    className="btn-callout btn-throw-chip"
                    onClick={() => handlePlayCardOpp(idx)}
                    title={`Tirar ${c.label}`}
                  >
                    <span className="throw-chip-suit">
                      {c.suit === 'espada' ? '⚔️' : c.suit === 'basto' ? '🌿' : c.suit === 'oro' ? '🪙' : '🏆'}
                    </span>
                    <span className="throw-chip-num">{c.num}</span>
                  </button>
                ))}
                {!envidoPlayed && !firstCardPlayed && currentTrick === 0 && (
                  <button className="btn-callout envido-btn" onClick={() => handlePlayerCall('envido', 'opponent')}>
                    <span>Envido</span>
                  </button>
                )}
                {trucoLevel === 'none' && (
                  <button className="btn-callout truco-action" onClick={() => handlePlayerCall('truco', 'opponent')}>
                    <span>¡Truco!</span>
                  </button>
                )}
                {trucoLevel === 'truco' && trucoCaller === 'player' && (
                  <button className="btn-callout truco-action" onClick={() => handlePlayerCall('retruco', 'opponent')}>
                    <span>¡Retruco!</span>
                  </button>
                )}
                {trucoLevel === 'retruco' && trucoCaller === 'player' && (
                  <button className="btn-callout truco-action" onClick={() => handlePlayerCall('vale4', 'opponent')}>
                    <span>¡Vale Cuatro!</span>
                  </button>
                )}
                <button className="btn-callout mazo-btn" onClick={() => handleMazo('opponent')}>
                  <span>Al Mazo</span>
                </button>
              </div>
            )
          )}

          {/* Manos del Jugador sosteniendo las cartas en abanico */}
          <PlayerHandsHoldingCards
            cards={hideMyCards ? [] : playerHand}
            onPlayCard={handlePlayCard}
            canPlay={isMulti ? currentTurnSeat === 0 && pendingCall === null : turn === 'player' && pendingCall === null}
            isDesktop={isDesktop}
          />

          {/* Quick Señas Drawer: SOLO el gesto / emoji, sin palabras */}
          <div className="senas-drawer" role="toolbar" aria-label="Gestos y señas del Truco">
            <span className="senas-label">SEÑAS:</span>
            <button className="btn-sena-gesture" onClick={() => handleSendSena('😉')} title="Guiño (1 Espada)" aria-label="Guiño">😉</button>
            <button className="btn-sena-gesture" onClick={() => handleSendSena('🤨')} title="Ceja (1 Basto)" aria-label="Ceja">🤨</button>
            <button className="btn-sena-gesture" onClick={() => handleSendSena('😗')} title="Beso (7 Espada)" aria-label="Beso">😗</button>
            <button className="btn-sena-gesture" onClick={() => handleSendSena('😮')} title="Boca (7 Oro)" aria-label="Boca">😮</button>
            <button className="btn-sena-gesture" onClick={() => handleSendSena('😬')} title="Morder labio (Tres)" aria-label="Morder labio">😬</button>
            <button className="btn-sena-gesture" onClick={() => handleSendSena('😲')} title="Hombros (Dos)" aria-label="Hombros">😲</button>
            <button className="btn-sena-gesture" onClick={() => handleSendSena('😴')} title="Ojos cerrados (Ciegas)" aria-label="Ojos cerrados">😴</button>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMsg && <div className="game-toast-popup show">{toastMsg}</div>}

      {/* Matchstick Score Sheet Modal */}
      <ScoreSheet
        open={scoreSheetOpen}
        onClose={() => setScoreSheetOpen(false)}
        scorePlayer={scorePlayer}
        scoreOpponent={scoreOpp}
        goal={config.goal}
        playerName={config.playerName}
        opponentName={config.opponentName}
      />

      {/* Sorteo de Mano Modal (Ver quién arranca) */}
      {cutData && (
        <CutModal
          playerCard={cutData.playerCard}
          oppCard={cutData.oppCard}
          starterName={cutData.starterName}
          onClose={() => setCutData(null)}
        />
      )}

      {/* Match Over Victory Modal */}
      {matchWinner && (
        <div className="match-over-overlay">
          <div className="match-over-card">
            <div className="trophy-icon">🏆</div>
            <h2>
              {matchWinner === 'player'
                ? `¡Felicitaciones ${config.playerName}!`
                : `¡Ganó ${config.opponentName}!`}
            </h2>
            <p className="final-score-text">
              Marcador Final: {scorePlayer} a {scoreOpp}
            </p>
            <div className="match-over-buttons">
              <button
                className="btn-primary-action full-width"
                onClick={() => {
                  resetMatch();
                  if (isMulti) {
                    startNewRoundMulti(0);
                  } else {
                    startNewRound('player'); // en online solo reparte el anfitrión
                  }
                  if (config.mode === 'online' && network) {
                    network.sendMessage({ type: 'REVANCHE' });
                  }
                }}
              >
                🔥 Jugar Revancha
              </button>
              <button className="btn-secondary-action full-width" onClick={onExit}>
                Volver al Menú
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pass & Play Privacy Screen */}
      {isPassAndPlay && passPlayCurtain && (
        <div className="pass-play-curtain">
          <div className="curtain-card">
            <div className="curtain-icon">📱</div>
            <h3>Pasale el celular a:</h3>
            <h2 className="curtain-player-name">
              {passPlayFor === 'player' ? config.playerName : config.opponentName}
            </h2>
            <p className="curtain-warning">
              (No mires las cartas del rival para jugar limpio)
            </p>
            <button
              className="btn-primary-action full-width"
              onClick={() => setPassPlayCurtain(false)}
            >
              Listo, tengo el celu
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
