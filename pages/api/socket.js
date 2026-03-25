import { Server } from 'socket.io';

export default function handler(req, res) {
  if (res.socket.server.io) {
    console.log('Socket.IO already running');
    res.end();
    return;
  }

  const io = new Server(res.socket.server);
  res.socket.server.io = io;

  const rooms = new Map();

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join-room', ({ roomId, username }) => {
      socket.join(roomId);
      
      if (!rooms.has(roomId)) {
        rooms.set(roomId, { users: new Map() });
      }
      
      const room = rooms.get(roomId);
      room.users.set(socket.id, { username, socketId: socket.id });
      
      // Allen anderen in dem Raum Bescheid sagen
      socket.to(roomId).emit('user-connected', {
        userId: socket.id,
        username: username
      });
      
      console.log(`${username} joined room ${roomId}, total users: ${room.users.size}`);
    });

    socket.on('signal', ({ to, signal }) => {
      io.to(to).emit('signal', {
        from: socket.id,
        signal
      });
    });

    socket.on('disconnect', () => {
      for (const [roomId, room] of rooms) {
        if (room.users.has(socket.id)) {
          const user = room.users.get(socket.id);
          room.users.delete(socket.id);
          socket.to(roomId).emit('user-disconnected', socket.id);
          console.log(`${user.username} disconnected from ${roomId}`);
          
          if (room.users.size === 0) {
            rooms.delete(roomId);
          }
          break;
        }
      }
    });
  });

  res.end();
}
