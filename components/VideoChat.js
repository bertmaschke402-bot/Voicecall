import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';

export default function VideoChat({ sessionId, username, isHost }) {
  const [stream, setStream] = useState(null);
  const [muted, setMuted] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [sharingScreen, setSharingScreen] = useState(false);
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
        
        // Teilnehmer aus URL-Parametern oder localStorage
        const urlParams = new URLSearchParams(window.location.search);
        const allParticipants = [];
        
        // Eigene Info
        allParticipants.push({
          name: username,
          isHost: isHost,
          id: 'me',
          joinedAt: new Date().toLocaleTimeString()
        });
        
        // Andere Teilnehmer aus localStorage (wenn vorhanden)
        const stored = localStorage.getItem(`participants_${sessionId}`);
        if (stored) {
          const others = JSON.parse(stored).filter(p => p.name !== username);
          allParticipants.push(...others);
        }
        
        setParticipants(allParticipants);
        
        // Storage Event für andere Tabs im GLEICHEN BROWSER
        const handleStorage = (e) => {
          if (e.key === `participants_${sessionId}`) {
            const updated = JSON.parse(e.newValue);
            setParticipants(prev => {
              const me = prev.find(p => p.id === 'me');
              const others = updated.filter(p => p.name !== username);
              return [me, ...others];
            });
          }
        };
        
        window.addEventListener('storage', handleStorage);
        
        return () => {
          window.removeEventListener('storage', handleStorage);
          if (stream) {
            stream.getTracks().forEach(track => track.stop());
          }
        };
      })
      .catch(err => {
        console.error('Kamera Fehler:', err);
        alert('Bitte Kamera und Mikrofon erlauben!');
      });
  }, [sessionId, username, isHost]);

  const copySessionLink = () => {
    const link = `${window.location.origin}/${sessionId}?username=DEIN_NAME`;
    navigator.clipboard.writeText(link);
    alert(`✅ Link kopiert!\n\nTeile diesen Link mit Freunden:\n${link}\n\nJeder der den Link öffnet, kommt in diese Session!`);
  };

  const leaveSession = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    router.push('/');
  };

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
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        if (videoRef.current && stream) {
          const videoTrack = screenStream.getVideoTracks()[0];
          const oldVideoTrack = stream.getVideoTracks()[0];
          stream.removeTrack(oldVideoTrack);
          stream.addTrack(videoTrack);
        }
        setSharingScreen(true);
        screenStream.getVideoTracks()[0].onended = () => {
          toggleScreenShare();
        };
      } catch (err) {
        console.error('Screen Share Fehler:', err);
      }
    } else {
      const newStream = await navigator.mediaDevices.getUserMedia({ video: true });
      const newVideoTrack = newStream.getVideoTracks()[0];
      const oldVideoTrack = stream.getVideoTracks()[0];
      stream.removeTrack(oldVideoTrack);
      stream.addTrack(newVideoTrack);
      setSharingScreen(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>🎥 Session: <span style={styles.code}>{sessionId}</span></h2>
          <p style={styles.user}>👤 {username} {isHost && '👑 (Host)'}</p>
          <p style={styles.info}>📡 {participants.length} in dieser Session</p>
          {!isHost && (
            <p style={styles.waiting}>💡 Teile den Link mit Freunden, damit sie joinen!</p>
          )}
        </div>
        <div>
          <button onClick={copySessionLink} style={styles.linkButton}>
            🔗 Link kopieren
          </button>
        </div>
      </div>

      <div style={styles.videoGrid}>
        {/* Eigener Stream */}
        <div style={styles.videoCard}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={styles.video}
          />
          <div style={styles.label}>
            {username} {muted && '🔇'} {sharingScreen && '📺'}
            {isHost && <span style={styles.hostLabel}> HOST</span>}
          </div>
        </div>
        
        {/* Andere Teilnehmer (Platzhalter) */}
        {participants.filter(p => p.id !== 'me').map((p, idx) => (
          <div key={idx} style={styles.videoCard}>
            <div style={styles.placeholder}>
              <div style={styles.avatar}>👤</div>
              <div style={styles.placeholderName}>{p.name}</div>
              <div style={styles.joinedTime}>joined {p.joinedAt}</div>
            </div>
            <div style={styles.label}>{p.name}</div>
          </div>
        ))}
        
        {/* Platzhalter für mehr Teilnehmer */}
        {participants.filter(p => p.id !== 'me').length === 0 && (
          <div style={styles.videoCard}>
            <div style={styles.placeholder}>
              <div style={styles.avatar}>🔗</div>
              <div style={styles.placeholderName}>Warte auf Teilnehmer</div>
              <div style={styles.joinedTime}>Teile den Link!</div>
            </div>
            <div style={styles.label}>wartet...</div>
          </div>
        )}
      </div>

      <div style={styles.controls}>
        <button onClick={toggleMute} style={styles.controlButton(muted ? '#e74c3c' : '#2ecc71')}>
          {muted ? '🔇' : '🎤'}
        </button>
        <button onClick={toggleVideo} style={styles.controlButton(videoEnabled ? '#2ecc71' : '#e74c3c')}>
          {videoEnabled ? '📹' : '📷'}
        </button>
        <button onClick={toggleScreenShare} style={styles.controlButton(sharingScreen ? '#e67e22' : '#3498db')}>
          🖥️
        </button>
        <button onClick={leaveSession} style={styles.controlButton('#e74c3c')}>
          🚪
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0a0a2a 0%, #1a0033 100%)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  header: {
    background: 'rgba(0,0,0,0.5)',
    backdropFilter: 'blur(10px)',
    padding: '20px 30px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid rgba(102,126,234,0.3)',
    flexWrap: 'wrap'
  },
  title: {
    color: 'white',
    margin: 0,
    fontSize: '20px'
  },
  code: {
    color: '#48c6ef',
    textShadow: '0 0 10px #48c6ef',
    fontWeight: 'bold'
  },
  user: {
    color: '#aaa',
    margin: '5px 0 0',
    fontSize: '14px'
  },
  info: {
    color: '#2ecc71',
    margin: '5px 0 0',
    fontSize: '12px'
  },
  waiting: {
    color: '#f39c12',
    margin: '5px 0 0',
    fontSize: '11px'
  },
  linkButton: {
    padding: '10px 20px',
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold'
  },
  videoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '20px',
    padding: '20px',
    height: 'calc(100vh - 180px)',
    overflowY: 'auto'
  },
  videoCard: {
    position: 'relative',
    background: '#000',
    borderRadius: '20px',
    overflow: 'hidden',
    aspectRatio: '16/9',
    boxShadow: '0 0 30px rgba(102,126,234,0.3)'
  },
  video: {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  },
  placeholder: {
    width: '100%',
    height: '100%',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white'
  },
  avatar: {
    fontSize: '64px',
    marginBottom: '10px'
  },
  placeholderName: {
    fontSize: '18px',
    fontWeight: 'bold'
  },
  joinedTime: {
    fontSize: '10px',
    opacity: 0.7,
    marginTop: '5px'
  },
  hostLabel: {
    background: 'gold',
    color: '#333',
    padding: '2px 6px',
    borderRadius: '12px',
    fontSize: '10px',
    marginLeft: '5px'
  },
  label: {
    position: 'absolute',
    bottom: '10px',
    left: '10px',
    background: 'rgba(0,0,0,0.7)',
    padding: '5px 12px',
    borderRadius: '20px',
    color: 'white',
    fontSize: '12px',
    fontWeight: 'bold'
  },
  controls: {
    background: 'rgba(0,0,0,0.5)',
    backdropFilter: 'blur(10px)',
    padding: '20px',
    display: 'flex',
    justifyContent: 'center',
    gap: '15px',
    borderTop: '1px solid rgba(102,126,234,0.3)'
  },
  controlButton: (bgColor) => ({
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    backgroundColor: bgColor,
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    transition: 'transform 0.2s',
    boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
  })
};
