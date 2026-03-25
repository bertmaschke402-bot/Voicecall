import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';

export default function VideoChat({ sessionId, username, isHost }) {
  const [stream, setStream] = useState(null);
  const [muted, setMuted] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [sharingScreen, setSharingScreen] = useState(false);
  const [screenStream, setScreenStream] = useState(null);
  const [participants, setParticipants] = useState([]);
  const videoRef = useRef();
  const router = useRouter();

  useEffect(() => {
    // Kamera starten
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(myStream => {
        setStream(myStream);
        if (videoRef.current) {
          videoRef.current.srcObject = myStream;
        }
        
        // Demo: Simuliere andere Teilnehmer (für die Demo)
        // In einer echten App würdest du hier WebRTC Verbindungen aufbauen
        if (isHost) {
          // Host kann andere einladen
          console.log('Session erstellt:', sessionId);
        }
      })
      .catch(err => {
        console.error('Kamera Fehler:', err);
      });

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (screenStream) {
        screenStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const toggleMute = () => {
    if (stream) {
      stream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setMuted(!muted);
    }
  };

  const toggleVideo = () => {
    if (stream) {
      stream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setVideoEnabled(!videoEnabled);
    }
  };

  const toggleScreenShare = async () => {
    if (!sharingScreen) {
      try {
        const screen = await navigator.mediaDevices.getDisplayMedia({ 
          video: true 
        });
        
        setScreenStream(screen);
        
        // Ersetze Video Track mit Screen Share
        const videoTrack = screen.getVideoTracks()[0];
        const currentVideoTrack = stream.getVideoTracks()[0];
        
        stream.removeTrack(currentVideoTrack);
        stream.addTrack(videoTrack);
        
        setSharingScreen(true);
        
        videoTrack.onended = () => {
          stopScreenShare();
        };
      } catch (err) {
        console.error('Screen Share Fehler:', err);
      }
    } else {
      stopScreenShare();
    }
  };

  const stopScreenShare = async () => {
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
      
      // Zurück zur Kamera
      const newStream = await navigator.mediaDevices.getUserMedia({ video: true });
      const newVideoTrack = newStream.getVideoTracks()[0];
      const oldVideoTrack = stream.getVideoTracks()[0];
      
      stream.removeTrack(oldVideoTrack);
      stream.addTrack(newVideoTrack);
      
      setScreenStream(null);
      setSharingScreen(false);
    }
  };

  const copySessionLink = () => {
    const link = window.location.href;
    navigator.clipboard.writeText(link);
    alert(`Link kopiert: ${link}\nTeile diesen Link mit anderen!`);
  };

  const leaveSession = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    router.push('/');
  };

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
        
        {/* Platzhalter für weitere Teilnehmer */}
        {!isHost && (
          <div style={styles.waitingCard}>
            <p>⏳ Warte auf Host...</p>
            <p style={styles.waitingText}>Teile den Link mit anderen!</p>
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
          onClick={toggleVideo} 
          style={styles.controlButton(videoEnabled ? '#2ecc71' : '#e74c3c')}
          title={videoEnabled ? "Kamera aus" : "Kamera an"}
        >
          {videoEnabled ? '📹' : '📷'}
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
    borderBottom: '1px solid #0f3460'
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
    gap: '10px'
  },
  waitingText: {
    fontSize: '12px',
    color: '#aaa'
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
  })
};
