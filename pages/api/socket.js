import { Server } from 'socket.io';

export default function SocketHandler(req, res) {
  if (res.socket.server.io) {
    console.log('Socket.IO already running');
    res.end();
    return;
  }

  const io = new Server(res.socket.server);
  res.socket.server.io = io;

  const sessions = new Map();

  io.on('connection', (socket) => {
    console.log('New connection:', socket.id);

    socket.on('join-room', ({ sessionId, username, isHost }) => {
      socket.join(sessionId);
      
      if (!sessions.has(sessionId)) {
        sessions.set(sessionId, { host: null, users: new Map() });
      }
      
      const session = sessions.get(sessionId);
      session.users.set(socket.id, { username, isHost });
      
      if (isHost) {
        session.host = socket.id;
      }

      socket.to(sessionId).emit('user-connected', socket.id, { username, isHost });
    });

    socket.on('disconnect', () => {
      for (const [sessionId, session] of sessions) {
        if (session.users.has(socket.id)) {
          session.users.delete(socket.id);
          socket.to(sessionId).emit('user-disconnected', socket.id);
          
          if (session.users.size === 0) {
            sessions.delete(sessionId);
          }
          break;
        }
      }
    });
  });

  res.end();
}
