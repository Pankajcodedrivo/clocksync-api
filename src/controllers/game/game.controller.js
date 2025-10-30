const catchAsync = require('../../helpers/asyncErrorHandler');
const ApiError = require('../../helpers/apiErrorConverter');
const service = require('../../services/game/game.service');
const fieldService = require('../../services/field/field.service');
const userService = require('../../services/admin/user.service');
const gameStatisticsService = require('../../services/gameStatistics.service');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');
const csv = require('csv-parser');
const { ensureField, ensureUser } = require('../../helpers/ensureHelpers');
// Create Game
const createGame = catchAsync(async (req, res) => {
  // Extract file paths if provided

  const homeTeamLogo = req.files?.homeTeamLogo?.[0]?.location || null;
  const awayTeamLogo = req.files?.awayTeamLogo?.[0]?.location || null;

  // Merge file paths into game data
  const gameData = {
    ...req.body,
    homeTeamLogo,
    awayTeamLogo,
    createdBy: req.user._id,
  };

  const game = await service.createGame(gameData);
  gameStatisticsService.createGameStatistics(game._id);

  res.status(201).json({
    message: 'Game created successfully',
    game
  });
});

// List Games
const listGames = catchAsync(async (req, res) => {
  const page = parseInt(req.params.page) || 1;
  const limit = parseInt(req.params.limit) || 10;
  const search = req.query.search || "";
  const result = await service.listGames({ page, limit, search, user: req.user });

  res.status(200).json({
    success: true,
    ...result,
  });
});

// Update Game
const updateGame = catchAsync(async (req, res) => {
  const { id } = req.params;

  // Extract file paths if new files are uploaded
  const homeTeamLogo = req.files?.homeTeamLogo?.[0]?.location;
  const awayTeamLogo = req.files?.awayTeamLogo?.[0]?.location;

  // Build update data (merge body + new logos if provided)
  const updateData = {
    ...req.body,
    ...(homeTeamLogo && { homeTeamLogo }),
    ...(awayTeamLogo && { awayTeamLogo }),
  };

  const updatedGame = await service.updateGame(id, updateData);
  if (!updatedGame) throw new ApiError(404, 'Game not found');

  res.status(200).json({
    message: 'Game updated successfully',
    game: updatedGame,
  });
});

// Get Game by ID
const getGameById = catchAsync(async (req, res) => {
  const { id } = req.params;
  const game = await service.getByGameId(id);

  if (!game) throw new ApiError(404, 'Game not found');

  res.status(200).json({ game });
});

const getGameByIdAndUserId = catchAsync(async (req, res) => {
  const { id } = req.params;
  const game = await service.getGameByIdAndUserId(id, req.user.id);
  const gameStatistics = await gameStatisticsService.getStatsByGameId(id);
  if (!game) throw new ApiError(404, 'Game not found');

  res.status(200).json({ game, gameStatistics });
});
// Delete Game
const deleteGame = catchAsync(async (req, res) => {
  const { id } = req.params;
  const game = await service.deleteGameById(id);
  if (!game) throw new ApiError(404, 'Game not found');

  res.status(200).json({ message: 'Game deleted successfully' });
});

/**
 * @desc Import games from uploaded Excel or CSV file.
 * Auto-creates fields and scorekeeper users if not found in DB.
 */
const importGamesFromFile = catchAsync(async (req, res) => {
  try {
    if (!req.file) throw new ApiError(400, 'No file uploaded');
    const ext = path.extname(req.file.originalname).toLowerCase();
    let data = [];
    // 1️⃣ Parse Excel or CSV file
    if (ext === '.xlsx' || ext === '.xls') {
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
    } else if (ext === '.csv') {
      const results = [];
      await new Promise((resolve, reject) => {
        streamifier
          .createReadStream(req.file.buffer)
          .pipe(csv())
          .on('data', (row) => results.push(row))
          .on('end', () => resolve(results))
          .on('error', reject);
      });
      data = results;
    } else {
      throw new ApiError(400, 'Invalid file type (only .xlsx or .csv allowed)');
    }
    if (!data.length) {
      throw new ApiError(400, 'No data found in file');
    }
    // 2️⃣ Fetch fields and users based on role
    const match = {};
    const usermatch = { role: 'scorekeeper' };
    if (req.user.role === 'event-director') {
      match.createdBy = req.user._id;
      usermatch.createdBy = req.user._id;
    }
    const [allFields, allUsers] = await Promise.all([
      fieldService.getAllField(match),
      userService.getAllUser(usermatch),
    ]);
    // Build quick lookup maps
    const fieldMap = {};
    const userMap = {};
    allFields.forEach((f) => (fieldMap[f.name?.toLowerCase()] = f._id));
    allUsers.forEach((u) => (userMap[u.email?.toLowerCase()] = u._id));
    const createdFields = [];
    const createdUsers = [];
    // 3️⃣ Transform rows into Game objects
    const games = [];
    for (const row of data) {
      console.log("📘 Excel row:", row);

      // Normalize keys from Excel headers
      const item = {
        homeTeamName: row['Home Team Name']?.trim(),
        awayTeamName: row['Away Team Name']?.trim(),
        fieldName: row['Field Name']?.trim(),
        scorekeeper: row['Scorekeeper Email']?.trim(),
        startDateTime: row['Game Start Time'],
        endDateTime: row['Game End Time'],
      };
      const fieldId = await ensureField(item.fieldName, req, fieldMap, createdFields);
      const assignUserId = await ensureUser(item.scorekeeper, req, userMap, createdUsers);
      games.push({
        homeTeamName: item.homeTeamName,
        awayTeamName: item.awayTeamName,
        fieldId,
        assignUserId,
        startDateTime: item.startDateTime ? new Date(item.startDateTime) : null,
        endDateTime: item.endDateTime ? new Date(item.endDateTime) : null,
        createdBy: req.user._id,
      });
    }
    // 4️⃣ Insert into MongoDB
    await service.insertMany(games);
    // 5️⃣ Respond success
    res.status(200).json({
      success: true,
      message: '✅ Games imported successfully',
      inserted: games.length,
    });
  } catch (error) {
    console.error('Import error:', error);
    throw new ApiError(500, `Import failed: ${error.message}`);
  }
});

module.exports = {
  createGame,
  updateGame,
  getGameById,
  deleteGame,
  listGames,
  getGameByIdAndUserId,
  importGamesFromFile
};
