import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

app.use(cors());

const games = new Map();

io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on('createGame', () => {
    const gameId = Math.random().toString(36).substring(7);
    games.set(gameId, { board: Array(9).fill(null), players: [socket.id], turn: 0 });
    socket.join(gameId);
    socket.emit('gameCreated', gameId);
  });

  socket.on('joinGame', (gameId) => {
    const game = games.get(gameId);
    if (game && game.players.length < 2) {
      game.players.push(socket.id);
      socket.join(gameId);
      io.to(gameId).emit('gameJoined', { gameId, players: game.players });
      io.to(gameId).emit('updateGame', game.board);
      io.to(game.players[game.turn]).emit('yourTurn');
    } else {
      socket.emit('gameError', 'Game not found or full');
    }
  });

  socket.on('makeMove', ({ gameId, index }) => {
    const game = games.get(gameId);
    if (game && game.players[game.turn] === socket.id && game.board[index] === null) {
      game.board[index] = game.turn === 0 ? 'X' : 'O';
      game.turn = 1 - game.turn;
      io.to(gameId).emit('updateGame', game.board);
      
      const winner = calculateWinner(game.board);
      if (winner) {
        io.to(gameId).emit('gameOver', { winner });
        games.delete(gameId);
      } else if (!game.board.includes(null)) {
        io.to(gameId).emit('gameOver', { winner: 'draw' });
        games.delete(gameId);
      } else {
        io.to(game.players[game.turn]).emit('yourTurn');
      }
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
    for (const [gameId, game] of games.entries()) {
      if (game.players.includes(socket.id)) {
        io.to(gameId).emit('playerDisconnected');
        games.delete(gameId);
      }
    }
  });
});

function calculateWinner(board) {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
    [0, 4, 8], [2, 4, 6] // Diagonals
  ];
  for (const [a, b, c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  return null;
}

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// For testing purposes, let's log the game state
setInterval(() => {
  console.log('Current games:', Array.from(games.entries()));
}, 5000);