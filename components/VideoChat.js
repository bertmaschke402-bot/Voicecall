import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import io from 'socket.io-client';
import Peer from 'simple-peer';

let socket;

export default function VideoChat({ sessionId, username, isHost }) {
  const [peers, setPeers] = useState([]);
  const [muted, setMuted] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [sharingScreen, setSharingScreen] = useState(false);
  const [stream, setStream] = useState(null);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [showParticipants, setShowParticipants] = useState(true);
  const videoRef = useRef();
  const peersRef = useRef({});
  const router = useRouter();

  // Eigene Kamera starten
  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(myStream => {
        setStream(myStream);
        if (videoRef.current) {
          videoRef.current.srcObject = myStream;
        }
      })
      .catch(err => {
        console.error('Kamera Fehler:', err);
        // Fallback zu Canvas wenn Kamera nicht funktioniert
        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 480;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#667eea';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'white';
        ctx.font = '20px Arial';
        ctx.fillText('📹 Kamera nicht verfügbar', 200, 240);
        ctx.fillText(`Eingeloggt als: ${username}`, 200, 280);
        const canvasStream = canvas.captureStream();
        setStream(canvasStream);
        if (videoRef.current) {
          videoRef.current.srcObject = canvasStream;
        }
      });
  }, []);

  // Socket.IO und Peer Verbindungen
  useEffect(() => {
    if (!stream) return;

    // Socket.IO Verbindung
    socket = io();

    socket.on('connect', () => {
      console.log('Connected to server');
      socket.emit('join-room', { roomId: sessionId, username });
    });

    socket.on('user-connected', ({ userId, username: userName }) => {
      console.log('User connected:', userId, userName);
      
      // Neuen Peer erstellen
      const peer = new Peer({
        initiator: true,
        trickle: false,
        stream: stream
      });

      peer.on('signal', signal => {
        socket.emit('signal', { to: userId, signal });
      });

      peer.on('stream', remoteStream => {
        setPeers(prev => [...prev, { id: userId, stream: remoteStream, username: userName }]);
        setParticipants(prev => [...prev, { id: userId, name: userName }]);
        addSystemMessage(`👤 ${userName} ist dem Chat beigetreten`);
      });

      peersRef.current[userId] = peer;
    });

    socket.on('signal', ({ from, signal }) => {
      // Peer existiert noch nicht? Dann erstellen
      if (!peersRef.current[from]) {
        const peer = new Peer({
          initiator: false,
          trickle: false,
          stream: stream
        });

        peer.on('signal', signal => {
          socket.emit('signal', { to: from, signal });
        });

        peer.on('stream', remoteStream => {
          setPeers(prev => [...prev, { id: from, stream: remoteStream, username: 'Gast' }]);
          setParticipants(prev => [...prev, { id: from, name: 'Gast' }]);
        });

        peersRef.current[from] = peer;
      }

      peersRef.current[from].signal(signal);
    });

    socket.on('user-disconnected', userId => {
      console.log('User disconnected:', userId);
      if (peersRef.current[userId]) {
        peersRef.current[userId].destroy();
        delete peersRef.current[userId];
      }
      setPeers(prev => prev.filter(peer => peer.id !== userId));
      setParticipants(prev => prev.filter(p => p.id !== userId));
      addSystemMessage(`👋 Ein Teilnehmer hat den Chat verlassen`);
    });

    return () => {
      socket.disconnect();
    };
  }, [stream, sessionId, username]);

  const addSystemMessage = (text) => {
    const newMessage = {
      id: Date.now(),
      user: 'System',
      text: text,
      isSystem: true,
      timestamp: new Date().toLocaleTimeString()
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const sendMessage = () => {
    if (message.trim()) {
      const newMessage = {
        id: Date.now(),
        user: username,
        text: message,
        isSystem: false,
        timestamp: new Date().toLocaleTimeString()
      };
      setMessages(prev => [...prev, newMessage]);
      setMessage('');
      
      // Nachricht an alle über Socket.IO senden
      socket.emit('chat-message', { roomId: sessionId, message: newMessage });
    }
  };

  const toggleMute = () => {
    if (stream) {
      stream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setMuted(!muted);
      addSystemMessage(muted ? '🎤 Mikrofon aktiviert' : '🔇 Mikrofon stumm');
    }
  };

  const toggleVideo = () => {
    if (stream) {
      stream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setVideoEnabled(!videoEnabled);
      addSystemMessage(videoEnabled ? '📹 Kamera aus' : '📷 Kamera an');
    }
  };

  const toggleScreenShare = async () => {
    if (!sharingScreen) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        
        // Video track ersetzen für alle Peers
        const videoTrack = screenStream.getVideoTracks()[0];
        const senders = videoRef.current.srcObject.getSenders();
        const videoSender = senders.find(sender => sender.track.kind === 'video');
        videoSender.replaceTrack(videoTrack);
        
        setSharingScreen(true);
        addSystemMessage('📺 Screen Sharing gestartet');
        
        videoTrack.onended = () => {
          toggleScreenShare();
        };
      } catch (err) {
        console.error('Screen Share Fehler:', err);
        addSystemMessage('❌ Screen Share abgebrochen');
      }
    } else {
      // Zurück zur Kamera
      const videoTrack = stream.getVideoTracks()[0];
      const senders = videoRef.current.srcObject.getSenders();
      const videoSender = senders.find(sender => sender.track.kind === 'video');
      videoSender.replaceTrack(videoTrack);
      setSharingScreen(false);
      addSystemMessage('📺 Screen Sharing beendet');
    }
  };

  const copySessionLink = () => {
    const link = window.location.href;
    navigator.clipboard.writeText(link);
    addSystemMessage('✅ Session-Link kopiert!');
  };

  const leaveSession = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    socket.disconnect();
    router.push('/');
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.neonLogo}>🎥 VC</div>
          <div>
            <h2 style={styles.sessionTitle}>
              Session: <span style={styles.neonText}>{sessionId}</span>
            </h2>
            <p style={styles.userInfo}>
              {username} {isHost && <span style={styles.hostBadge}>👑 HOST</span>}
            </p>
          </div>
        </div>
        
        <div style={styles.headerRight}>
          <button 
            onClick={() => setShowParticipants(!showParticipants)} 
            style={styles.iconButton}
            title="Teilnehmer"
          >
            👥 {participants.length + 1}
          </button>
          <button onClick={copySessionLink} style={styles.iconButton} title="Link kopieren">
            🔗
          </button>
        </div>
      </div>

      <div style={styles.mainContent}>
        <div style={styles.videoSection}>
          <div style={styles.videoGrid}>
            {/* Eigener Video-Stream */}
            <div style={styles.videoCard}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={styles.video}
              />
              <div style={styles.videoLabel}>
                <span style={styles.liveBadge}>● YOU</span>
                <span>{username}</span>
                {muted && <span style={styles.mutedBadge}>🔇</span>}
                {sharingScreen && <span style={styles.sharingBadge}>📺</span>}
              </div>
            </div>
            
            {/* Andere Teilnehmer */}
            {peers.map(peer => (
              <div key={peer.id} style={styles.videoCard}>
                <video
                  autoPlay
                  playsInline
                  ref={ref => {
                    if (ref) ref.srcObject = peer.stream;
                  }}
                  style={styles.video}
                />
                <div style={styles.videoLabel}>
                  <span>{peer.username || 'Teilnehmer'}</span>
                </div>
              </div>
            ))}
          </div>
          
          <div style={styles.controls}>
            <button 
              onClick={toggleMute} 
              style={styles.controlButton(muted ? '#e74c3c' : '#2ecc71')}
            >
              {muted ? '🔇' : '🎤'}
            </button>
            
            <button 
              onClick={toggleVideo} 
              style={styles.controlButton(videoEnabled ? '#2ecc71' : '#e74c3c')}
            >
              {videoEnabled ? '📹' : '📷'}
            </button>
            
            <button 
              onClick={toggleScreenShare} 
              style={styles.controlButton(sharingScreen ? '#e67e22' : '#3498db')}
            >
              🖥️
            </button>
            
            <button 
              onClick={copySessionLink} 
              style={styles.controlButton('#9b59b6')}
            >
              🔗
            </button>
            
            <button 
              onClick={leaveSession} 
              style={styles.controlButton('#e74c3c')}
            >
              🚪
            </button>
          </div>
        </div>

        <div style={styles.sidebar}>
          {showParticipants && (
            <div style={styles.participantsPanel}>
              <h3 style={styles.panelTitle}>
                👥 Teilnehmer ({participants.length + 1})
              </h3>
              <div style={styles.participantItem}>
                <div style={styles.participantAvatar}>🎥</div>
                <div style={styles.participantInfo}>
                  <span style={styles.participantName}>
                    {username} {isHost && '👑'}
                  </span>
                  <span style={styles.youBadge}>Du</span>
                </div>
                <div style={styles.participantStatus}>
                  <span style={styles.statusDot}></span>
                </div>
              </div>
              {participants.map(p => (
                <div key={p.id} style={styles.participantItem}>
                  <div style={styles.participantAvatar}>👤</div>
                  <div style={styles.participantInfo}>
                    <span style={styles.participantName}>{p.name}</span>
                  </div>
                  <div style={styles.participantStatus}>
                    <span style={styles.statusDot}></span>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <div style={styles.chatPanel}>
            <h3 style={styles.panelTitle}>
              💬 Chat ({messages.length})
            </h3>
            <div id="chat-messages" style={styles.chatMessages}>
              {messages.length === 0 && (
                <div style={styles.emptyChat}>
                  💬 Keine Nachrichten yet
                </div>
              )}
              {messages.map(msg => (
                <div key={msg.id} style={msg.isSystem ? styles.systemMessage : styles.userMessage}>
                  <div style={styles.messageHeader}>
                    <span style={styles.messageUser}>{msg.user}</span>
                    <span style={styles.messageTime}>{msg.timestamp}</span>
                  </div>
                  <div style={styles.messageText}>{msg.text}</div>
                </div>
              ))}
            </div>
            <div style={styles.chatInput}>
              <input
                type="text"
                placeholder="Nachricht senden..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                style={styles.input}
              />
              <button onClick={sendMessage} style={styles.sendButton}>
                📤
              </button>
            </div>
          </div>
        </div>
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
    padding: '15px 30px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid rgba(102,126,234,0.3)'
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px'
  },
  headerRight: {
    display: 'flex',
    gap: '10px'
  },
  neonLogo: {
    fontSize: '28px',
    fontWeight: 'bold',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent'
  },
  sessionTitle: {
    color: 'white',
    margin: 0,
    fontSize: '18px'
  },
  neonText: {
    color: '#667eea',
    textShadow: '0 0 10px #667eea',
    fontWeight: 'bold'
  },
  userInfo: {
    color: '#aaa',
    margin: '5px 0 0',
    fontSize: '14px'
  },
  hostBadge: {
    background: 'linear-gradient(135deg, #ffd89b 0%, #c7e9fb 100%)',
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '10px',
    marginLeft: '8px'
  },
  iconButton: {
    background: '#2c3e50',
    border: 'none',
    borderRadius: '10px',
    padding: '8px 12px',
    color: 'white',
    cursor: 'pointer',
    fontSize: '14px'
  },
  mainContent: {
    display: 'grid',
    gridTemplateColumns: '1fr 320px',
    gap: '20px',
    padding: '20px',
    height: 'calc(100vh - 80px)'
  },
  videoSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  videoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '20px',
    flex: 1,
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
  videoLabel: {
    position: 'absolute',
    bottom: '10px',
    left: '10px',
    background: 'rgba(0,0,0,0.7)',
    padding: '5px 10px',
    borderRadius: '20px',
    color: 'white',
    fontSize: '12px',
    display: 'flex',
    gap: '8px'
  },
  liveBadge: {
    color: '#e74c3c',
    fontWeight: 'bold'
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
  controls: {
    display: 'flex',
    justifyContent: 'center',
    gap: '15px',
    padding: '20px',
    background: 'rgba(0,0,0,0.5)',
    backdropFilter: 'blur(10px)',
    borderRadius: '50px',
    margin: '0 auto',
    width: 'fit-content'
  },
  controlButton: (bgColor) => ({
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    backgroundColor: bgColor,
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    transition: 'transform 0.2s'
  }),
  sidebar: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  participantsPanel: {
    background: 'rgba(0,0,0,0.5)',
    backdropFilter: 'blur(10px)',
    borderRadius: '15px',
    padding: '15px',
    border: '1px solid rgba(102,126,234,0.3)',
    maxHeight: '300px',
    overflowY: 'auto'
  },
  chatPanel: {
    background: 'rgba(0,0,0,0.5)',
    backdropFilter: 'blur(10px)',
    borderRadius: '15px',
    padding: '15px',
    border: '1px solid rgba(102,126,234,0.3)',
    display: 'flex',
    flexDirection: 'column',
    flex: 1
  },
  panelTitle: {
    color: 'white',
    margin: '0 0 15px 0',
    fontSize: '16px',
    borderBottom: '1px solid rgba(102,126,234,0.3)',
    paddingBottom: '10px'
  },
  participantItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px',
    borderRadius: '8px',
    marginBottom: '5px'
  },
  participantAvatar: {
    width: '32px',
    height: '32px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px'
  },
  participantInfo: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  participantName: {
    color: 'white',
    fontSize: '14px'
  },
  youBadge: {
    background: '#667eea',
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '10px'
  },
  participantStatus: {
    width: '8px',
    height: '8px'
  },
  statusDot: {
    width: '8px',
    height: '8px',
    background: '#2ecc71',
    borderRadius: '50%',
    display: 'inline-block'
  },
  chatMessages: {
    flex: 1,
    overflowY: 'auto',
    marginBottom: '15px',
    maxHeight: '400px'
  },
  emptyChat: {
    textAlign: 'center',
    color: '#aaa',
    padding: '20px',
    fontSize: '12px'
  },
  systemMessage: {
    background: 'rgba(102,126,234,0.2)',
    padding: '8px',
    borderRadius: '8px',
    marginBottom: '8px',
    fontSize: '12px'
  },
  userMessage: {
    background: 'rgba(255,255,255,0.1)',
    padding: '8px',
    borderRadius: '8px',
    marginBottom: '8px'
  },
  messageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '4px',
    fontSize: '10px',
    color: '#aaa'
  },
  messageUser: {
    color: '#667eea',
    fontWeight: 'bold'
  },
  messageTime: {
    fontSize: '9px'
  },
  messageText: {
    color: 'white',
    fontSize: '12px'
  },
  chatInput: {
    display: 'flex',
    gap: '10px'
  },
  input: {
    flex: 1,
    padding: '10px',
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(102,126,234,0.3)',
    borderRadius: '10px',
    color: 'white',
    fontSize: '14px'
  },
  sendButton: {
    padding: '10px 15px',
    background: '#667eea',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '16px'
  }
};
