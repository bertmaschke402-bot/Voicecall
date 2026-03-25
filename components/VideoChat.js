import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';

export default function VideoChat({ sessionId, username, isHost }) {
  const [muted, setMuted] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [sharingScreen, setSharingScreen] = useState(false);
  const [stream, setStream] = useState(null);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [showParticipants, setShowParticipants] = useState(true);
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
        
        // Teilnehmer aus localStorage laden
        const stored = localStorage.getItem(`participants_${sessionId}`);
        if (stored) {
          setParticipants(JSON.parse(stored));
        } else {
          setParticipants([{ id: Date.now(), name: username, isHost, isYou: true }]);
        }
      })
      .catch(err => {
        console.error('Kamera Fehler:', err);
      });

    // Chat-Nachrichten laden
    const savedMessages = localStorage.getItem(`chat_${sessionId}`);
    if (savedMessages) {
      setMessages(JSON.parse(savedMessages));
    }

    // Storage Event für andere Tabs/Fenster
    const handleStorage = (e) => {
      if (e.key === `participants_${sessionId}` && e.newValue) {
        setParticipants(JSON.parse(e.newValue));
      }
      if (e.key === `chat_${sessionId}` && e.newValue) {
        setMessages(JSON.parse(e.newValue));
      }
    };
    
    window.addEventListener('storage', handleStorage);
    
    return () => {
      window.removeEventListener('storage', handleStorage);
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [sessionId, username, isHost]);

  const addSystemMessage = (text) => {
    const newMessage = {
      id: Date.now(),
      user: 'System',
      text: text,
      isSystem: true,
      timestamp: new Date().toLocaleTimeString()
    };
    const updated = [...messages, newMessage];
    setMessages(updated);
    localStorage.setItem(`chat_${sessionId}`, JSON.stringify(updated));
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
      const updated = [...messages, newMessage];
      setMessages(updated);
      localStorage.setItem(`chat_${sessionId}`, JSON.stringify(updated));
      setMessage('');
      
      // Scroll nach unten
      setTimeout(() => {
        const chatDiv = document.getElementById('chat-messages');
        if (chatDiv) chatDiv.scrollTop = chatDiv.scrollHeight;
      }, 100);
    }
  };

  const addParticipant = () => {
    // Simuliere neuen Teilnehmer (für Demo)
    const newParticipant = {
      id: Date.now(),
      name: `Gast${Math.floor(Math.random() * 1000)}`,
      isHost: false,
      isYou: false
    };
    const updated = [...participants, newParticipant];
    setParticipants(updated);
    localStorage.setItem(`participants_${sessionId}`, JSON.stringify(updated));
    addSystemMessage(`👤 ${newParticipant.name} ist beigetreten`);
  };

  const removeParticipant = (id) => {
    const participant = participants.find(p => p.id === id);
    const updated = participants.filter(p => p.id !== id);
    setParticipants(updated);
    localStorage.setItem(`participants_${sessionId}`, JSON.stringify(updated));
    if (participant) {
      addSystemMessage(`👋 ${participant.name} hat verlassen`);
    }
  };

  const toggleMute = () => {
    if (stream) {
      stream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setMuted(!muted);
      addSystemMessage(muted ? '🎤 Mikrofon an' : '🔇 Mikrofon aus');
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
        if (videoRef.current) {
          const videoTrack = screenStream.getVideoTracks()[0];
          const oldVideoTrack = stream.getVideoTracks()[0];
          stream.removeTrack(oldVideoTrack);
          stream.addTrack(videoTrack);
        }
        setSharingScreen(true);
        addSystemMessage('📺 Screen Share gestartet');
        screenStream.getVideoTracks()[0].onended = () => {
          stopScreenShare();
        };
      } catch (err) {
        addSystemMessage('❌ Screen Share abgebrochen');
      }
    } else {
      stopScreenShare();
    }
  };

  const stopScreenShare = async () => {
    const newStream = await navigator.mediaDevices.getUserMedia({ video: true });
    const newVideoTrack = newStream.getVideoTracks()[0];
    const oldVideoTrack = stream.getVideoTracks()[0];
    stream.removeTrack(oldVideoTrack);
    stream.addTrack(newVideoTrack);
    setSharingScreen(false);
    addSystemMessage('📺 Screen Share beendet');
  };

  const copySessionLink = () => {
    navigator.clipboard.writeText(window.location.href);
    addSystemMessage('✅ Link kopiert!');
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
          <button onClick={() => setShowParticipants(!showParticipants)} style={styles.iconButton}>
            👥 {participants.length}
          </button>
          <button onClick={copySessionLink} style={styles.iconButton}>🔗</button>
          {isHost && (
            <button onClick={addParticipant} style={styles.iconButton}>➕</button>
          )}
        </div>
      </div>

      <div style={styles.mainContent}>
        <div style={styles.videoSection}>
          <div style={styles.videoGrid}>
            <div style={styles.videoCard}>
              <video ref={videoRef} autoPlay playsInline muted style={styles.video} />
              <div style={styles.videoLabel}>
                <span style={styles.liveBadge}>● YOU</span>
                <span>{username}</span>
                {muted && <span style={styles.mutedBadge}>🔇</span>}
                {sharingScreen && <span style={styles.sharingBadge}>📺</span>}
              </div>
            </div>
            
            {participants.filter(p => !p.isYou).map(p => (
              <div key={p.id} style={styles.videoCard}>
                <div style={styles.placeholderVideo}>
                  <div style={styles.placeholderContent}>
                    <span style={styles.placeholderIcon}>👤</span>
                    <span>{p.name}</span>
                  </div>
                </div>
                <div style={styles.videoLabel}>
                  <span>{p.name}</span>
                  {!isHost && (
                    <button 
                      onClick={() => removeParticipant(p.id)}
                      style={styles.removeButton}
                      title="Entfernen"
                    >
                      ✕
                    </button>
                  )}
                </div>
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
            <button onClick={copySessionLink} style={styles.controlButton('#9b59b6')}>🔗</button>
            <button onClick={leaveSession} style={styles.controlButton('#e74c3c')}>🚪</button>
          </div>
        </div>

        <div style={styles.sidebar}>
          {showParticipants && (
            <div style={styles.participantsPanel}>
              <h3 style={styles.panelTitle}>👥 Teilnehmer ({participants.length})</h3>
              {participants.map(p => (
                <div key={p.id} style={styles.participantItem}>
                  <div style={styles.participantAvatar}>{p.isYou ? '🎥' : '👤'}</div>
                  <div style={styles.participantInfo}>
                    <span style={styles.participantName}>{p.name}</span>
                    {p.isHost && <span style={styles.hostBadgeSmall}>👑</span>}
                    {p.isYou && <span style={styles.youBadge}>Du</span>}
                  </div>
                  <div style={styles.participantStatus}>
                    <span style={styles.statusDot}></span>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <div style={styles.chatPanel}>
            <h3 style={styles.panelTitle}>💬 Chat ({messages.length})</h3>
            <div id="chat-messages" style={styles.chatMessages}>
              {messages.length === 0 && (
                <div style={styles.emptyChat}>💬 Keine Nachrichten</div>
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
              <button onClick={sendMessage} style={styles.sendButton}>📤</button>
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
  hostBadgeSmall: {
    fontSize: '12px',
    marginLeft: '4px'
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
    gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
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
  placeholderVideo: {
    width: '100%',
    height: '100%',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  placeholderContent: {
    textAlign: 'center',
    color: 'white',
    fontSize: '24px'
  },
  placeholderIcon: {
    fontSize: '48px',
    display: 'block',
    marginBottom: '10px'
  },
  videoLabel: {
    position: 'absolute',
    bottom: '10px',
    left: '10px',
    right: '10px',
    background: 'rgba(0,0,0,0.7)',
    padding: '5px 10px',
    borderRadius: '20px',
    color: 'white',
    fontSize: '12px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
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
  removeButton: {
    background: '#e74c3c',
    border: 'none',
    borderRadius: '50%',
    width: '20px',
    height: '20px',
    color: 'white',
    fontSize: '12px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
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
