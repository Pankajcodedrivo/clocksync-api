const app = require('./app');
const http = require('http');
const mongoose = require('mongoose');
const socketIo = require('socket.io');
const logger = require('./config/logger');
const config = require('./config/config');

const GameStatisticsService = require('./services/gameStatistics.service');

let io, server;

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

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // ✅ Join room by gameId
    socket.on('joinRoom', ({ gameId }) => {
      if (!gameId) return;
      socket.join(gameId);
      console.log(`Socket ${socket.id} joined room ${gameId}`);
    });

    // ✅ Leave room
    socket.on('leaveRoom', ({ gameId }) => {
      socket.leave(gameId);
      console.log(`Socket ${socket.id} left room ${gameId}`);
    });

    // ✅ Set Score
    socket.on('setScore', async ({ gameId, team, value }) => {
      try {
        const stats = await GameStatisticsService.setScore(gameId, team, value);
        io.to(gameId).emit('scoreUpdated', stats);
      } catch (err) {
        socket.emit('error', err.message);
      }
    });

    // ✅ Set Stat
    socket.on('setStat', async ({ gameId, team, field, value }) => {
      try {
        const stats = await GameStatisticsService.setTeamStat(gameId, team, field, value);
        io.to(gameId).emit('statUpdated', stats);
      } catch (err) {
        socket.emit('error', err.message);
      }
    });

    // ✅ Add Goal
    socket.on('addGoal', async ({ gameId, team, playerNo, minute, time }) => {
      try {
        const stats = await GameStatisticsService.addGoal(gameId, team, playerNo, minute, time);
        io.to(gameId).emit('goalAdded', stats);
      } catch (err) {
        socket.emit('error', err.message);
      }
    });

    // ✅ Add Penalty
    socket.on('addPenalty', async ({ gameId, team, type, playerNo, startTime, minutes, seconds }) => {
      try {
        const stats = await GameStatisticsService.addPenalty(
          gameId, team, type, playerNo, startTime, minutes, seconds
        );
        io.to(gameId).emit('penaltyAdded', stats);
      } catch (err) {
        socket.emit('error', err.message);
      }
    });

    // ✅ Update Clock
    socket.on('updateClock', async ({ gameId, quarter, minutes, seconds }) => {
      try {
        const stats = await GameStatisticsService.updateClock(gameId, quarter, minutes, seconds);
        io.to(gameId).emit('clockUpdated', stats);
      } catch (err) {
        socket.emit('error', err.message);
      }
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.id}`);
    });
  });

  socketApp.listen(socketPort, () => {
    logger.info(`Socket.IO server running on port ${socketPort}`);
  });
});

const exitHandler = () => {
  if (server) {
    server.close(() => {
      logger.info('Server closed');
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
};

const unexpectedErrorHandler = (error) => {
  logger.error(error);
  exitHandler();
};

process.on('uncaughtException', unexpectedErrorHandler);
process.on('unhandledRejection', unexpectedErrorHandler);
process.on('SIGTERM', () => {
  logger.info('SIGTERM received');
  if (server) server.close();
});