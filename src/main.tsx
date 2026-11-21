// ─── Truco Criollo Web & Mobile App Entrypoint ──────────────────
import React, { useEffect, useState, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import HomeScreen from './components/HomeScreen';
import GameBoard from './components/GameBoard';
import OnlineLobby from './components/OnlineLobby';
import JoinModal from './components/JoinModal';
import ClassicAnotador from './components/ClassicAnotador';
import { TrucoNetwork, type NetworkStatus, type NetworkMessage } from './engine/network';
import type { RoomConfig } from './engine/types';

import './style.css';
import './gaucho.css';
import './game.css';

type AppView = 'home' | 'lobby' | 'game' | 'anotador';

function MainApp() {
  const [view, setView] = useState<AppView>('home');
  const [config, setConfig] = useState<RoomConfig>({
    goal: 15,
    withFlor: false,
    mode: 'bot',
    playerName: 'Vos',
    opponentName: 'Don Florencio',
  });

  // Online Multiplayer State
  const [roomCode, setRoomCode] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>('disconnected');
  const [networkStatusInfo, setNetworkStatusInfo] = useState('');
  const [peerName, setPeerName] = useState<string | null>(null);
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [initialRoomCode, setInitialRoomCode] = useState('');
  const [pendingRoundData, setPendingRoundData] = useState<any>(null);
  const checkDesktopViewport = () =>
    typeof window !== 'undefined' && window.innerWidth >= 900 && window.innerHeight >= 600;

  const [canUseDesktop, setCanUseDesktop] = useState(checkDesktopViewport);
  const [manualDesktop, setManualDesktop] = useState<boolean | null>(null);
  const desktopLayout = canUseDesktop ? (manualDesktop ?? true) : false;

  useEffect(() => {
    const onResize = () => setCanUseDesktop(checkDesktopViewport());
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);

  const configRef = useRef(config);
  useEffect(() => {
    configRef.current = config;
  }, [config]);

  const toggleDesktop = () => {
    setManualDesktop(prev => !(prev ?? canUseDesktop));
  };

  const networkRef = useRef<TrucoNetwork | null>(null);

  // Check URL query parameters for ?room=CODE
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      setInitialRoomCode(roomParam.toUpperCase().trim());
      setJoinModalOpen(true);
    }
  }, []);

  // Cleanup network on unmount
  useEffect(() => {
    return () => {
      networkRef.current?.destroy();
    };
  }, []);

  // ─── Host Creates Online Room ──────────────────────────────────
  const handleCreateOnlineRoom = (hostPlayerName: string) => {
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const code = `TRU${randomSuffix}`;
    setRoomCode(code);
    setIsHost(true);
    setPeerName(null);
    setPendingRoundData(null);

    const net = new TrucoNetwork({
      onStatusChange: (status, info) => {
        setNetworkStatus(status);
        if (info) setNetworkStatusInfo(info);
      },
      onMessage: (msg: NetworkMessage) => {
        if (msg.type === 'JOIN' || msg.type === 'JOIN_REQUEST') {
          setPeerName(msg.playerName);
          setConfig(prev => ({
            ...prev,
            opponentName: msg.playerName,
            seats: net.seats,
            mySeatIndex: net.mySeatIndex,
          }));
        } else if (msg.type === 'ROOM_STATE') {
          setConfig(prev => ({
            ...prev,
            matchType: msg.matchType,
            goal: msg.goal,
            withFlor: msg.withFlor,
            seats: msg.seats,
            mySeatIndex: net.mySeatIndex,
          }));
        }
      },
    });

    networkRef.current = net;
    net.createRoom(code, hostPlayerName, config.matchType || '1v1', config.goal, config.withFlor);

    setConfig(prev => ({
      ...prev,
      mode: 'online',
      playerName: hostPlayerName,
      opponentName: 'Amigo',
      seats: net.seats,
      mySeatIndex: 0,
    }));

    setView('lobby');
  };

  // ─── Guest Joins Online Room ───────────────────────────────────
  const handleJoinOnlineRoom = (codeToJoin: string, guestPlayerName: string) => {
    setRoomCode(codeToJoin);
    setIsHost(false);
    setJoinModalOpen(false);
    setPendingRoundData(null);

    const net = new TrucoNetwork({
      onStatusChange: (status, info) => {
        setNetworkStatus(status);
        if (info) setNetworkStatusInfo(info);
      },
      onMessage: (msg: NetworkMessage) => {
        if (msg.type === 'ROOM_STATE') {
          setPeerName(msg.hostName);
          setConfig(prev => ({
            ...prev,
            matchType: msg.matchType,
            goal: msg.goal,
            withFlor: msg.withFlor,
            opponentName: msg.hostName,
            seats: msg.seats,
            mySeatIndex: net.mySeatIndex,
          }));
        } else if (msg.type === 'JOIN_ACK') {
          setPeerName(msg.hostName);
          setConfig(prev => ({
            ...prev,
            goal: msg.goal,
            withFlor: msg.withFlor,
            opponentName: msg.hostName,
            matchType: msg.matchType || prev.matchType,
            seats: msg.seats || prev.seats,
            mySeatIndex: net.mySeatIndex,
          }));
        } else if (
          msg.type === 'START_MATCH_MULTI' ||
          msg.type === 'HOST_START_MATCH' ||
          msg.type === 'START_ROUND' ||
          msg.type === 'START_ROUND_MULTI'
        ) {
          if (msg.type === 'START_MATCH_MULTI') {
            setConfig(prev => ({
              ...prev,
              matchType: msg.matchType,
              goal: msg.goal,
              withFlor: msg.withFlor,
              seats: msg.seats,
              mySeatIndex: net.mySeatIndex,
            }));
          }
          if (msg.type === 'START_ROUND') {
            setPendingRoundData(msg);
          }
          setView('game');
        }
      },
    });

    networkRef.current = net;
    net.joinRoom(codeToJoin, guestPlayerName);

    setConfig(prev => ({
      ...prev,
      mode: 'online',
      playerName: guestPlayerName,
      opponentName: 'Anfitrión',
      mySeatIndex: net.mySeatIndex,
    }));

    setView('lobby');
  };

  // ─── Host Starts Match ─────────────────────────────────────────
  const handleHostStartMatch = (fillWithBots: boolean = false) => {
    const net = networkRef.current;
    if (!net) {
      setView('game');
      return;
    }

    const botNames = ['Don Florencio', 'El Chajá', 'El Zorro', 'Martín Fierro', 'Don Segundo'];
    const finalSeats = net.seats.map((s, idx) => {
      if (s.peerId) return s;
      if (fillWithBots) {
        return {
          seatIndex: idx,
          peerId: `bot_${idx}`,
          name: botNames[idx - 1] || `Bot ${idx}`,
          team: (idx % 2 === 0 ? 0 : 1) as 0 | 1,
          avatar: ['🤠', '😎', '🧉', '😼', '🐎', '🎭'][idx] || '🤖',
          isHost: false,
          isConnected: true,
          isBot: true,
        };
      }
      return s;
    });
    net.seats = finalSeats;

    net.sendMessage({
      type: 'START_MATCH_MULTI',
      matchType: net.matchType,
      seats: finalSeats,
      goal: config.goal,
      withFlor: config.withFlor,
    });
    net.sendMessage({ type: 'HOST_START_MATCH' });

    setConfig(prev => ({
      ...prev,
      mode: 'online',
      matchType: net.matchType,
      mySeatIndex: 0,
      seats: finalSeats,
    }));
    setView('game');
  };

  // ─── Start Offline / Bot Game ──────────────────────────────────
  const handleStartGame = (newConfig: RoomConfig) => {
    networkRef.current?.destroy();
    networkRef.current = null;
    setPendingRoundData(null);
    setConfig(newConfig);
    setView('game');
  };

  const handleCancelOnline = () => {
    networkRef.current?.destroy();
    networkRef.current = null;
    setPendingRoundData(null);
    setView('home');
  };

  return (
    <div className={`app-viewport ${desktopLayout ? 'desktop-view' : ''}`}>
      {view === 'home' && (
        <HomeScreen
          onStartGame={handleStartGame}
          onCreateOnlineRoom={handleCreateOnlineRoom}
          onOpenJoinModal={() => setJoinModalOpen(true)}
          onOpenAnotador={() => setView('anotador')}
          isDesktop={desktopLayout}
          onToggleDesktop={canUseDesktop ? toggleDesktop : undefined}
        />
      )}

      {view === 'lobby' && (
        <OnlineLobby
          roomCode={roomCode}
          isHost={isHost}
          networkStatus={networkStatus}
          statusInfo={networkStatusInfo}
          peerName={peerName}
          playerName={config.playerName}
          opponentName={config.opponentName}
          goal={config.goal}
          withFlor={config.withFlor}
          matchType={config.matchType || '1v1'}
          seats={config.seats || networkRef.current?.seats}
          myPeerId={networkRef.current?.myPeerId}
          onSetGoal={g => {
            setConfig(prev => ({ ...prev, goal: g }));
            networkRef.current?.setRoomConfig(config.matchType || '1v1', g, config.withFlor);
          }}
          onSetFlor={f => {
            setConfig(prev => ({ ...prev, withFlor: f }));
            networkRef.current?.setRoomConfig(config.matchType || '1v1', config.goal, f);
          }}
          onSetMatchType={m => {
            setConfig(prev => ({ ...prev, matchType: m }));
            networkRef.current?.setRoomConfig(m, config.goal, config.withFlor);
          }}
          onChangeSeat={targetSeat => {
            networkRef.current?.requestChangeSeat(targetSeat);
          }}
          onStartMatch={handleHostStartMatch}
          onCancel={handleCancelOnline}
        />
      )}

      {view === 'game' && (
        <GameBoard
          config={config}
          network={networkRef.current}
          isDesktop={desktopLayout}
          onToggleLayout={canUseDesktop ? toggleDesktop : undefined}
          initialRoundData={pendingRoundData}
          onExit={() => {
            networkRef.current?.destroy();
            networkRef.current = null;
            setPendingRoundData(null);
            setView('home');
          }}
        />
      )}

      {view === 'anotador' && (
        <ClassicAnotador onBack={() => setView('home')} />
      )}

      {/* Join Room Modal */}
      <JoinModal
        open={joinModalOpen}
        initialCode={initialRoomCode}
        onClose={() => setJoinModalOpen(false)}
        onJoin={handleJoinOnlineRoom}
      />
    </div>
  );
}

const rootEl = document.getElementById('root');
if (rootEl) {
  const root = createRoot(rootEl);
  root.render(
    <React.StrictMode>
      <MainApp />
    </React.StrictMode>
  );
}
