const app = require('./app');
const http = require('http');
const mongoose = require('mongoose');
const socketIo = require('socket.io');
const logger = require('./config/logger');
const config = require('./config/config');
const cron = require('node-cron');

const GameStatisticsService = require('./services/gameStatistics.service');
const GameService = require('./services/game/game.service');
const UniversalClock = require('./models/universalClock.model');
const Field = require('./models/field.model');
const Game = require('./models/game.model');
const GameStatistics = require('./models/gameStatistics.model');

let io, server;

// active game timers
const activeTimers = new Map();
// active universal clock timers
const activeUniversal = new Map();

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

  // ⚡ Helper: Fast background sync for universal clocks
  const syncUniversalClockToGames = async (clock, userId) => {
    process.nextTick(async () => {
      try {
        const fields = await Field.find(
          { createdBy: userId, unviseralClock: true },
          '_id'
        ).lean();

        if (!fields.length) return;
        const fieldIds = fields.map(f => f._id);

        const games = await Game.find({ fieldId: { $in: fieldIds } }, '_id').lean();
        if (!games.length) return;
        const gameIds = games.map(g => g._id);

        // Bulk update all game clocks at once
        await GameStatistics.updateMany(
          { gameId: { $in: gameIds } },
          {
            $set: {
              'clock.minutes': clock.minutes,
              'clock.seconds': clock.seconds,
              'clock.running': clock.running,
              'clock.quarter': clock.quarter
            },
          }
        );

        // Emit updates to all game rooms asynchronously
        gameIds.forEach(id => {
          io.to(id.toString()).emit('clockUpdated', {
            minutes: clock.minutes,
            seconds: clock.seconds,
            running: clock.running,
            quarter: clock.quarter
          });

        });
      } catch (err) {
        console.error('❌ Universal clock sync failed:', err.message);
      }
    });
  };

  // 🕒 GAME CLOCK HANDLER
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
      io.to(gameId).emit('clockUpdated', g.clock);
    }, 1000);

    activeTimers.set(gameId, interval);
  };

  // 🕒 UNIVERSAL CLOCK HANDLER
  const startUniversalClock = async (userId) => {
    if (activeUniversal.has(userId)) return;
    const interval = setInterval(async () => {
      const clock = await UniversalClock.findOne({ userId });
      if (!clock || !clock.running) return;
      let total = clock.minutes * 60 + clock.seconds;
      total--;
      if (total <= 0) {
        clock.minutes = 0;
        clock.seconds = 0;
        clock.running = false;
        clearInterval(activeUniversal.get(userId));
        activeUniversal.delete(userId);
      } else {
        clock.minutes = Math.floor(total / 60);
        clock.seconds = total % 60;
      }
      await clock.save();
      io.to(`user:${userId}`).emit('universalClockUpdated', clock);
      // ⚡ Sync fields and games in background (non-blocking)
      syncUniversalClockToGames(clock, userId);
    }, 1000);

    activeUniversal.set(userId, interval);
  };

  // 🧩 SOCKET.IO
  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Rooms
    socket.on('joinRoom', ({ gameId }) => {
      if (!gameId) return;
      socket.join(gameId);
      console.log(`Socket ${socket.id} joined room ${gameId}`);
    });

    socket.on('joinUser', async ({ userId }) => {
      if (!userId) return;
      socket.join(`user:${userId}`);

      // send universal clock state
      let clock = await UniversalClock.findOne({ userId });
      if (!clock) {
        clock = await UniversalClock.create({
          userId,
          minutes: 0,
          seconds: 0,
          quarter: 0,
          running: false,
        });
      }
      io.to(`user:${userId}`).emit('universalClockState', clock);
    });

    // 🧭 UNIVERSAL CLOCK EVENTS
    socket.on('startUniversalClock', async ({ userId }) => {
      let clock = await UniversalClock.findOne({ userId });
      if (!clock) {
        clock = await UniversalClock.create({ userId, minutes: 0, seconds: 0 });
      }
      clock.running = true;
      await clock.save();
      startUniversalClock(userId);
      io.to(`user:${userId}`).emit('universalClockUpdated', clock);
    });

    socket.on('pauseUniversalClock', async ({ userId }) => {
      const clock = await UniversalClock.findOne({ userId });
      if (!clock) return;
      clock.running = false;
      await clock.save();
      if (activeUniversal.has(userId)) {
        clearInterval(activeUniversal.get(userId));
        activeUniversal.delete(userId);
      }
      io.to(`user:${userId}`).emit('universalClockUpdated', clock);
    });

    socket.on('setUniversalClock', async ({ userId, minutes, seconds, quarter }) => {
      const clock = await UniversalClock.findOneAndUpdate(
        { userId },
        { minutes, seconds, quarter },
        { new: true, upsert: true }
      );
      io.to(`user:${userId}`).emit('universalClockUpdated', clock);
      // background sync after manual set
      syncUniversalClockToGames(clock, userId);
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

    socket.on('gameEnded', async ({ gameId }) => {
      try {
        const stats = await GameService.endGameManually(gameId);
        io.to(gameId.toString()).emit('gameEnded', {
          message: 'Game manually ended by admin',
        });
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

    socket.on('addGoal', async ({ gameId, team, playerNo, minute, second }) => {
      try {
        const stats = await GameStatisticsService.addGoal(gameId, team, playerNo, minute, second);
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

    // 🧩 CRON FOR AUTO END
    /*cron.schedule('* * * * *', async () => {
      try {
        const ended = await GameService.autoEndGames(io);
        if (ended.length > 0) {
          console.log(`✅ Auto-ended ${ended.length} games`);
        }
      } catch (err) {
        console.error('❌ Error in autoEndGames:', err.message);
      }
    }); */

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.id}`);
    });
  });

  socketApp.listen(socketPort, () => {
    logger.info(`Socket.IO server running on port ${socketPort}`);
  });
});
