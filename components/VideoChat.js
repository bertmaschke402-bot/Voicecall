import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';

export default function VideoChat({ sessionId, username, isHost }) {
  const [muted, setMuted] = useState(false);
  const [sharingScreen, setSharingScreen] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [showParticipants, setShowParticipants] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const videoRef = useRef();
  const router = useRouter();

  useEffect(() => {
    // Teilnehmer simulieren (in echter App via WebRTC)
    const mockParticipants = [
      { id: 1, name: username, isHost: isHost, isYou: true, avatar: '🎥' },
      { id: 2, name: 'Max Mustermann', isHost: false, isYou: false, avatar: '👤' },
      { id: 3, name: 'Anna Schmidt', isHost: false, isYou: false, avatar: '👩' },
    ];
    
    if (!isHost) {
      mockParticipants.splice(1, 2);
    }
    
    setParticipants(mockParticipants);

    // Canvas Platzhalter mit Animation
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    let animationFrame;
    let rotation = 0;

    const drawFrame = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      rotation += 0.01;
      
      // Neon Gradient Background
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, '#667eea');
      gradient.addColorStop(0.5, '#764ba2');
      gradient.addColorStop(1, '#f093fb');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Neon Grid
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 1;
      for (let i = 0; i < canvas.width; i += 50) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(canvas.width, i);
        ctx.stroke();
      }
      
      // Pulsing Circle
      const pulse = Math.sin(rotation * 2) * 10 + 50;
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#fff';
      ctx.beginPath();
      ctx.arc(canvas.width/2, canvas.height/2 - 30, pulse, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.fill();
      
      // Neon Text
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#00ff00';
      ctx.font = 'bold 32px "Courier New", monospace';
      ctx.fillStyle = '#fff';
      ctx.fillText('🎥 LIVE', canvas.width/2 - 70, canvas.height/2 - 50);
      
      ctx.font = '20px Arial';
      ctx.fillStyle = '#0ff';
      ctx.fillText(username, canvas.width/2 - 50, canvas.height/2 + 20);
      
      ctx.font = '14px monospace';
      ctx.fillStyle = '#ff0';
      ctx.fillText(`Session: ${sessionId}`, canvas.width/2 - 60, canvas.height/2 + 70);
      
      ctx.font = '12px monospace';
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fillText('✨ Screen Share aktivieren für Video', canvas.width/2 - 120, canvas.height - 30);
      
      ctx.shadowBlur = 0;
      
      animationFrame = requestAnimationFrame(drawFrame);
    };
    
    drawFrame();
    
    const stream = canvas.captureStream(30);
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }

    return () => {
      cancelAnimationFrame(animationFrame);
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, [username, sessionId, isHost]);

  const toggleMute = () => {
    setMuted(!muted);
    addSystemMessage(muted ? 'Mikrofon aktiviert' : 'Mikrofon stummgeschaltet');
  };

  const toggleScreenShare = async () => {
    if (!sharingScreen) {
      try {
        const screen = await navigator.mediaDevices.getDisplayMedia({ 
          video: true 
        });
        
        if (videoRef.current) {
          if (videoRef.current.srcObject) {
            const oldTracks = videoRef.current.srcObject.getTracks();
            oldTracks.forEach(track => track.stop());
          }
          videoRef.current.srcObject = screen;
        }
        
        setSharingScreen(true);
        addSystemMessage('Screen Sharing gestartet');
        
        screen.getVideoTracks()[0].onended = () => {
          stopScreenShare();
        };
      } catch (err) {
        console.error('Screen Share Fehler:', err);
        addSystemMessage('Screen Share wurde abgebrochen');
      }
    } else {
      stopScreenShare();
    }
  };

  const stopScreenShare = () => {
    addSystemMessage('Screen Sharing beendet');
    window.location.reload(); // Einfacher Neustart
  };

  const addSystemMessage = (text) => {
    const newMessage = {
      id: Date.now(),
      user: 'System',
      text: text,
      isSystem: true,
      timestamp: new Date().toLocaleTimeString()
    };
    setMessages(prev => [...prev, newMessage]);
    setTimeout(() => {
      setMessages(prev => prev.filter(m => m.id !== newMessage.id));
    }, 3000);
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
      setTimeout(() => {
        // Automatisch scrollen
        const chatContainer = document.getElementById('chat-messages');
        if (chatContainer) {
          chatContainer.scrollTop = chatContainer.scrollHeight;
        }
      }, 100);
    }
  };

  const copySessionLink = () => {
    const link = window.location.href;
    navigator.clipboard.writeText(link);
    addSystemMessage('✅ Link in Zwischenablage kopiert!');
  };

  const leaveSession = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
    }
    router.push('/');
  };

  return (
    <div style={styles.container}>
      {/* Neon Glow Effect */}
      <div style={styles.neonGlow}></div>
      
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
            style={styles.iconButton(showParticipants ? '#667eea' : '#2c3e50')}
            title="Teilnehmer"
          >
            👥 {participants.length}
          </button>
          <button onClick={copySessionLink} style={styles.iconButton('#2c3e50')} title="Link kopieren">
            🔗
          </button>
        </div>
      </div>

      <div style={styles.mainContent}>
        {/* Video Bereich */}
        <div style={styles.videoSection}>
          <div style={styles.videoCard}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={styles.video}
            />
            <div style={styles.videoOverlay}>
              <div style={styles.videoLabel}>
                <span style={styles.liveBadge}>● LIVE</span>
                <span>{username}</span>
                {muted && <span style={styles.mutedBadge}>🔇 MUTED</span>}
                {sharingScreen && <span style={styles.sharingBadge}>📺 SCREEN</span>}
              </div>
            </div>
          </div>
          
          {/* Control Buttons */}
          <div style={styles.controls}>
            <button 
              onClick={toggleMute} 
              style={styles.controlButton(muted ? '#e74c3c' : '#2ecc71', muted)}
              title={muted ? "Mikrofon an" : "Mikrofon aus"}
            >
              {muted ? '🔇' : '🎤'}
            </button>
            
            <button 
              onClick={toggleScreenShare} 
              style={styles.controlButton(sharingScreen ? '#e67e22' : '#3498db', sharingScreen)}
              title={sharingScreen ? "Screen Share stoppen" : "Screen Share starten"}
            >
              🖥️
            </button>
            
            <button 
              onClick={copySessionLink} 
              style={styles.controlButton('#9b59b6', false)}
              title="Link kopieren"
            >
              🔗
            </button>
            
            <button 
              onClick={leaveSession} 
              style={styles.controlButton('#e74c3c', false)}
              title="Verlassen"
            >
              🚪
            </button>
          </div>
        </div>

        {/* Teilnehmer & Chat Bereich */}
        <div style={styles.sidebar}>
          {/* Teilnehmer Liste */}
          {showParticipants && (
            <div style={styles.participantsPanel}>
              <h3 style={styles.panelTitle}>
                👥 Teilnehmer ({participants.length})
              </h3>
              {participants.map(p => (
                <div key={p.id} style={styles.participantItem}>
                  <div style={styles.participantAvatar}>{p.avatar}</div>
                  <div style={styles.participantInfo}>
                    <span style={styles.participantName}>
                      {p.name} {p.isHost && '👑'}
                    </span>
                    {p.isYou && <span style={styles.youBadge}>Du</span>}
                  </div>
                  <div style={styles.participantStatus}>
                    <span style={styles.statusDot}></span>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Chat Bereich */}
          <div style={styles.chatPanel}>
            <h3 style={styles.panelTitle}>
              💬 Chat
            </h3>
            <div id="chat-messages" style={styles.chatMessages}>
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
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    position: 'relative',
    overflow: 'hidden'
  },
  neonGlow: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: '50%',
    height: '50%',
    background: 'radial-gradient(circle, rgba(102,126,234,0.3) 0%, rgba(0,0,0,0) 70%)',
    transform: 'translate(-50%, -50%)',
    pointerEvents: 'none',
    animation: 'pulse 4s ease-in-out infinite'
  },
  header: {
    background: 'rgba(0,0,0,0.5)',
    backdropFilter: 'blur(10px)',
    padding: '15px 30px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid rgba(102,126,234,0.3)',
    position: 'relative',
    zIndex: 10
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
    WebkitTextFillColor: 'transparent',
    textShadow: '0 0 30px rgba(102,126,234,0.5)'
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
  iconButton: (bgColor) => ({
    background: bgColor,
    border: 'none',
    borderRadius: '10px',
    padding: '8px 12px',
    color: 'white',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.3s ease',
    backdropFilter: 'blur(10px)'
  }),
  mainContent: {
    display: 'grid',
    gridTemplateColumns: '1fr 320px',
    gap: '20px',
    padding: '20px',
    height: 'calc(100vh - 80px)',
    position: 'relative',
    zIndex: 5
  },
  videoSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  videoCard: {
    position: 'relative',
    background: '#000',
    borderRadius: '20px',
    overflow: 'hidden',
    aspectRatio: '16/9',
    boxShadow: '0 0 30px rgba(102,126,234,0.3)',
    animation: 'glow 2s ease-in-out infinite'
  },
  video: {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  },
  videoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
    padding: '20px'
  },
  videoLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    color: 'white',
    fontSize: '14px'
  },
  liveBadge: {
    background: '#e74c3c',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '10px',
    fontWeight: 'bold',
    animation: 'pulse 1.5s ease-in-out infinite'
  },
  mutedBadge: {
    background: '#e74c3c',
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '10px'
  },
  sharingBadge: {
    background: '#e67e22',
    padding: '2px 8px',
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
  controlButton: (bgColor, isActive) => ({
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    backgroundColor: bgColor,
    border: isActive ? '2px solid white' : 'none',
    fontSize: '24px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: `0 0 20px ${bgColor}`,
    animation: isActive ? 'pulse 2s infinite' : 'none'
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
    animation: 'slideIn 0.3s ease-out'
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
    transition: 'all 0.3s ease'
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
    display: 'inline-block',
    animation: 'pulse 2s infinite'
  },
  chatMessages: {
    flex: 1,
    overflowY: 'auto',
    marginBottom: '15px',
    maxHeight: '300px'
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

// CSS Animations (füge das in eine globale CSS-Datei oder style Tag ein)
const globalStyles = `
@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(1.05); }
}

@keyframes glow {
  0%, 100% { box-shadow: 0 0 20px rgba(102,126,234,0.3); }
  50% { box-shadow: 0 0 40px rgba(102,126,234,0.6); }
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
`;

if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = globalStyles;
  document.head.appendChild(style);
}
