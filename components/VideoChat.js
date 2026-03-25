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

  // Eigene Kamera starten
  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(myStream => {
        setStream(myStream);
        if (videoRef.current) {
          videoRef.current.srcObject = myStream;
        }
        
        // User zur Session hinzufügen
        const users = JSON.parse(localStorage.getItem(`session_${sessionId}_users`) || '[]');
        const userExists = users.find(u => u.name === username);
        
        if (!userExists) {
          users.push({ 
            name: username, 
            isHost: isHost, 
            id: Date.now(),
            joinedAt: new Date().toLocaleTimeString()
          });
          localStorage.setItem(`session_${sessionId}_users`, JSON.stringify(users));
        }
        
        setParticipants(users);
        
        // Broadcast dass neuer User joined (für andere Tabs)
        localStorage.setItem(`session_${sessionId}_update`, Date.now().toString());
      })
      .catch(err => {
        console.error('Kamera Fehler:', err);
        alert('Bitte Kamera und Mikrofon erlauben!');
      });

    // Auf Updates von anderen Tabs hören
    const handleStorage = (e) => {
      if (e.key === `session_${sessionId}_users`) {
        const updatedUsers = JSON.parse(e.newValue);
        setParticipants(updatedUsers);
      }
    };
    
    window.addEventListener('storage', handleStorage);
    
    return () => {
      window.removeEventListener('storage', handleStorage);
      // User entfernen wenn Seite geschlossen wird
      const users = JSON.parse(localStorage.getItem(`session_${sessionId}_users`) || '[]');
      const filtered = users.filter(u => u.name !== username);
      localStorage.setItem(`session_${sessionId}_users`, JSON.stringify(filtered));
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [sessionId, username, isHost]);

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

  const copySessionLink = () => {
    const link = window.location.href;
    navigator.clipboard.writeText(link);
    alert(`✅ Link kopiert!\n\nTeile diesen Link mit anderen:\n${link}`);
  };

  const leaveSession = () => {
    // User aus Liste entfernen
    const users = JSON.parse(localStorage.getItem(`session_${sessionId}_users`) || '[]');
    const filtered = users.filter(u => u.name !== username);
    localStorage.setItem(`session_${sessionId}_users`, JSON.stringify(filtered));
    
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    router.push('/');
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>🎥 Session: <span style={styles.code}>{sessionId}</span></h2>
          <p style={styles.user}>👤 {username} {isHost && '👑'}</p>
          <p style={styles.info}>📡 {participants.length} Teilnehmer online</p>
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
          </div>
        </div>
        
        {/* Andere Teilnehmer (Platzhalter) */}
        {participants.filter(p => p.name !== username).map(p => (
          <div key={p.id} style={styles.videoCard}>
            <div style={styles.placeholder}>
              <div style={styles.avatar}>👤</div>
              <div style={styles.placeholderName}>{p.name}</div>
              <div style={styles.joinedTime}>joined {p.joinedAt}</div>
            </div>
            <div style={styles.label}>{p.name}</div>
          </div>
        ))}
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
    borderBottom: '1px solid rgba(102,126,234,0.3)'
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
    height: 'calc(100vh - 160px)',
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
