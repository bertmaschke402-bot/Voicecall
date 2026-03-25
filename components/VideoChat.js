import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Peer from 'peerjs';

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
  const [peerId, setPeerId] = useState('');
  const videoRef = useRef();
  const peerRef = useRef();
  const peersRef = useRef({});
  const router = useRouter();

  // PeerJS Verbindung
  useEffect(() => {
    const peer = new Peer();
    
    peer.on('open', id => {
      setPeerId(id);
      console.log('My peer ID:', id);
      
      // In localStorage speichern für Session
      const sessionPeers = JSON.parse(localStorage.getItem(`session_${sessionId}`) || '[]');
      
      if (isHost) {
        // Host speichert seine ID
        localStorage.setItem(`session_${sessionId}`, JSON.stringify([id]));
      } else {
        // Guest joined - Host benachrichtigen
        const hostId = sessionPeers[0];
        if (hostId) {
          callPeer(hostId);
        }
      }
    });

    peer.on('call', call => {
      navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then(myStream => {
          setStream(myStream);
          if (videoRef.current) {
            videoRef.current.srcObject = myStream;
          }
          call.answer(myStream);
          call.on('stream', remoteStream => {
            setPeers(prev => [...prev, { id: call.peer, stream: remoteStream }]);
            setParticipants(prev => [...prev, { id: call.peer, name: 'Teilnehmer' }]);
            addSystemMessage(`👤 Teilnehmer ist beigetreten`);
          });
        });
    });

    peerRef.current = peer;

    // Eigene Kamera starten
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

    return () => {
      peer.destroy();
    };
  }, [sessionId, isHost]);

  const callPeer = (remotePeerId) => {
    if (stream && remotePeerId) {
      const call = peerRef.current.call(remotePeerId, stream);
      call.on('stream', remoteStream => {
        setPeers(prev => [...prev, { id: remotePeerId, stream: remoteStream }]);
        setParticipants(prev => [...prev, { id: remotePeerId, name: 'Teilnehmer' }]);
        addSystemMessage(`👤 Teilnehmer ist beigetreten`);
      });
      peersRef.current[remotePeerId] = call;
    }
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
      
      // Nachricht in localStorage speichern für Session
      const chatMessages = JSON.parse(localStorage.getItem(`chat_${sessionId}`) || '[]');
      chatMessages.push(newMessage);
      localStorage.setItem(`chat_${sessionId}`, JSON.stringify(chatMessages));
      
      // Andere Teilnehmer sehen Nachrichten über Storage Event
      window.dispatchEvent(new StorageEvent('storage', {
        key: `chat_${sessionId}`,
        newValue: JSON.stringify(chatMessages)
      }));
    }
  };

  // Storage Event für Chat
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === `chat_${sessionId}` && e.newValue) {
        const newMessages = JSON.parse(e.newValue);
        setMessages(newMessages);
      }
    };
    
    window.addEventListener('storage', handleStorage);
    
    // Bestehende Nachrichten laden
    const savedMessages = localStorage.getItem(`chat_${sessionId}`);
    if (savedMessages) {
      setMessages(JSON.parse(savedMessages));
    }
    
    return () => window.removeEventListener('storage', handleStorage);
  }, [sessionId]);

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
        
        if (videoRef.current && videoRef.current.srcObject) {
          const videoTrack = screenStream.getVideoTracks()[0];
          const sender = videoRef.current.srcObject.getVideoTracks()[0];
          videoRef.current.srcObject.removeTrack(sender);
          videoRef.current.srcObject.addTrack(videoTrack);
        }
        
        setSharingScreen(true);
        addSystemMessage('📺 Screen Sharing gestartet');
        
        screenStream.getVideoTracks()[0].onended = () => {
          toggleScreenShare();
        };
      } catch (err) {
        console.error('Screen Share Fehler:', err);
        addSystemMessage('❌ Screen Share abgebrochen');
      }
    } else {
      // Zurück zur Kamera
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(newStream => {
          const newVideoTrack = newStream.getVideoTracks()[0];
          const oldStream = videoRef.current.srcObject;
          const oldVideoTrack = oldStream.getVideoTracks()[0];
          oldStream.removeTrack(oldVideoTrack);
          oldStream.addTrack(newVideoTrack);
          setSharingScreen(false);
          addSystemMessage('📺 Screen Sharing beendet');
        });
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
    if (peerRef.current) {
      peerRef.current.destroy();
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
            <p style={styles.peerInfo}>ID: {peerId.slice(-6)}</p>
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
                  <span>Teilnehmer</span>
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
            <button onClick={copySessionLink} style={styles.controlButton('#9b59b6')}>
              🔗
            </button>
            <button onClick={leaveSession} style={styles.controlButton('#e74c3c')}>
              🚪
            </button>
          </div>
        </div>

        <div style={styles.sidebar}>
          {showParticipants && (
            <div style={styles.participantsPanel}>
              <h3 style={styles.panelTitle}>👥 Teilnehmer ({participants.length + 1})</h3>
              <div style={styles.participantItem}>
                <div style={styles.participantAvatar}>🎥</div>
                <div style={styles.participantInfo}>
                  <span style={styles.participantName}>{username} {isHost && '👑'}</span>
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
                    <span style={styles.participantName}>Teilnehmer</span>
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
                <div style={styles.emptyChat}>💬 Keine Nachrichten yet</div>
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
  peerInfo: {
    color: '#48c6ef',
    fontSize: '10px',
    margin: '2px 0 0'
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
