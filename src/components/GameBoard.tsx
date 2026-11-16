import React, { useState, useEffect } from 'react';
import type { Card as CardType, PlayerId, TrucoLevel, EnvidoType, RoomConfig } from '../engine/types';
import { CardFace, CardBack } from './Card';
import { PlayerHandsHoldingCards, OpponentHandsHoldingCards } from './HandsHoldingCards';
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
  trucoNoQuieroPoints,
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
import type { TrucoNetwork } from '../engine/network';

interface GameBoardProps {
  config: RoomConfig;
  network?: TrucoNetwork | null;
  onExit: () => void;
  isDesktop?: boolean;
  onToggleLayout?: () => void;
}

interface PlayedSlot {
  playerCard: CardType | null;
  oppCard: CardType | null;
  winner: PlayerId | 'tie' | null;
}

export default function GameBoard({ config, network, onExit, isDesktop = false, onToggleLayout }: GameBoardProps) {
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

  const [multiHands, setMultiHands] = useState<CardType[][]>([]);
  const [currentTurnSeat, setCurrentTurnSeat] = useState(0);
  const [manoSeat, setManoSeat] = useState(0);
  const [currentTrickPlays, setCurrentTrickPlays] = useState<{
    seatIndex: number;
    team: 0 | 1;
    card: CardType;
    playerName: string;
  }[]>([]);
  const [multiTrickWinners, setMultiTrickWinners] = useState<(0 | 1 | 'tie')[]>([]);

  // Score state
  const [scorePlayer, setScorePlayer] = useState(0);
  const [scoreOpp, setScoreOpp] = useState(0);
  const [scoreSheetOpen, setScoreSheetOpen] = useState(false);

  // Round / Hand state
  const [playerHand, setPlayerHand] = useState<CardType[]>([]);
  const [oppHandCards, setOppHandCards] = useState<CardType[]>([]);
  const [oppCardsCount, setOppCardsCount] = useState(3);
  const [currentTrick, setCurrentTrick] = useState(0);
  const [tricks, setTricks] = useState<PlayedSlot[]>([
    { playerCard: null, oppCard: null, winner: null },
    { playerCard: null, oppCard: null, winner: null },
    { playerCard: null, oppCard: null, winner: null },
  ]);

  // Turn & phase
  const [mano, setMano] = useState<PlayerId>('player');
  const [turn, setTurn] = useState<PlayerId>('player');
  const [pendingCall, setPendingCall] = useState<{
    type: 'envido' | 'real_envido' | 'falta_envido' | 'truco' | 'retruco' | 'vale4' | 'flor';
    caller: PlayerId;
  } | null>(null);

  const [trucoLevel, setTrucoLevel] = useState<TrucoLevel>('none');
  const [trucoCaller, setTrucoCaller] = useState<PlayerId | null>(null);
  const [envidoPlayed, setEnvidoPlayed] = useState(false);
  const [firstCardPlayed, setFirstCardPlayed] = useState(false);

  // UI speech & alerts
  const [speechText, setSpeechText] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [playerGesture, setPlayerGesture] = useState<string | null>(null);
  const [oppGesture, setOppGesture] = useState<string | null>(null);
  const [matchWinner, setMatchWinner] = useState<PlayerId | null>(null);

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
  }, [playerHand, turn, pendingCall, currentTrick, envidoPlayed, firstCardPlayed, trucoLevel, trucoCaller]);

  // Pass & Play curtain state (for local 2-player on same device)
  const isPassAndPlay = config.mode === 'local';
  const [passPlayCurtain, setPassPlayCurtain] = useState(false);
  const [passPlayFor, setPassPlayFor] = useState<PlayerId>('player');

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  const showSpeech = (text: string) => {
    setSpeechText(text);
    setTimeout(() => setSpeechText(null), 2800);
  };

  // ─── Multi-Player (2v2 and 3v3) Game Engine ───────────────────
  const startNewRoundMulti = (nextManoSeat: number) => {
    const seatCount = defaultMultiSeats.length;
    const hands = dealMultiHands(seatCount);
    setPlayerHand(hands[0]);
    setMultiHands(hands);
    setCurrentTrick(0);
    setCurrentTrickPlays([]);
    setMultiTrickWinners([]);
    setPendingCall(null);
    setTrucoLevel('none');
    setTrucoCaller(null);
    setEnvidoPlayed(false);
    setFirstCardPlayed(false);
    setManoSeat(nextManoSeat);
    setCurrentTurnSeat(nextManoSeat);

    soundWinRound();
    showToast(`¡Nueva mano (${matchType}) repartida para ${seatCount} gauchos!`);

    if (nextManoSeat !== 0) {
      setTimeout(() => runMultiBotTurn(nextManoSeat, hands, 0, []), 900);
    }
  };

  const runMultiBotTurn = (
    seatIdx: number,
    curHands: CardType[][],
    trickIdx: number,
    existingPlays: { seatIndex: number; team: 0 | 1; card: CardType; playerName: string }[]
  ) => {
    const botHand = curHands[seatIdx];
    if (!botHand || botHand.length === 0) return;

    // Bot chooses a card
    const cardIndex = Math.floor(Math.random() * botHand.length);
    const card = botHand[cardIndex];
    const newHand = botHand.filter((_, i) => i !== cardIndex);

    const updatedHands = [...curHands];
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

    const seatCount = defaultMultiSeats.length;
    if (updatedPlays.length === seatCount) {
      setTimeout(() => resolveMultiTrick(updatedPlays, trickIdx, updatedHands), 800);
    } else {
      const nextSeat = (seatIdx + 1) % seatCount;
      setCurrentTurnSeat(nextSeat);
      if (nextSeat !== 0) {
        setTimeout(() => runMultiBotTurn(nextSeat, updatedHands, trickIdx, updatedPlays), 900);
      }
    }
  };

  const resolveMultiTrick = (
    plays: { seatIndex: number; team: 0 | 1; card: CardType; playerName: string }[],
    trickIdx: number,
    curHands: CardType[][]
  ) => {
    const result = evaluateTeamTrick(plays);
    const updatedWinners = [...multiTrickWinners, result.winnerTeam];
    setMultiTrickWinners(updatedWinners);

    if (result.winnerTeam === 0) {
      soundWinRound();
      showToast(`¡Ganamos la ${trickIdx + 1}ª mano con ${result.winningPlay?.card.label}!`);
    } else if (result.winnerTeam === 1) {
      showToast(`Ellos ganaron la ${trickIdx + 1}ª mano con ${result.winningPlay?.card.label}`);
    } else {
      showToast(`¡Parda en la ${trickIdx + 1}ª mano!`);
    }

    const manoTeam = defaultMultiSeats[manoSeat].team;
    const roundWinner = checkTeamRoundWinner(updatedWinners, manoTeam);

    if (roundWinner !== null) {
      setTimeout(() => finishMultiRound(roundWinner), 1200);
    } else {
      const nextTrickIdx = trickIdx + 1;
      setCurrentTrick(nextTrickIdx);
      setCurrentTrickPlays([]);

      const nextLeader = result.winningPlay ? result.winningPlay.seatIndex : manoSeat;
      setCurrentTurnSeat(nextLeader);

      if (nextLeader !== 0) {
        setTimeout(() => runMultiBotTurn(nextLeader, curHands, nextTrickIdx, []), 900);
      }
    }
  };

  const finishMultiRound = (winnerTeam: 0 | 1) => {
    const pts = trucoWinPoints(trucoLevel);
    let newP = scorePlayer;
    let newO = scoreOpp;

    if (winnerTeam === 0) {
      newP += pts;
      setScorePlayer(newP);
      soundWinRound();
      showToast(`¡Nosotros nos llevamos la mano! (+${pts} tantos)`);
    } else {
      newO += pts;
      setScoreOpp(newO);
      soundLoseRound();
      showToast(`Ellos se llevan la mano (+${pts} tantos)`);
    }

    if (newP >= config.goal) {
      soundMatchWin();
      setMatchWinner('player');
      return;
    }
    if (newO >= config.goal) {
      soundLoseRound();
      setMatchWinner('opponent');
      return;
    }

    const seatCount = defaultMultiSeats.length;
    const nextMano = (manoSeat + 1) % seatCount;
    setTimeout(() => {
      startNewRoundMulti(nextMano);
    }, 1800);
  };

  // ─── Start a new round ──────────────────────────────────────────
  const startNewRound = (nextMano: PlayerId) => {
    const { playerHand: pHand, opponentHand: oHand } = dealHands();
    setMano(nextMano);
    setTurn(nextMano);
    setCurrentTrick(0);
    setTricks([
      { playerCard: null, oppCard: null, winner: null },
      { playerCard: null, oppCard: null, winner: null },
      { playerCard: null, oppCard: null, winner: null },
    ]);
    setPendingCall(null);
    setTrucoLevel('none');
    setTrucoCaller(null);
    setEnvidoPlayed(false);
    setFirstCardPlayed(false);

    if (config.mode === 'online' && network && network.isHost) {
      // Host deals and sends guest's hand
      setPlayerHand(pHand);
      setOppCardsCount(3);
      setOppHandCards(oHand);
      network.sendMessage({
        type: 'START_ROUND',
        hand: oHand,
        oppHandCount: 3,
        mano: nextMano === 'player' ? 'opponent' : 'player', // from guest perspective
        roundNum: 1,
      });
    } else if (config.mode !== 'online') {
      setPlayerHand(pHand);
      setOppHandCards(oHand);
      setOppCardsCount(3);
    }

    if (isPassAndPlay) {
      setPassPlayFor(nextMano);
      setPassPlayCurtain(true);
    } else {
      soundWinRound();
      showToast('¡Nueva mano repartida!');
    }
  };

  // Initialize first round on mount
  useEffect(() => {
    if (isMulti) {
      startNewRoundMulti(0);
      return;
    }
    if (config.mode === 'online' && network && !network.isHost) {
      // Guest waits for START_ROUND from host
      return;
    }
    startNewRound('player');
  }, []);

  // ─── Network Message Listener ──────────────────────────────────
  useEffect(() => {
    if (config.mode !== 'online' || !network) return;

    // Listen for incoming messages from peer
    const handleNetMsg = (msg: any) => {
      if (msg.type === 'START_ROUND') {
        setPlayerHand(msg.hand);
        setOppCardsCount(msg.oppHandCount);
        setMano(msg.mano);
        setTurn(msg.mano);
        setCurrentTrick(0);
        setTricks([
          { playerCard: null, oppCard: null, winner: null },
          { playerCard: null, oppCard: null, winner: null },
          { playerCard: null, oppCard: null, winner: null },
        ]);
        setPendingCall(null);
        setTrucoLevel('none');
        setTrucoCaller(null);
        setEnvidoPlayed(false);
        setFirstCardPlayed(false);
        soundWinRound();
        showToast('¡Nueva mano repartida por el anfitrión!');
      } else if (msg.type === 'PLAY_CARD') {
        soundCardPlay();
        setOppCardsCount(prev => Math.max(0, prev - 1));
        applyOpponentCard(msg.card, msg.trickIndex);
      } else if (msg.type === 'CALL') {
        soundTruco();
        setPendingCall({ type: msg.call, caller: 'opponent' });
        showSpeech(`¡${msg.call.toUpperCase().replace('_', ' ')}!`);
      } else if (msg.type === 'RESPONSE') {
        handleCallResponse('opponent', msg.resp, msg.toCall);
      } else if (msg.type === 'GO_MAZO') {
        showToast(`${config.opponentName} se fue al mazo`);
        awardTrucoTo('player');
      } else if (msg.type === 'SENA') {
        const gesture = msg.gesture || msg.sena?.match(/[\p{Emoji}\u200d]+/gu)?.[0] || '😉';
        setOppGesture(gesture);
        setTimeout(() => setOppGesture(null), 2500);
      } else if (msg.type === 'CHAT') {
        showSpeech(msg.text);
      } else if (msg.type === 'REVANCHE') {
        setScorePlayer(0);
        setScoreOpp(0);
        setMatchWinner(null);
        startNewRound('player');
      }
    };

    (network as any).callbacks.onMessage = handleNetMsg;
  }, [config.mode, network]);

  // ─── Playing a card ─────────────────────────────────────────────
  const handlePlayCard = (index: number) => {
    if (isMulti) {
      if (currentTurnSeat !== 0 || pendingCall !== null || currentTrick >= 3) return;
      soundCardPlay();
      const card = playerHand[index];
      const newHand = playerHand.filter((_, i) => i !== index);
      setPlayerHand(newHand);
      setFirstCardPlayed(true);

      const play = {
        seatIndex: 0,
        team: 0 as const,
        card,
        playerName: config.playerName || 'Vos',
      };
      const updatedPlays = [...currentTrickPlays, play];
      setCurrentTrickPlays(updatedPlays);

      const seatCount = defaultMultiSeats.length;
      if (updatedPlays.length === seatCount) {
        setTimeout(() => resolveMultiTrick(updatedPlays, currentTrick, multiHands), 800);
      } else {
        const nextSeat = 1;
        setCurrentTurnSeat(nextSeat);
        setTimeout(() => runMultiBotTurn(nextSeat, multiHands, currentTrick, updatedPlays), 900);
      }
      return;
    }

    if (turn !== 'player' || pendingCall !== null || currentTrick >= 3) return;

    soundCardPlay();
    const card = playerHand[index];
    const newHand = playerHand.filter((_, i) => i !== index);
    setPlayerHand(newHand);
    setFirstCardPlayed(true);

    // Record on table
    const updated = [...tricks];
    updated[currentTrick] = { ...updated[currentTrick], playerCard: card };
    setTricks(updated);

    if (config.mode === 'online' && network) {
      network.sendMessage({ type: 'PLAY_CARD', card, trickIndex: currentTrick });
    }

    // Check if opponent already played in this trick
    if (updated[currentTrick].oppCard !== null) {
      resolveTrick(updated, currentTrick);
    } else {
      // Opponent's turn
      setTurn('opponent');
      if (config.mode === 'bot') {
        setTimeout(() => runBotTurn(updated, currentTrick, newHand), 800);
      } else if (isPassAndPlay) {
        setPassPlayFor('opponent');
        setPassPlayCurtain(true);
      }
    }
  };

  const applyOpponentCard = (card: CardType, trickIdx: number) => {
    setTricks(prev => {
      const updated = [...prev];
      updated[trickIdx] = { ...updated[trickIdx], oppCard: card };
      if (updated[trickIdx].playerCard !== null) {
        setTimeout(() => resolveTrick(updated, trickIdx), 400);
      } else {
        setTurn('player');
      }
      return updated;
    });
    setFirstCardPlayed(true);
  };

  // ─── Resolve Trick ──────────────────────────────────────────────
  const resolveTrick = (currentTricks: PlayedSlot[], trickIdx: number) => {
    const slot = currentTricks[trickIdx];
    if (!slot.playerCard || !slot.oppCard) return;

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
    const roundWinner = checkRoundWinner(convertedTricks, mano);

    if (roundWinner !== null) {
      setTimeout(() => finishRound(roundWinner), 1000);
    } else {
      // Next trick
      const nextTrickIdx = trickIdx + 1;
      setCurrentTrick(nextTrickIdx);

      // Winner of previous trick leads next
      const nextLeader: PlayerId = winner === 'tie' ? mano : winner;
      setTurn(nextLeader);

      if (nextLeader === 'opponent') {
        if (config.mode === 'bot') {
          setTimeout(() => runBotTurn(updated, nextTrickIdx, playerHand), 900);
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
    const pts = trucoWinPoints(trucoLevel);
    let newPScore = scorePlayer;
    let newOScore = scoreOpp;

    if (roundWinner === 'player') {
      newPScore += pts;
      setScorePlayer(newPScore);
      soundWinRound();
      showToast(`¡Ganaste la mano! (+${pts} tantos)`);
    } else {
      newOScore += pts;
      setScoreOpp(newOScore);
      soundLoseRound();
      showToast(`${config.opponentName} se lleva la mano (+${pts} tantos)`);
    }

    // Check match winner
    if (newPScore >= config.goal) {
      soundMatchWin();
      setMatchWinner('player');
      return;
    }
    if (newOScore >= config.goal) {
      soundLoseRound();
      setMatchWinner('opponent');
      return;
    }

    // Alternate dealer (mano)
    setTimeout(() => {
      startNewRound(mano === 'player' ? 'opponent' : 'player');
    }, 1800);
  };

  // ─── Award Truco points on Mazo or Rejection ─────────────────────
  const awardTrucoTo = (winner: PlayerId) => {
    const pts = trucoNoQuieroPoints(trucoLevel);
    let newPScore = scorePlayer;
    let newOScore = scoreOpp;

    if (winner === 'player') {
      newPScore += pts;
      setScorePlayer(newPScore);
      showToast(`¡Ganaste los puntos de la mano! (+${pts} tantos)`);
    } else {
      newOScore += pts;
      setScoreOpp(newOScore);
      showToast(`${config.opponentName} sumó ${pts} tantos`);
    }

    if (newPScore >= config.goal) {
      soundMatchWin();
      setMatchWinner('player');
      return;
    }
    if (newOScore >= config.goal) {
      soundLoseRound();
      setMatchWinner('opponent');
      return;
    }

    setTimeout(() => {
      startNewRound(mano === 'player' ? 'opponent' : 'player');
    }, 1500);
  };

  // ─── Bot Turn Logic ─────────────────────────────────────────────
  const runBotTurn = (
    currentTricks: PlayedSlot[],
    trickIdx: number,
    curPlayerHand: CardType[]
  ) => {
    if (oppHandCards.length === 0) return;

    // 1. Should bot call Envido?
    if (
      !envidoPlayed &&
      !firstCardPlayed &&
      trickIdx === 0 &&
      botShouldCallEnvido(oppHandCards, {
        playerHand: curPlayerHand,
        opponentHand: oppHandCards,
        tricks: [],
        currentTrick: 0,
        mano,
        trucoLevel,
        trucoCaller,
        envidoPlayed,
        firstCardPlayed,
      }, scoreOpp, scorePlayer)
    ) {
      soundCall();
      setPendingCall({ type: 'envido', caller: 'opponent' });
      showSpeech(botPhrase('envido'));
      return;
    }

    // 2. Should bot call Truco?
    if (
      canCallTruco({
        playerHand: curPlayerHand,
        opponentHand: oppHandCards,
        tricks: [],
        currentTrick: trickIdx,
        mano,
        trucoLevel,
        trucoCaller,
        envidoPlayed,
        firstCardPlayed,
      }, 'opponent') &&
      botShouldCallTruco(oppHandCards, {
        playerHand: curPlayerHand,
        opponentHand: oppHandCards,
        tricks: [],
        currentTrick: trickIdx,
        mano,
        trucoLevel,
        trucoCaller,
        envidoPlayed,
        firstCardPlayed,
      }, scoreOpp, scorePlayer)
    ) {
      soundTruco();
      const nextLevel = nextTrucoLevel(trucoLevel);
      if (nextLevel && nextLevel !== 'none') {
        setPendingCall({ type: nextLevel, caller: 'opponent' });
        showSpeech(botPhrase(nextLevel as any));
        return;
      }
    }

    // 3. Play card
    const cardIdx = botChooseCard(oppHandCards, {
      playerHand: curPlayerHand,
      opponentHand: oppHandCards,
      tricks: currentTricks.map(t => ({
        cards: [
          ...(t.playerCard ? [{ player: 'player' as PlayerId, card: t.playerCard }] : []),
          ...(t.oppCard ? [{ player: 'opponent' as PlayerId, card: t.oppCard }] : []),
        ],
        winner: t.winner,
      })),
      currentTrick: trickIdx,
      mano,
      trucoLevel,
      trucoCaller,
      envidoPlayed,
      firstCardPlayed,
    });

    const botCard = oppHandCards[cardIdx];
    const newOppHand = oppHandCards.filter((_, i) => i !== cardIdx);
    setOppHandCards(newOppHand);
    setOppCardsCount(newOppHand.length);
    soundCardPlay();
    applyOpponentCard(botCard, trickIdx);
  };

  // ─── Call Handlers (Envido, Truco, Mazo) ─────────────────────────
  const handlePlayerCall = (callType: 'envido' | 'real_envido' | 'falta_envido' | 'truco' | 'retruco' | 'vale4') => {
    soundTruco();
    setPendingCall({ type: callType, caller: 'player' });

    if (config.mode === 'online' && network) {
      network.sendMessage({ type: 'CALL', call: callType });
    } else if (config.mode === 'bot') {
      setTimeout(() => botRespondToCall(callType), 1000);
    } else if (isPassAndPlay) {
      setPassPlayFor('opponent');
      setPassPlayCurtain(true);
    }
  };

  const botRespondToCall = (callType: string) => {
    if (callType === 'envido' || callType === 'real_envido' || callType === 'falta_envido') {
      const resp = botRespondEnvido(oppHandCards, callType, scoreOpp, scorePlayer, config.goal);
      showSpeech(botPhrase(resp));
      handleCallResponse('opponent', resp, callType);
    } else {
      // Truco response
      const resp = botRespondTruco(oppHandCards, callType as TrucoLevel, {
        playerHand,
        opponentHand: oppHandCards,
        tricks: [],
        currentTrick,
        mano,
        trucoLevel,
        trucoCaller,
        envidoPlayed,
        firstCardPlayed,
      }, scoreOpp, scorePlayer);

      if (resp === 'retruco' || resp === 'vale4') {
        showSpeech(botPhrase(resp));
        setPendingCall({ type: resp, caller: 'opponent' });
      } else {
        showSpeech(botPhrase(resp));
        handleCallResponse('opponent', resp, callType);
      }
    }
  };

  // ─── Resolve Call Response (Quiero / No Quiero) ───────────────────
  const handleCallResponse = (responder: PlayerId, resp: 'quiero' | 'no_quiero', callType: string) => {
    const caller: PlayerId = responder === 'player' ? 'opponent' : 'player';

    if (config.mode === 'online' && network && responder === 'player') {
      network.sendMessage({ type: 'RESPONSE', resp, toCall: callType });
    }

    setPendingCall(null);

    // 1. Envido Resolution
    if (callType === 'envido' || callType === 'real_envido' || callType === 'falta_envido') {
      setEnvidoPlayed(true);
      if (resp === 'no_quiero') {
        const pts = envidoNoQuieroPoints(callType);
        if (caller === 'player') {
          setScorePlayer(prev => prev + pts);
          showToast(`¡Ganaste el Envido! (+${pts} tantos)`);
        } else {
          setScoreOpp(prev => prev + pts);
          showToast(`${config.opponentName} sumó ${pts} tantos de Envido`);
        }
      } else {
        // Both want Envido: compare scores
        const pEnvido = calculateEnvido(playerHand);
        const oEnvido = calculateEnvido(oppHandCards);

        showSpeech(`Tengo ${oEnvido}`);
        setTimeout(() => {
          let pts = envidoQuieroPoints(callType);
          if (callType === 'falta_envido') {
            pts = faltaEnvidoPoints(scorePlayer, scoreOpp, config.goal);
          }

          if (pEnvido > oEnvido || (pEnvido === oEnvido && mano === 'player')) {
            setScorePlayer(prev => prev + pts);
            showToast(`¡Ganaste el Envido con ${pEnvido} tantos! (+${pts})`);
            soundWinRound();
          } else {
            setScoreOpp(prev => prev + pts);
            showToast(`${config.opponentName} ganó el Envido con ${oEnvido} tantos (+${pts})`);
          }
        }, 1200);
      }
    }

    // 2. Truco Resolution
    if (callType === 'truco' || callType === 'retruco' || callType === 'vale4') {
      if (resp === 'no_quiero') {
        awardTrucoTo(caller);
      } else {
        setTrucoLevel(callType as TrucoLevel);
        setTrucoCaller(caller);
        showToast(`¡${callType.toUpperCase()} aceptado!`);
      }
    }
  };

  const handleMazo = () => {
    soundButton();
    showToast('Te fuiste al mazo');
    if (config.mode === 'online' && network) {
      network.sendMessage({ type: 'GO_MAZO' });
    }
    awardTrucoTo('opponent');
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
            <div className="home-badge" style={{ marginBottom: 6 }}>🇦🇷 ANOTADOR CRIOLLO</div>
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

          {/* Callouts Bar */}
          <div className="player-callouts-bar">
            {pendingCall && pendingCall.caller === 'opponent' ? (
              <>
                <button
                  className="btn-callout quiero-action"
                  onClick={() => handleCallResponse('player', 'quiero', pendingCall.type)}
                >
                  <span>¡Quiero!</span> {isDesktop && <kbd className="btn-kbd">Q</kbd>}
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
                    <button className="btn-callout" onClick={() => handlePlayerCall('envido')}>
                      <span>Envido</span> {isDesktop && <kbd className="btn-kbd">E</kbd>}
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

                <button className="btn-callout mazo-btn" onClick={handleMazo}>
                  <span>Al Mazo</span> {isDesktop && <kbd className="btn-kbd">M</kbd>}
                </button>
              </>
            )}
          </div>

          {/* Manos del Jugador sosteniendo las cartas en abanico */}
          <PlayerHandsHoldingCards
            cards={playerHand}
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
                  setScorePlayer(0);
                  setScoreOpp(0);
                  setMatchWinner(null);
                  startNewRound('player');
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
