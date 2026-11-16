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
  const [desktopLayout, setDesktopLayout] = useState(() => {
    return typeof window !== 'undefined' && window.innerWidth >= 768;
  });

  const toggleDesktop = () => {
    setDesktopLayout(prev => !prev);
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
        if (msg.type === 'JOIN') {
          setPeerName(msg.playerName);
          setConfig(prev => ({
            ...prev,
            opponentName: msg.playerName,
          }));
          net.sendMessage({
            type: 'JOIN_ACK',
            hostName: hostPlayerName,
            goal: config.goal,
            withFlor: config.withFlor,
          });
        }
      },
    });

    networkRef.current = net;
    net.createRoom(code);

    setConfig(prev => ({
      ...prev,
      mode: 'online',
      playerName: hostPlayerName,
      opponentName: 'Amigo',
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
        if (msg.type === 'JOIN_ACK') {
          setPeerName(msg.hostName);
          setConfig(prev => ({
            ...prev,
            goal: msg.goal,
            withFlor: msg.withFlor,
            opponentName: msg.hostName,
          }));
        } else if (msg.type === 'START_ROUND') {
          // El Anfitrión inició la partida: guardar las cartas recibidas y entrar al juego
          setPendingRoundData(msg);
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
    }));

    setView('lobby');
  };

  // ─── Host Starts Match ─────────────────────────────────────────
  const handleHostStartMatch = () => {
    if (networkRef.current) {
      setConfig(prev => ({
        ...prev,
        opponentName: peerName || 'Amigo',
      }));
      setView('game');
    }
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
          onToggleDesktop={toggleDesktop}
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
          onSetGoal={g => setConfig(prev => ({ ...prev, goal: g }))}
          onSetFlor={f => setConfig(prev => ({ ...prev, withFlor: f }))}
          onSetMatchType={m => setConfig(prev => ({ ...prev, matchType: m }))}
          onStartMatch={handleHostStartMatch}
          onCancel={handleCancelOnline}
        />
      )}

      {view === 'game' && (
        <GameBoard
          config={config}
          network={networkRef.current}
          isDesktop={desktopLayout}
          onToggleLayout={toggleDesktop}
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
