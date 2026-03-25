import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';

export default function VideoChat({ sessionId, username, isHost }) {
  const [muted, setMuted] = useState(false);
  const [sharingScreen, setSharingScreen] = useState(false);
  const [error, setError] = useState(null);
  const videoRef = useRef();
  const router = useRouter();

  useEffect(() => {
    // Canvas Platzhalter erstellen
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        ctx.fillStyle = '#667eea';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'white';
        ctx.font = 'bold 24px Arial';
        ctx.fillText('🎥 Video Chat', canvas.width/2 - 100, canvas.height/2 - 20);
        ctx.font = '16px Arial';
        ctx.fillText(`Eingeloggt als: ${username}`, canvas.width/2 - 100, canvas.height/2 + 20);
        ctx.font = '12px Arial';
        ctx.fillText(`Session: ${sessionId}`, canvas.width/2 - 60, canvas.height/2 + 60);
        
        const stream = canvas.captureStream();
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }
    } catch (err) {
      console.error('Canvas Fehler:', err);
      setError('Fehler beim Laden');
    }

    // Cleanup
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, [username, sessionId]);

  const toggleMute = () => {
    setMuted(!muted);
  };

  const toggleScreenShare = async () => {
    if (!sharingScreen) {
      try {
        const screen = await navigator.mediaDevices.getDisplayMedia({ 
          video: true 
        });
        
        if (videoRef.current) {
          // Alten Stream stoppen
          if (videoRef.current.srcObject) {
            const oldTracks = videoRef.current.srcObject.getTracks();
            oldTracks.forEach(track => track.stop());
          }
          videoRef.current.srcObject = screen;
        }
        
        setSharingScreen(true);
        
        screen.getVideoTracks()[0].onended = () => {
          stopScreenShare();
        };
      } catch (err) {
        console.error('Screen Share Fehler:', err);
        alert('Screen Share wurde abgebrochen oder ist nicht verfügbar');
      }
    } else {
      stopScreenShare();
    }
  };

  const stopScreenShare = () => {
    try {
      // Canvas Platzhalter neu erstellen
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        ctx.fillStyle = '#667eea';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'white';
        ctx.font = 'bold 24px Arial';
        ctx.fillText('🎥 Video Chat', canvas.width/2 - 100, canvas.height/2 - 20);
        ctx.font = '16px Arial';
        ctx.fillText(`Eingeloggt als: ${username}`, canvas.width/2 - 100, canvas.height/2 + 20);
        ctx.font = '12px Arial';
        ctx.fillText(`Session: ${sessionId}`, canvas.width/2 - 60, canvas.height/2 + 60);
        
        const stream = canvas.captureStream();
        
        if (videoRef.current) {
          if (videoRef.current.srcObject) {
            const oldTracks = videoRef.current.srcObject.getTracks();
            oldTracks.forEach(track => track.stop());
          }
          videoRef.current.srcObject = stream;
        }
      }
      
      setSharingScreen(false);
    } catch (err) {
      console.error('Fehler beim Zurücksetzen:', err);
    }
  };

  const copySessionLink = () => {
    const link = window.location.href;
    navigator.clipboard.writeText(link);
    alert(`✅ Link kopiert!\n\n${link}\n\nTeile diesen Link mit anderen!`);
  };

  const leaveSession = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
    }
    router.push('/');
  };

  if (error) {
    return (
      <div style={styles.errorContainer}>
        <h2>❌ Fehler</h2>
        <p>{error}</p>
        <button onClick={() => router.push('/')} style={styles.errorButton}>
          Zurück zur Startseite
        </button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.sessionTitle}>Session: {sessionId}</h2>
          <p style={styles.userInfo}>{username} {isHost && '👑 Host'}</p>
        </div>
        <div style={styles.sessionInfo}>
          <code style={styles.sessionCode}>{sessionId}</code>
        </div>
      </div>

      <div style={styles.videoGrid}>
        <div style={styles.videoCard}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={styles.video}
          />
          <div style={styles.videoLabel}>
            <span>{username}</span>
            {muted && <span style={styles.mutedBadge}>🔇</span>}
            {sharingScreen && <span style={styles.sharingBadge}>📺 Screen</span>}
          </div>
        </div>
        
        {!isHost && (
          <div style={styles.waitingCard}>
            <p>⏳ Warte auf Host...</p>
            <p style={styles.waitingText}>Teile den Link mit anderen!</p>
            <button onClick={copySessionLink} style={styles.copyButton}>
              🔗 Link kopieren
            </button>
          </div>
        )}
        
        {isHost && (
          <div style={styles.infoCard}>
            <p>✨ Du bist der Host</p>
            <p style={styles.waitingText}>Teile den Session-Code mit anderen:</p>
            <code style={styles.codeBlock}>{sessionId}</code>
            <button onClick={copySessionLink} style={styles.copyButton}>
              🔗 Link kopieren
            </button>
          </div>
        )}
      </div>

      <div style={styles.controls}>
        <button 
          onClick={toggleMute} 
          style={styles.controlButton(muted ? '#e74c3c' : '#2ecc71')}
          title={muted ? "Mikrofon an" : "Mikrofon aus"}
        >
          {muted ? '🔇' : '🎤'}
        </button>
        
        <button 
          onClick={toggleScreenShare} 
          style={styles.controlButton(sharingScreen ? '#e67e22' : '#3498db')}
          title={sharingScreen ? "Screen Share stoppen" : "Screen Share starten"}
        >
          🖥️
        </button>
        
        <button 
          onClick={copySessionLink} 
          style={styles.controlButton('#9b59b6')}
          title="Link kopieren"
        >
          🔗
        </button>
        
        <button 
          onClick={leaveSession} 
          style={styles.controlButton('#e74c3c')}
          title="Verlassen"
        >
          🚪
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: '#1a1a2e',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  header: {
    background: '#16213e',
    padding: '15px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #0f3460',
    flexWrap: 'wrap',
    gap: '10px'
  },
  sessionTitle: {
    color: 'white',
    margin: 0,
    fontSize: '18px'
  },
  userInfo: {
    color: '#aaa',
    margin: '5px 0 0',
    fontSize: '14px'
  },
  sessionInfo: {
    background: '#0f3460',
    padding: '8px 15px',
    borderRadius: '8px'
  },
  sessionCode: {
    color: '#48c6ef',
    fontWeight: 'bold',
    fontSize: '16px'
  },
  videoGrid: {
    flex: 1,
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '20px',
    padding: '20px',
    alignItems: 'center',
    justifyContent: 'center'
  },
  videoCard: {
    position: 'relative',
    background: '#0f3460',
    borderRadius: '12px',
    overflow: 'hidden',
    aspectRatio: '16/9',
    boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
  },
  video: {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  },
  videoLabel: {
    position: 'absolute',
    bottom: '10px',
    left: '10px',
    background: 'rgba(0,0,0,0.7)',
    color: 'white',
    padding: '5px 10px',
    borderRadius: '20px',
    fontSize: '12px',
    display: 'flex',
    gap: '8px'
  },
  mutedBadge: {
    background: '#e74c3c',
    padding: '2px 6px',
    borderRadius: '12px',
    fontSize: '10px'
  },
  sharingBadge: {
    background: '#e67e22',
    padding: '2px 6px',
    borderRadius: '12px',
    fontSize: '10px'
  },
  waitingCard: {
    background: '#0f3460',
    borderRadius: '12px',
    aspectRatio: '16/9',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    textAlign: 'center',
    gap: '10px',
    padding: '20px'
  },
  infoCard: {
    background: '#0f3460',
    borderRadius: '12px',
    aspectRatio: '16/9',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    textAlign: 'center',
    gap: '10px',
    padding: '20px'
  },
  waitingText: {
    fontSize: '12px',
    color: '#aaa'
  },
  codeBlock: {
    background: '#1a1a2e',
    padding: '8px 12px',
    borderRadius: '6px',
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#48c6ef',
    fontFamily: 'monospace'
  },
  copyButton: {
    marginTop: '10px',
    padding: '8px 16px',
    backgroundColor: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px'
  },
  controls: {
    background: '#16213e',
    padding: '20px',
    display: 'flex',
    justifyContent: 'center',
    gap: '15px',
    borderTop: '1px solid #0f3460'
  },
  controlButton: (bgColor) => ({
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    backgroundColor: bgColor,
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    transition: 'transform 0.2s, opacity 0.2s',
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
  }),
  errorContainer: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#1a1a2e',
    color: 'white',
    fontFamily: 'sans-serif'
  },
  errorButton: {
    marginTop: '20px',
    padding: '10px 20px',
    backgroundColor: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer'
  }
};
