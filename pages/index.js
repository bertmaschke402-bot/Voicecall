import { useState } from 'react';
import { useRouter } from 'next/router';

export default function Home() {
  const [sessionName, setSessionName] = useState('');
  const [username, setUsername] = useState('');
  const router = useRouter();

  const createSession = () => {
    if (username.trim()) {
      // Generiere zufällige Session ID
      const sessionId = Math.random().toString(36).substring(2, 8).toUpperCase();
      // Speichere in URL und geh direkt zur Session
      router.push(`/${sessionId}?username=${encodeURIComponent(username)}&host=true`);
    } else {
      alert('Bitte gib deinen Namen ein');
    }
  };

  const joinSession = () => {
    if (sessionName.trim() && username.trim()) {
      // Direkt zur Session gehen - kein Check nötig
      router.push(`/${sessionName.toUpperCase()}?username=${encodeURIComponent(username)}`);
    } else {
      alert('Bitte gib Session-Code und Namen ein');
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>🎥 Video Chat</h1>
        <p style={styles.subtitle}>Teile den Link mit Freunden!</p>
        
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Neue Session starten</h2>
          <input
            type="text"
            placeholder="Dein Name"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={styles.input}
          />
          <button onClick={createSession} style={styles.buttonPrimary}>
            ✨ Session erstellen
          </button>
        </div>

        <div style={styles.divider}>
          <span>oder</span>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Session beitreten</h2>
          <input
            type="text"
            placeholder="Session-Code (z.B. ABC123)"
            value={sessionName}
            onChange={(e) => setSessionName(e.target.value.toUpperCase())}
            style={styles.input}
          />
          <input
            type="text"
            placeholder="Dein Name"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={styles.input}
          />
          <button onClick={joinSession} style={styles.buttonSecondary}>
            🚪 Session beitreten
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    padding: '20px'
  },
  card: {
    background: 'white',
    padding: '40px',
    borderRadius: '20px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
    maxWidth: '450px',
    width: '100%'
  },
  title: {
    textAlign: 'center',
    color: '#333',
    marginBottom: '10px',
    fontSize: '32px'
  },
  subtitle: {
    textAlign: 'center',
    color: '#666',
    marginBottom: '30px',
    fontSize: '14px'
  },
  section: {
    marginBottom: '30px'
  },
  sectionTitle: {
    fontSize: '18px',
    color: '#555',
    marginBottom: '15px'
  },
  input: {
    width: '100%',
    padding: '12px',
    margin: '8px 0',
    border: '2px solid #e0e0e0',
    borderRadius: '10px',
    fontSize: '16px',
    boxSizing: 'border-box'
  },
  buttonPrimary: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    marginTop: '10px'
  },
  buttonSecondary: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#48c6ef',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    marginTop: '10px'
  },
  divider: {
    textAlign: 'center',
    margin: '20px 0',
    position: 'relative',
    borderTop: '1px solid #e0e0e0'
  }
};
