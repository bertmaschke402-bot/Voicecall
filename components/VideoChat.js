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
      })
      .catch(err => {
        console.error('Kamera Fehler:', err);
      });

    // Teilnehmer aus localStorage laden
    const stored = localStorage.getItem(`participants_${sessionId}`);
    if (stored) {
      setParticipants(JSON.parse(stored));
    } else {
      setParticipants([{ id: Date.now(), name: username, isHost, isYou: true }]);
    }

    return () => {
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
    navigator.clipboard.writeText(window.location.href);
    alert('Link kopiert!');
  };

  const leaveSession = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    router.push('/');
  };

  const addDemoParticipant = () => {
    const newParticipant = {
      id: Date.now(),
      name: `Gast${Math.floor(Math.random() * 1000)}`,
      isHost: false,
      isYou: false
    };
    const updated = [...participants, newParticipant];
    setParticipants(updated);
    localStorage.setItem(`participants_${sessionId}`, JSON.stringify(updated));
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h2>Session: {sessionId}</h2>
          <p>{username} {isHost && '(Host)'}</p>
        </div>
        <div>
          <button onClick={copySessionLink} style={styles.button}>🔗 Link</button>
          {isHost && (
            <button onClick={addDemoParticipant} style={styles.button}>➕ Gast</button>
          )}
        </div>
      </div>

      <div style={styles.videoGrid}>
        <div style={styles.videoCard}>
          <video ref={videoRef} autoPlay playsInline muted style={styles.video} />
          <div style={styles.label}>
            {username} {muted && '🔇'} {sharingScreen && '📺'}
          </div>
        </div>
        
        {participants.filter(p => !p.isYou).map(p => (
          <div key={p.id} style={styles.videoCard}>
            <div style={styles.placeholder}>
              <div style={styles.avatar}>👤</div>
              <div>{p.name}</div>
            </div>
            <div style={styles.label}>{p.name}</div>
          </div>
        ))}
      </div>

      <div style={styles.controls}>
        <button onClick={toggleMute} style={styles.controlButton}>
          {muted ? '🔇' : '🎤'}
        </button>
        <button onClick={toggleVideo} style={styles.controlButton}>
          {videoEnabled ? '📹' : '📷'}
        </button>
        <button onClick={toggleScreenShare} style={styles.controlButton}>
          🖥️
        </button>
        <button onClick={leaveSession} style={styles.controlButton}>
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
    fontFamily: 'sans-serif'
  },
  header: {
    background: '#16213e',
    padding: '15px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    color: 'white'
  },
  button: {
    padding: '8px 16px',
    marginLeft: '10px',
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer'
  },
  videoGrid: {
    flex: 1,
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '20px',
    padding: '20px'
  },
  videoCard: {
    position: 'relative',
    background: '#0f3460',
    borderRadius: '12px',
    overflow: 'hidden',
    aspectRatio: '16/9'
  },
  video: {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  },
  placeholder: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white'
  },
  avatar: {
    fontSize: '48px',
    marginBottom: '10px'
  },
  label: {
    position: 'absolute',
    bottom: '10px',
    left: '10px',
    background: 'rgba(0,0,0,0.7)',
    padding: '5px 10px',
    borderRadius: '20px',
    color: 'white',
    fontSize: '12px'
  },
  controls: {
    background: '#16213e',
    padding: '20px',
    display: 'flex',
    justifyContent: 'center',
    gap: '15px'
  },
  controlButton: {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    backgroundColor: '#0f3460',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer'
  }
};
