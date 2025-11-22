// controllers/game.controller.js
const catchAsync = require('../../helpers/asyncErrorHandler');
const ApiError = require('../../helpers/apiErrorConverter');
const service = require('../../services/game/game.service');
const fieldService = require('../../services/field/field.service');
const userService = require('../../services/admin/user.service');
const gameStatisticsService = require('../../services/gameStatistics.service');
const path = require('path');
const csv = require('csv-parser');
const streamifier = require('streamifier');
const moment = require('moment-timezone');
const XlsxPopulate = require('xlsx-populate');
const { ensureField, ensureUser } = require('../../helpers/ensureHelpers');

// ----------------------------------------------------
// Create Game
// ----------------------------------------------------
const createGame = catchAsync(async (req, res) => {
  const homeTeamLogo = req.files?.homeTeamLogo?.[0]?.location || null;
  const awayTeamLogo = req.files?.awayTeamLogo?.[0]?.location || null;

  const gameData = {
    ...req.body,
    homeTeamLogo,
    awayTeamLogo,
    createdBy: req.user._id,
  };

  const game = await service.createGame(gameData);
  // initialize stats
  await gameStatisticsService.createGameStatistics(game._id);

  res.status(201).json({
    message: 'Game created successfully',
    game,
  });
});

// ----------------------------------------------------
// List Games
// ----------------------------------------------------
const listGames = catchAsync(async (req, res) => {
  const page = parseInt(req.params.page) || 1;
  const limit = parseInt(req.params.limit) || 10;
  const search = req.query.search || '';
  const eventId = req.query.eventId || '';

  const result = await service.listGames({
    page,
    limit,
    search,
    user: req.user,
    eventId,
  });

  res.status(200).json({
    success: true,
    ...result,
  });
});

// ----------------------------------------------------
// Update Game
// ----------------------------------------------------
const updateGame = catchAsync(async (req, res) => {
  const { id } = req.params;

  const homeTeamLogo = req.files?.homeTeamLogo?.[0]?.location;
  const awayTeamLogo = req.files?.awayTeamLogo?.[0]?.location;

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

// ----------------------------------------------------
// Get Game By ID
// ----------------------------------------------------
const getGameById = catchAsync(async (req, res) => {
  const { id } = req.params;
  const game = await service.getByGameId(id);

  if (!game) throw new ApiError(404, 'Game not found');
  res.status(200).json({ game });
});

// ----------------------------------------------------
// Get Game By ID + User
// ----------------------------------------------------
const getGameByIdAndUserId = catchAsync(async (req, res) => {
  const { id } = req.params;

  const game = await service.getGameByIdAndUserId(id, req.user.id);
  const gameStatistics = await gameStatisticsService.getStatsByGameId(id);

  if (!game) throw new ApiError(404, 'Game not found');

  res.status(200).json({ game, gameStatistics });
});

// ----------------------------------------------------
// Delete Game
// ----------------------------------------------------
const deleteGame = catchAsync(async (req, res) => {
  const { id } = req.params;

  const game = await service.deleteGameById(id);
  if (!game) throw new ApiError(404, 'Game not found');

  res.status(200).json({ message: 'Game deleted successfully' });
});

// ----------------------------------------------------
// Date parsing helpers (Excel serials, formatted strings)
// ----------------------------------------------------
const parseExcelDate = (value) => {
  // nullish
  if (value == null || value === '') return null;

  // If it's already a Date object
  if (value instanceof Date && !isNaN(value.getTime())) return value;

  // If number: Excel serial date -> convert
  if (typeof value === 'number') {
    const excelBaseDate = new Date(Date.UTC(1899, 11, 30)); // Excel epoch
    return new Date(excelBaseDate.getTime() + Math.round(value * 86400000));
  }

  // If string, try ISO / Date.parse
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    if (!isNaN(parsed)) return new Date(parsed);

    // matches D/M/YY or M/D/YYYY optionally with time HH:MM
    const match = value.match(
      /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})(?:\s+(\d{1,2}):(\d{2}))?/
    );
    if (match) {
      let [, mm, dd, yyyy, hh = '0', mi = '0'] = match;

      // handle dd/mm vs mm/dd ambiguity: if first > 12, treat as dd/mm
      if (parseInt(mm, 10) > 12) [mm, dd] = [dd, mm];
      if (yyyy.length === 2) yyyy = '20' + yyyy;

      return new Date(
        `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}T${hh.padStart(
          2,
          '0'
        )}:${mi.padStart(2, '0')}:00`
      );
    }
  }

  return null;
};

/**
 * Converts Excel/CSV date to a UTC Date object based on user timezone.
 * Accepts Date object, Excel serial number, or date string.
 */
const parseDateWithTimezone = (value, userTimeZone = 'UTC') => {
  const parsed = parseExcelDate(value);
  if (!parsed) return null;

  // Interpret parsed as local in the userTimeZone, then convert to UTC
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

  return localMoment.utc().toDate();
};

// ----------------------------------------------------
// Helper: convert 2D array (from sheet) to JSON rows
// ----------------------------------------------------
const sheetArrayToJson = (arr2d) => {
  if (!Array.isArray(arr2d) || arr2d.length === 0) return [];
  const headersRow = arr2d[0].map((h) => (h == null ? '' : String(h).trim()));
  const rows = [];
  for (let i = 1; i < arr2d.length; i++) {
    const row = arr2d[i];
    // skip empty rows
    if (!row || row.every((c) => c == null || String(c).trim() === '')) continue;

    const obj = {};
    for (let c = 0; c < headersRow.length; c++) {
      const key = headersRow[c] || `col${c + 1}`;
      obj[key] = c < row.length ? row[c] : null;
    }
    rows.push(obj);
  }
  return rows;
};

// ----------------------------------------------------
// Import Games from Excel or CSV (now using xlsx-populate for xlsx)
// ----------------------------------------------------
const importGamesFromFile = catchAsync(async (req, res) => {
  try {
    if (!req.file) throw new ApiError(400, 'No file uploaded');

    const ext = path.extname(req.file.originalname).toLowerCase();
    let data = [];

    if (ext === '.xlsx' || ext === '.xls') {
      // Use xlsx-populate to read buffer
      const workbook = await XlsxPopulate.fromDataAsync(req.file.buffer);
      // use first sheet
      const sheet = workbook.sheets()[0];
      // Get used range as 2D array
      const usedRange = sheet.usedRange();
      if (!usedRange) {
        data = [];
      } else {
        const arr = usedRange.value(); // 2D array
        data = sheetArrayToJson(arr);
      }
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
      throw new ApiError(400, 'Invalid file type (only .xlsx, .xls or .csv allowed)');
    }

    if (!data.length) throw new ApiError(400, 'No data found in file');

    // Build match filters
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

    const fieldMap = {};
    const userMap = {};
    allFields.forEach((f) => (fieldMap[f.name?.toLowerCase()] = f._id));
    allUsers.forEach((u) => (userMap[u.email?.toLowerCase()] = u._id));

    const createdFields = [];
    const createdUsers = [];
    const games = [];
    const userTimeZone = req.body.timeZone || 'UTC';

    for (const row of data) {
      // Possible header names tolerant matching
      const homeTeamName = (row['Home Team Name'] ?? row['home team name'] ?? row['homeTeamName'] ?? row['home'] ?? '').toString().trim();
      const awayTeamName = (row['Away Team Name'] ?? row['away team name'] ?? row['awayTeamName'] ?? row['away'] ?? '').toString().trim();
      const fieldName = (row['Field Name'] ?? row['field name'] ?? row['fieldName'] ?? row['field'] ?? '').toString().trim();
      const scorekeeperEmail = (row['Scorekeeper Email'] ?? row['scorekeeper email'] ?? row['scorekeeperEmail'] ?? row['scorekeeper'] ?? '').toString().trim();
      const startRaw = row['Game Start Time'] ?? row['game start time'] ?? row['startDateTime'] ?? row['start'] ?? row['Start'] ?? null;

      const parsedStart = parseDateWithTimezone(startRaw, userTimeZone);

      const fieldId = await ensureField(fieldName, req, fieldMap, createdFields);
      const assignUserId = await ensureUser(scorekeeperEmail, req, userMap, createdUsers);

      games.push({
        homeTeamName: homeTeamName || undefined,
        awayTeamName: awayTeamName || undefined,
        fieldId,
        assignUserId,
        eventId: req.body.eventId,
        startDateTime: parsedStart,
        createdBy: req.user._id,
      });
    }

    // Insert into DB
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

// ----------------------------------------------------
// Get Game Score & Stats
// ----------------------------------------------------
const getGameScoreByGameId = catchAsync(async (req, res) => {
  const { id } = req.params;

  const game = await service.getByGameId(id);
  if (!game) throw new ApiError(404, 'Game not found');

  const gameStatistics = await gameStatisticsService.getStatsByGameId(id);

  res.status(200).json({ game, gameStatistics, field: game.fieldId });
});

// ----------------------------------------------------
// DOWNLOAD GAME STATISTICS (EXPORT using xlsx-populate)
// ----------------------------------------------------
const downloadGameStatistics = catchAsync(async (req, res) => {
  const { id } = req.params;

  const stats = await gameStatisticsService.getStatsByGameId(id);
  if (!stats) throw new ApiError(404, 'Game statistics not found');

  const STAT_LABELS = {
    score: 'Score',
    shotOn: 'Shot SOG',
    shotOff: 'Shot Off',
    save: 'Saves',
    groundBall: 'Ground Ball',
    drawW: 'Draw W',
    drawL: 'Draw L',
    turnoverForced: 'TO - F',
    turnoverUnforced: 'TO - U',
    goal: 'Goal',
    penalty: 'Penalty',

    // action mapping
    shot_on: 'Shot SOG',
    shot_off: 'Shot Off',
    ground_ball: 'Ground Ball',
    draw_w: 'Draw W',
    draw_l: 'Draw L',
    to_f: 'TO - F',
    to_u: 'TO - U',
  };

  // create workbook
  const workbook = await XlsxPopulate.fromBlankAsync();
  const sheet = workbook.sheet(0);
  sheet.name('Game Statistics');

  let row = 1;

  // Helpers
  const addSectionTitle = (title) => {
    sheet.cell(row, 1).value(title).style({
      bold: true,
      fill: 'D9EAF7',
    });
    // make the title span across many columns visually: merge first 9 columns
    sheet.range(row, 1, row, 9).merged(true);
    row += 2;
  };

  const addSummary = (teamStats) => {
    const summary = {
      score: teamStats.score,
      shotOn: teamStats.stats?.shotOn,
      shotOff: teamStats.stats?.shotOff,
      save: teamStats.stats?.save,
      groundBall: teamStats.stats?.groundBall,
      drawW: teamStats.stats?.drawW,
      drawL: teamStats.stats?.drawL,
      turnoverForced: teamStats.stats?.turnoverForced,
      turnoverUnforced: teamStats.stats?.turnoverUnforced,
      goal: teamStats.stats?.goal,
      penalty: teamStats.stats?.penalty,
    };

    let col = 1;
    Object.keys(summary).forEach((k) => {
      sheet.cell(row, col).value(STAT_LABELS[k] || k).style({ bold: true });
      col++;
    });

    row++;

    col = 1;
    Object.values(summary).forEach((v) => {
      sheet.cell(row, col).value(v ?? 0);
      col++;
    });

    row += 2;
  };

  const addActions = (title, actions) => {
    // Section heading
    sheet.cell(row, 1).value(title).style({
      bold: true,
      fill: 'D9EAF7',
    });
    sheet.range(row, 1, row, 9).merged(true);
    row++;

    const headers = [
      'Type',
      'Player No',
      'Quarter',
      'Minute',
      'Second',
      'Penalty Type',
      'Penalty Minutes',
      'Penalty Seconds',
      'Infraction',
    ];

    headers.forEach((h, i) => {
      sheet.cell(row, i + 1).value(h).style({ bold: true });
    });

    row++;

    actions.forEach((a) => {
      const values = [
        STAT_LABELS[a.type] || a.type,
        a.playerNo != null ? `#${a.playerNo}` : '',
        a.quarter ?? '',
        a.minute ?? '',
        a.second ?? '',
        a.penaltyType ?? '',
        a.penaltyMinutes ?? '',
        a.penaltySeconds ?? '',
        a.infraction ?? '',
      ];

      values.forEach((v, i) => {
        sheet.cell(row, i + 1).value(v);
      });
      row++;
    });

    row += 2;
  };

  // Build sheet
  addSectionTitle('HOME TEAM SUMMARY');
  addSummary(stats.homeTeam ?? { score: 0, stats: {} });

  addActions('HOME TEAM ACTIONS', (stats.actions || []).filter((a) => a.team === 'home'));

  addSectionTitle('AWAY TEAM SUMMARY');
  addSummary(stats.awayTeam ?? { score: 0, stats: {} });

  addActions('AWAY TEAM ACTIONS', (stats.actions || []).filter((a) => a.team === 'away'));

  // Auto-fit columns (simple approach)
  const usedRange = sheet.usedRange();
  if (usedRange) {
    const end = usedRange.endCell();
    const lastCol = end.columnNumber();
    for (let c = 1; c <= Math.max(6, lastCol); c++) {
      let maxLen = 8;
      const col = sheet.column(c);
      col.cells().forEach((cell) => {
        const v = cell.value();
        if (v != null) {
          maxLen = Math.max(maxLen, String(v).length + 2);
        }
      });
      col.width(maxLen);
    }
  }

  // Optional: add thin borders around the table areas (light)
  try {
    // add border to all used cells
    const used = sheet.usedRange();
    if (used) {
      const start = used.startCell();
      const end = used.endCell();
      const r1 = start.rowNumber();
      const c1 = start.columnNumber();
      const r2 = end.rowNumber();
      const c2 = end.columnNumber();
      const range = sheet.range(r1, c1, r2, c2);
      range.style('border', true); // set simple border
    }
  } catch (e) {
    // non-fatal; border styling might vary by xlsx-populate version
    // ignore if fails
  }

  // Output workbook buffer
  const buffer = await workbook.outputAsync();

  res.setHeader('Content-Disposition', `attachment; filename="game_statistics_${id}.xlsx"`);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

  return res.send(buffer);
});

// ----------------------------------------------------
// EXPORT HANDLERS
// ----------------------------------------------------
module.exports = {
  createGame,
  updateGame,
  getGameById,
  deleteGame,
  listGames,
  getGameByIdAndUserId,
  importGamesFromFile,
  getGameScoreByGameId,
  downloadGameStatistics,
};
