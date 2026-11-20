import React, { useState } from 'react';
import { ArrowLeft, ExternalLink, RefreshCw, Smartphone, Wifi, WifiOff } from 'lucide-react';

interface ClassicAnotadorProps {
  onBack: () => void;
}

/**
 * Anotador Oficial Gaucho (Xaoxay/truco)
 * Integra directamente la versión oficial desarrollada en https://github.com/Xaoxay/truco
 * desplegada en https://xaoxay.github.io/truco/
 */
export default function ClassicAnotador({ onBack }: ClassicAnotadorProps) {
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [iframeError, setIframeError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const officialUrl = 'https://xaoxay.github.io/truco/';

  const handleReload = () => {
    setIframeError(false);
    setIframeLoaded(false);
    setReloadKey(k => k + 1);
  };

  const openInBrowser = () => {
    window.open(officialUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        minHeight: '100%',
        maxHeight: '100%',
        background: '#150a05',
        color: '#f4c430',
        overflow: 'hidden',
        position: 'relative',
        zIndex: 50,
      }}
    >
      {/* Barra Superior Gaucha */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 'max(8px, env(safe-area-inset-top)) 12px 8px',
          background: 'radial-gradient(ellipse at 50% 0%, #2e170c 0%, #170904 100%)',
          borderBottom: '1.5px solid #5a341b',
          boxShadow: '0 4px 15px rgba(0,0,0,0.6)',
          flexShrink: 0,
          zIndex: 60,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={onBack}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              minHeight: '36px',
              borderRadius: '8px',
              border: '1.5px solid #d99b16',
              background: 'linear-gradient(180deg, #442111 0%, #241007 100%)',
              color: '#f7e7be',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
            }}
            title="Volver al menú de Truco Online"
          >
            <ArrowLeft size={16} />
            <span>Volver</span>
          </button>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '14px', fontWeight: 900, color: '#f7d56d', letterSpacing: '0.5px' }}>
              Anotador Oficial
            </span>
            <span style={{ fontSize: '10px', color: '#bca182', textTransform: 'uppercase' }}>
              Oficial Xaoxay/truco
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={handleReload}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '34px',
              height: '34px',
              minHeight: '34px',
              borderRadius: '8px',
              border: '1px solid #623a1e',
              background: 'rgba(30, 15, 8, 0.85)',
              color: '#d4af37',
              cursor: 'pointer',
            }}
            title="Recargar Anotador"
            aria-label="Recargar Anotador"
          >
            <RefreshCw size={15} />
          </button>

          <button
            onClick={openInBrowser}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 10px',
              minHeight: '34px',
              borderRadius: '8px',
              border: '1px solid #d99b16',
              background: 'linear-gradient(180deg, #38190c 0%, #1b0a04 100%)',
              color: '#f4c430',
              fontWeight: 600,
              fontSize: '12px',
              cursor: 'pointer',
            }}
            title="Abrir en pestaña nueva del navegador"
          >
            <span>Web</span>
            <ExternalLink size={13} />
          </button>
        </div>
      </header>

      {/* Contenedor del Anotador Oficial en Pantalla Completa */}
      <div
        style={{
          flex: 1,
          width: '100%',
          height: '100%',
          position: 'relative',
          background: '#0e0503',
          overflow: 'hidden',
        }}
      >
        {!iframeLoaded && !iframeError && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              color: '#d4af37',
              background: '#150a05',
              zIndex: 10,
            }}
          >
            <RefreshCw size={28} className="animate-spin" style={{ animation: 'spin 1.2s linear infinite' }} />
            <span style={{ fontSize: '13px', fontWeight: 600 }}>Cargando Anotador Oficial de Truco...</span>
            <span style={{ fontSize: '11px', color: '#997354' }}>github.com/Xaoxay/truco</span>
          </div>
        )}

        {iframeError ? (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
              textAlign: 'center',
              gap: '14px',
              background: '#150a05',
              color: '#f7d56d',
            }}
          >
            <WifiOff size={40} color="#e57373" />
            <h3 style={{ margin: 0, fontSize: '18px' }}>No se pudo conectar con el Anotador Web</h3>
            <p style={{ margin: 0, fontSize: '13px', color: '#bca182', maxWidth: '340px' }}>
              Revisá tu conexión a internet o abrí la aplicación directamente en tu navegador.
            </p>
            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button
                onClick={handleReload}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1.5px solid #d99b16',
                  background: '#38190c',
                  color: '#fff',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Reintentar
              </button>
              <button
                onClick={openInBrowser}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1.5px solid #623a1e',
                  background: '#241007',
                  color: '#f4c430',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Abrir en Navegador
              </button>
            </div>
          </div>
        ) : (
          <iframe
            key={reloadKey}
            src={officialUrl}
            title="Anotador de Truco Oficial Xaoxay"
            allow="autoplay; vibration"
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              display: 'block',
              background: '#120704',
            }}
            onLoad={() => setIframeLoaded(true)}
            onError={() => setIframeError(true)}
          />
        )}
      </div>
    </div>
  );
}
