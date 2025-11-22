const catchAsync = require('../../helpers/asyncErrorHandler');
const ApiError = require('../../helpers/apiErrorConverter');
const service = require('../../services/game/game.service');
const fieldService = require('../../services/field/field.service');
const userService = require('../../services/admin/user.service');
const gameStatisticsService = require('../../services/gameStatistics.service');
const path = require('path');
const XLSX = require('xlsx');
const csv = require('csv-parser');
const { ensureField, ensureUser } = require('../../helpers/ensureHelpers');
const moment = require("moment-timezone");
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
  const eventId = req.query.eventId || "";
  const result = await service.listGames({ page, limit, search, user: req.user, eventId });

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
  console.log(id);
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
 * Converts Excel/CSV date to a UTC Date object based on user timezone.
 */
const parseDateWithTimezone = (value, userTimeZone = "UTC") => {
  const parsed = parseExcelDate(value);
  console.log(parsed);
  if (!parsed) return null;

  // 🧩 Extract date parts as if Excel meant them in local time
  const localMoment = moment.tz(
    {
      year: parsed.getUTCFullYear(),
      month: parsed.getUTCMonth(),
      day: parsed.getUTCDate(),
      hour: parsed.getUTCHours(),
      minute: parsed.getUTCMinutes(),
      second: parsed.getUTCSeconds(),
    },
    userTimeZone
  );

  const utcDate = localMoment.utc().toDate();

  console.log(
    `🕒 Local interpreted (${userTimeZone}):`,
    localMoment.format(),
    "→ UTC:",
    utcDate.toISOString()
  );

  return utcDate;
};
const parseExcelDate = (value) => {
  if (value == null || value === "") return null;

  // 🧮 Case 1: Excel serial number (e.g., 45961.5833)
  if (typeof value === "number") {
    const excelBaseDate = new Date(Date.UTC(1899, 11, 30)); // Excel epoch base
    return new Date(excelBaseDate.getTime() + value * 86400000);
  }

  // 📅 Case 2: String-based date (ISO or formatted)
  if (typeof value === "string") {
    // Try direct parse
    const parsed = Date.parse(value);
    if (!isNaN(parsed)) return new Date(parsed);

    // Try formats like 03/09/2025 14:00 or 9-3-25
    const match = value.match(
      /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})(?:\s+(\d{1,2}):(\d{2}))?/
    );
    if (match) {
      let [_, mm, dd, yyyy, hh = "0", mi = "0"] = match;

      // Handle DD/MM vs MM/DD confusion
      if (parseInt(mm) > 12) [mm, dd] = [dd, mm];
      if (yyyy.length === 2) yyyy = "20" + yyyy;

      return new Date(
        `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}T${hh.padStart(
          2,
          "0"
        )}:${mi.padStart(2, "0")}:00`
      );
    }
  }

  // ❌ Not a valid date
  return null;
}

/**
 * @desc Import games from uploaded Excel or CSV file.
 * Auto-creates fields and scorekeeper users if not found in DB.
 */
const importGamesFromFile = catchAsync(async (req, res) => {
  try {
    if (!req.file) throw new ApiError(400, 'No file uploaded');

    const ext = path.extname(req.file.originalname).toLowerCase();
    let data = [];

    // Parse Excel/CSV
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

    if (!data.length) throw new ApiError(400, 'No data found in file');

    // Fetch fields/users based on role
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

    // Build lookup maps
    const fieldMap = {};
    const userMap = {};
    allFields.forEach((f) => (fieldMap[f.name?.toLowerCase()] = f._id));
    allUsers.forEach((u) => (userMap[u.email?.toLowerCase()] = u._id));

    const createdFields = [];
    const createdUsers = [];

    // Transform rows
    const games = [];
    const userTimeZone = req.body.timeZone
    for (const row of data) {
      console.log('📘 Excel row:', row);

      const item = {
        homeTeamName: row['Home Team Name']?.trim(),
        awayTeamName: row['Away Team Name']?.trim(),
        fieldName: row['Field Name']?.trim(),
        scorekeeper: row['Scorekeeper Email']?.trim(),
        startDateTime: parseDateWithTimezone(row['Game Start Time'], userTimeZone),
      };

      const fieldId = await ensureField(item.fieldName, req, fieldMap, createdFields);
      const assignUserId = await ensureUser(item.scorekeeper, req, userMap, createdUsers);

      games.push({
        homeTeamName: item.homeTeamName,
        awayTeamName: item.awayTeamName,
        fieldId,
        assignUserId,
        eventId: req.body.eventId,
        startDateTime: item.startDateTime,
        createdBy: req.user._id,
      });
    }
    // Insert into MongoDB
    await service.insertMany(games);

    res.status(200).json({
      success: true,
      message: '✅ Games imported successfully',
      inserted: games.length,
    });
  } catch (error) {
    console.error('❌ Import error:', error);
    throw new ApiError(500, `Import failed: ${error.message}`);
  }
});

const getGameScoreByGameId = catchAsync(async (req, res) => {
  const { id } = req.params;
  const game = await service.getByGameId(id);
  if (!game) throw new ApiError(404, 'Game not found');
  const gameStatistics = await gameStatisticsService.getStatsByGameId(id);
  res.status(200).json({ game, gameStatistics, field: game.fieldId });
});
const downloadGameStatistics = catchAsync(async (req, res) => {
  const { id } = req.params;

  const stats = await gameStatisticsService.getStatsByGameId(id);
  if (!stats) throw new ApiError(404, "Game statistics not found");

  const sheetData = [];

  const addSection = (title) => {
    sheetData.push([title]);
    sheetData.push([]);
  };

  const addSummary = (teamStats) => {
    sheetData.push(["Type", "Value"]);
    sheetData.push(["Score", teamStats.score]);
    sheetData.push(["Shots On", teamStats.stats.shotOn]);
    sheetData.push(["Shots Off", teamStats.stats.shotOff]);
    sheetData.push(["Saves", teamStats.stats.save]);
    sheetData.push(["Ground Balls", teamStats.stats.groundBall]);
    sheetData.push(["Draw Win", teamStats.stats.drawW]);
    sheetData.push(["Draw Lose", teamStats.stats.drawL]);
    sheetData.push(["Turnover Forced", teamStats.stats.turnoverForced]);
    sheetData.push(["Turnover Unforced", teamStats.stats.turnoverUnforced]);
    sheetData.push(["Goals", teamStats.stats.goal]);
    sheetData.push(["Penalties", teamStats.stats.penalty]);
    sheetData.push([]);
  };

  const addActions = (title, actions) => {
    sheetData.push([title]);
    sheetData.push([]);

    sheetData.push([
      "Type",
      "Team",
      "Player No",
      "Quarter",
      "Minute",
      "Second",
      "Penalty Type",
      "Penalty Minutes",
      "Penalty Seconds",
      "Infraction",
      "Created At"
    ]);

    actions.forEach(a =>
      sheetData.push([
        a.type,
        a.team,
        a.playerNo,
        a.quarter,
        a.minute ?? "",
        a.second ?? "",
        a.penaltyType ?? "",
        a.penaltyMinutes ?? "",
        a.penaltySeconds ?? "",
        a.infraction ?? "",
        a.createdAt ? new Date(a.createdAt).toISOString() : ""
      ])
    );

    sheetData.push([]);
  };

  // Build structure
  addSection("HOME TEAM SUMMARY");
  addSummary(stats.homeTeam);

  addSection("HOME TEAM ACTIONS");
  addActions("Home Actions", stats.actions.filter(a => a.team === "home"));

  addSection("AWAY TEAM SUMMARY");
  addSummary(stats.awayTeam);

  addSection("AWAY TEAM ACTIONS");
  addActions("Away Actions", stats.actions.filter(a => a.team === "away"));

  // Create sheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  XLSX.utils.book_append_sheet(wb, ws, "Game Statistics");

  // Write
  const excelBuffer = XLSX.write(wb, {
    type: "buffer",
    bookType: "xlsx",
  });

  res.setHeader(
    "Content-Disposition",
    `attachment; filename="game_statistics_${id}.xlsx"`
  );
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );

  return res.send(excelBuffer);
});


module.exports = {
  createGame,
  updateGame,
  getGameById,
  deleteGame,
  listGames,
  getGameByIdAndUserId,
  importGamesFromFile,
  getGameScoreByGameId,
  downloadGameStatistics
};
