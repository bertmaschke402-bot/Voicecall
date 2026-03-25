import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

const VideoChat = dynamic(() => import('../components/VideoChat'), {
  ssr: false,
  loading: () => (
    <div style={styles.loading}>
      <div style={styles.spinner}></div>
      <p>Kamera wird geladen...</p>
    </div>
  )
});

export default function Session() {
  const router = useRouter();
  const { session, username, host } = router.query;
  const [permission, setPermission] = useState(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Prüfe Kamera-Berechtigung
      navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then(() => setPermission(true))
        .catch(() => setPermission(false));
    }
  }, []);

  if (!session || !username) {
    return (
      <div style={styles.container}>
        <p>Lade Session...</p>
      </div>
    );
  }

  if (permission === false) {
    return (
      <div style={styles.container}>
        <div style={styles.errorCard}>
          <h2>🎥 Kamera Zugriff erforderlich</h2>
          <p>Bitte erlaube den Zugriff auf Kamera und Mikrofon, um den Video-Chat zu nutzen.</p>
          <button onClick={() => window.location.reload()} style={styles.button}>
            Neu laden
          </button>
        </div>
      </div>
    );
  }

  return (
    <VideoChat 
      sessionId={session} 
      username={username}
      isHost={host === 'true'}
    />
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#1a1a2e',
    fontFamily: 'sans-serif'
  },
  loading: {
    textAlign: 'center',
    color: 'white'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid rgba(255,255,255,0.3)',
    borderTop: '4px solid white',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 20px'
  },
  errorCard: {
    background: 'white',
    padding: '40px',
    borderRadius: '20px',
    textAlign: 'center',
    maxWidth: '400px'
  },
  button: {
    padding: '10px 20px',
    backgroundColor: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    marginTop: '20px'
  }
};
