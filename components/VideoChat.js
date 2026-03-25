import { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';

let socket;

export default function VideoChat({ sessionId, username, isHost }) {
  const [peers, setPeers] = useState({});
  const [stream, setStream] = useState(null);
  const [muted, setMuted] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [sharingScreen, setSharingScreen] = useState(false);
  const videoRef = useRef();
  const peersRef = useRef({});

  useEffect(() => {
    // Socket.IO Verbindung
    socket = io();

    socket.emit('join-room', { sessionId, username, isHost });

    // Eigene Kamera starten
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(myStream => {
        setStream(myStream);
        videoRef.current.srcObject = myStream;
      });

    socket.on('user-connected', (userId, userData) => {
      console.log('User connected:', userId, userData);
      // Hier würdest du neue Peer-Verbindungen aufbauen
    });

    socket.on('user-disconnected', (userId) => {
      if (peersRef.current[userId]) {
        peersRef.current[userId].destroy();
        delete peersRef.current[userId];
      }
      setPeers(prev => {
        const newPeers = { ...prev };
        delete newPeers[userId];
        return newPeers;
      });
    });

    return () => {
      socket.disconnect();
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
        // Screen Share Logic hier
        setSharingScreen(true);
        screenStream.getVideoTracks()[0].onended = () => {
          toggleScreenShare();
        };
      } catch (err) {
        console.error('Screen share failed:', err);
      }
    } else {
      setSharingScreen(false);
      // Screen Share stoppen
    }
  };

  const copySessionLink = () => {
    navigator.clipboard.writeText(window.location.href);
    alert('Session-Link kopiert!');
  };

  return (
    <div style={styles.container}>
      <div style={styles.controls}>
        <h3>Session: {sessionId}</h3>
        <div style={styles.buttonGroup}>
          <button onClick={toggleMute} style={styles.controlButton}>
            {muted ? '🔇 Mikrofon an' : '🎤 Mikrofon aus'}
          </button>
          <button onClick={toggleVideo} style={styles.controlButton}>
            {videoEnabled ? '📹 Kamera aus' : '📷 Kamera an'}
          </button>
          <button onClick={toggleScreenShare} style={styles.controlButton}>
            {sharingScreen ? '🖥️ Screen Share stoppen' : '🖥️ Screen Share'}
          </button>
          <button onClick={copySessionLink} style={styles.controlButton}>
            🔗 Link kopieren
          </button>
        </div>
      </div>
      
      <div style={styles.videoGrid}>
        <div style={styles.videoContainer}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={styles.video}
          />
          <div style={styles.username}>{username} (Du)</div>
        </div>
        
        {Object.entries(peers).map(([id, peer]) => (
          <div key={id} style={styles.videoContainer}>
            <video
              autoPlay
              playsInline
              ref={ref => {
                if (ref && peer) {
                  peer.stream && (ref.srcObject = peer.stream);
                }
              }}
              style={styles.video}
            />
            <div style={styles.username}>{peer.username}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: '#1a1a2e',
    padding: '20px',
    fontFamily: 'Arial, sans-serif'
  },
  controls: {
    background: '#16213e',
    padding: '15px',
    borderRadius: '10px',
    marginBottom: '20px',
    color: 'white',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap'
  },
  buttonGroup: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap'
  },
  controlButton: {
    padding: '10px 20px',
    backgroundColor: '#0f3460',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'background 0.3s'
  },
  videoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '20px',
    justifyContent: 'center'
  },
  videoContainer: {
    position: 'relative',
    background: '#0f3460',
    borderRadius: '10px',
    overflow: 'hidden',
    aspectRatio: '16/9'
  },
  video: {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  },
  username: {
    position: 'absolute',
    bottom: '10px',
    left: '10px',
    background: 'rgba(0,0,0,0.7)',
    color: 'white',
    padding: '5px 10px',
    borderRadius: '5px',
    fontSize: '12px'
  }
};
