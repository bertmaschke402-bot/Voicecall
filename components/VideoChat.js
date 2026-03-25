import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';

const VideoChat = dynamic(() => import('../components/VideoChat'), {
  ssr: false,
  loading: () => (
    <div style={styles.loading}>
      <div style={styles.spinner}></div>
      <p>Wird geladen...</p>
    </div>
  )
});

export default function Session() {
  const router = useRouter();
  const { session, username, host } = router.query;

  if (!session || !username) {
    return (
      <div style={styles.container}>
        <p>Lade Session...</p>
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
  }
};
