const app = require('./app');
const http = require('http');
const mongoose = require('mongoose');
const socketIo = require('socket.io');
const logger = require('./config/logger');
const config = require('./config/config');

const GameStatisticsService = require('./services/gameStatistics.service');

let io, server;
const activeTimers = new Map(); // keep intervals by gameId

mongoose.connect(config.mongoose.url).then(() => {
  logger.info('Connected to MongoDB');

  server = app.listen(config.port, () => {
    logger.info(`Listening on port ${config.port}, Mode: ${config.env}`);
  });

  const socketApp = http.createServer(app);
  const socketPort = config.socketPort || 4000;

  io = socketIo(socketApp, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  });

  // 🕒 helper: start clock interval
  const startClockInterval = (gameId) => {
    if (activeTimers.has(gameId)) return;

    const interval = setInterval(async () => {
      const g = await GameStatisticsService.getStatsByGameId(gameId);
      if (!g || !g.clock.running) return;

      let total = g.clock.minutes * 60 + g.clock.seconds;
      total--;

      if (total <= 0) {
        g.clock.minutes = 0;
        g.clock.seconds = 0;
        g.clock.running = false;
        clearInterval(activeTimers.get(gameId));
        activeTimers.delete(gameId);
      } else {
        g.clock.minutes = Math.floor(total / 60);
        g.clock.seconds = total % 60;
      }
      await g.save();
      io.to(gameId).emit("clockUpdated", g.clock);
    }, 1000);

    activeTimers.set(gameId, interval);
  };

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on('joinRoom', ({ gameId }) => {
      if (!gameId) return;
      socket.join(gameId);
      console.log(`Socket ${socket.id} joined room ${gameId}`);
    });

    socket.on('leaveRoom', ({ gameId }) => {
      socket.leave(gameId);
      console.log(`Socket ${socket.id} left room ${gameId}`);
    });

    // ✅ Clock controls
    socket.on('startClock', async ({ gameId }) => {
      const game = await GameStatisticsService.getStatsByGameId(gameId);
      if (!game) return;
      game.clock.running = true;
      await game.save();
      startClockInterval(gameId);
      io.to(gameId).emit('clockUpdated', game.clock);
    });

    socket.on('pauseClock', async ({ gameId }) => {
      const game = await GameStatisticsService.getStatsByGameId(gameId);
      if (!game) return;
      game.clock.running = false;
      await game.save();
      if (activeTimers.has(gameId)) {
        clearInterval(activeTimers.get(gameId));
        activeTimers.delete(gameId);
      }
      io.to(gameId).emit('clockUpdated', game.clock);
    });

    socket.on('setClock', async ({ gameId, minutes, seconds }) => {
      const game = await GameStatisticsService.getStatsByGameId(gameId);
      if (!game) return;
      game.clock.minutes = minutes;
      game.clock.seconds = seconds;
      await game.save();
      io.to(gameId).emit('clockUpdated', game.clock);
    });

    socket.on('resetGame', async ({ gameId }) => {
      try {
        const stats = await GameStatisticsService.resetGame(gameId);
        if (activeTimers.has(gameId)) {
          clearInterval(activeTimers.get(gameId));
          activeTimers.delete(gameId);
        }
        io.to(gameId).emit('gameReset', stats);
      } catch (err) {
        socket.emit('error', err.message);
      }
    });

    socket.on('removePenalty', async ({ gameId, penaltyId }) => {
      try {
        const stats = await GameStatisticsService.removePenalty(gameId, penaltyId);
        io.to(gameId).emit('penaltyRemoved', stats);
      } catch (err) {
        socket.emit('error', err.message);
      }
    });

    // ✅ Score & stats
    socket.on('setScore', async ({ gameId, team, value }) => {
      try {
        const stats = await GameStatisticsService.setScore(gameId, team, value);
        io.to(gameId).emit('scoreUpdated', stats);
      } catch (err) {
        socket.emit('error', err.message);
      }
    });

    // ✅ Quater
    socket.on('setQuater', async ({ gameId, quarter }) => {
      try {
        const stats = await GameStatisticsService.updateClock(gameId, { quarter });
        io.to(gameId).emit('setQuater', stats);
      } catch (err) {
        socket.emit('error', err.message);
      }
    });
    socket.on('setStat', async ({ gameId, team, field, value }) => {
      try {
        const stats = await GameStatisticsService.setTeamStat(gameId, team, field, value);
        io.to(gameId).emit('statUpdated', stats);
      } catch (err) {
        socket.emit('error', err.message);
      }
    });

    socket.on('addGoal', async ({ gameId, team, playerNo, minute }) => {
      try {
        const stats = await GameStatisticsService.addGoal(gameId, team, playerNo, minute);
        io.to(gameId).emit('goalAdded', stats);
      } catch (err) {
        socket.emit('error', err.message);
      }
    });

    socket.on('addPenalty', async ({ gameId, team, type, playerNo, minutes, seconds }) => {
      try {
        const stats = await GameStatisticsService.addPenalty(gameId, team, type, playerNo, minutes, seconds);
        io.to(gameId).emit('penaltyAdded', stats);
      } catch (err) {
        socket.emit('error', err.message);
      }
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.id}`);
    });
  });

  socketApp.listen(socketPort, () => {
    logger.info(`Socket.IO server running on port ${socketPort}`);
  });
});