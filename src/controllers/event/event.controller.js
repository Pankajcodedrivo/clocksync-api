const catchAsync = require('../../helpers/asyncErrorHandler');
const ApiError = require('../../helpers/apiErrorConverter');
const eventService = require('../../services/event/event.service');
const gameService = require('../../services/game/game.service');
const gameStatisticsService = require('../../services/gameStatistics.service');
const XlsxPopulate = require('xlsx-populate');
// Create event
const createEvent = catchAsync(async (req, res) => {
  // Extract file paths if provided
  const eventLogo = req.files?.eventLogo?.[0]?.location || null;

  // Merge file paths into event data
  const eventData = {
    ...req.body,
    eventLogo,
  };

  await eventService.createEvent(eventData);

  res.status(201).json({
    status: 200,
    message: 'Event created successfully',
  });
});

// List events
const listEvents = catchAsync(async (req, res) => {
  const page = parseInt(req.params.page) || 1;
  const limit = parseInt(req.params.limit) || 10;
  const search = req.query.search || "";
  const result = await eventService.listEvents({ page, limit, search, user: req.user });

  res.status(200).json({
    success: true,
    ...result,
  });
});

// Update event
const updateEvent = catchAsync(async (req, res) => {
  const { id } = req.params;

  // Extract file paths if new files are uploaded
  const eventLogo = req.files?.eventLogo?.[0]?.location;

  // Build update data (merge body + new logos if provided)
  const updateData = {
    ...req.body,
    ...(eventLogo && { eventLogo }),
  };

  const updatedEvent = await eventService.updateEvent(id, updateData);
  if (!updatedEvent) throw new ApiError(404, 'Event not found');

  res.status(200).json({
    status: 200,
    message: 'Event updated successfully',
  });
});

// Get event by ID
const getEventById = catchAsync(async (req, res) => {
  const { id } = req.params;
  const event = await eventService.getByEventId(id);

  if (!event) throw new ApiError(404, 'Event not found');

  res.status(200).json({ event });
});

const getEventByIdAndUserId = catchAsync(async (req, res) => {
  const { id } = req.params;
  const event = await eventService.getEventByIdAndUserId(id, req.user.id);
  if (!event) throw new ApiError(404, 'event not found');

  res.status(200).json({ event });
});
// Delete event
const deleteEvent = catchAsync(async (req, res) => {
  const { id } = req.params;
  const event = await eventService.deleteEventById(id);
  if (!event) throw new ApiError(404, 'event not found');

  res.status(200).json({ message: 'Event deleted successfully' });
});


const getEventListByEventDirector = catchAsync(async (req, res) => {
  const { fetchData } = req.params;

  // Admin can fetch all events
  if (req.user.role === 'admin' && fetchData === 'all') {
    const events = await eventService.getEventByMatch({});
    return res.status(200).json({ status: 200, events });
  }

  // Only event directors allowed beyond this point
  if (req.user.role !== 'event-director') {
    return res.status(403).json({
      status: 403,
      message: 'Only event directors can access this data',
    });
  }

  // Today's date (start of day)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Query for director-specific upcoming events
  const query = {
    assignUserId: req.user._id,
    endDate: { $gte: today },
  };

  const events = await eventService.getEventByMatch(query);

  return res.status(200).json({ status: 200, events });
});


const exportEventGames = catchAsync(async (req, res) => {
  const { id: eventId } = req.params;

  // Fetch event
  // ---------- LABEL MAP ----------
  const STAT_LABELS = {
    score: "Score",
    shotOn: "Shot SOG",
    shotOff: "Shot Off",
    save: "Saves",
    groundBall: "Ground Ball",
    drawW: "Draw W",
    drawL: "Draw L",
    turnoverForced: "TO - F",
    turnoverUnforced: "TO - U",
    goal: "Goal",
    penalty: "Penalty",

    // Actions
    shot_on: "Shot SOG",
    shot_off: "Shot Off",
    ground_ball: "Ground Ball",
    draw_w: "Draw W",
    draw_l: "Draw L",
    to_f: "TO - F",
    to_u: "TO - U",
  };

  const event = await eventService.getByEventId(eventId);
  if (!event) throw new ApiError(404, "Event not found");

  // Fetch games and normalize to empty array
  const games = (await gameService.getGameByEventId(eventId)) ?? [];

  // Safe stats query
  let statsMap = {};
  if (games.length > 0) {
    const stats = await gameStatisticsService.findData({
      gameId: { $in: games.map(g => g._id) },
    });
    stats.forEach(s => {
      statsMap[s.gameId.toString()] = s;
    });
  }

  const BLUE = "3B82F6";
  const GREY = "E5E7EB";

  // =============== Event Row Helper =====================
  const addEventRowData = (sheet, event) => {
    let row = 1;
    const headers = ["Event Name", "Start Date", "End Date", "Event Director"];
    const values = [
      event.eventName,
      event.startDate ? event.startDate.toDateString() : "",
      event.endDate ? event.endDate.toDateString() : "",
      event.assignUserId?.fullName ?? "",
    ];

    headers.forEach((h, i) => {
      sheet.cell(row, i + 1).value(h).style({
        bold: true,
        fontColor: "FFFFFF",
        fill: BLUE,
        border: true,
        horizontalAlignment: "center",
      });
    });

    row++;
    values.forEach((v, i) => {
      sheet.cell(row, i + 1).value(v).style({
        border: true,
        horizontalAlignment: "left",
      });
    });

    return row + 2;
  };

  // ===== AUTO-WIDTH HELPER =====
  const applyAutoWidth = (sheet) => {
    const used = sheet.usedRange();
    if (!used) return;

    const end = used.endCell();
    const lastRow = end.rowNumber();
    const lastCol = end.columnNumber();

    for (let col = 1; col <= lastCol; col++) {
      let max = 12;
      for (let r = 1; r <= lastRow; r++) {
        const v = sheet.cell(r, col).value();
        if (v != null) max = Math.max(max, String(v).length + 2);
      }
      sheet.column(col).width(max);
    }
  };

  // ===== UNIQUE SHEET NAME HELPER =====
  const getUniqueSheetName = (workbook, baseName) => {
    let name = baseName.substring(0, 31); // max 31 chars
    let counter = 1;
    while (workbook.sheets().some(sheet => sheet.name() === name)) {
      const suffix = `_${counter}`;
      const allowedLength = 31 - suffix.length;
      name = baseName.substring(0, allowedLength) + suffix;
      counter++;
    }
    return name;
  };

  const workbook = await XlsxPopulate.fromBlankAsync();

  // ====================================
  // SHEET 0 — EVENT OVERVIEW
  // ====================================
  const overview = workbook.sheet(0).name("Event Overview");
  let overviewRow = addEventRowData(overview, event);

  /* games.forEach(g => {
    overview.cell(overviewRow, 1).value(`${g.homeTeamName} vs ${g.awayTeamName}`).style({
      bold: true,
      fontColor: "FFFFFF",
      fill: BLUE,
      fontSize: 14,
      horizontalAlignment: "center",
    });
    overview.range(overviewRow, 1, overviewRow, 4).merged(true);
    overviewRow += 2;
  }); */

  applyAutoWidth(overview);

  // ======================================================
  // Return only event sheet if no games
  // ======================================================
  if (games.length === 0) {
    const buffer = await workbook.outputAsync();
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="event_${eventId}_statistics.xlsx"`
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    return res.send(buffer);
  }

  // ======================================================
  // GAME SHEETS
  // ======================================================

  // =============== Event Row Helper =====================
  const addGameRowData = (sheet, game) => {
    let row = 1;
    //console.log(game);
    const headers = ["Home Team", "Away Team", "Field", "Start Date", "Score Keeper"];
    const values = [
      game.homeTeamName,
      game.awayTeamName,
      game.fieldId.name,
      game.startDateTime
        ? new Date(game.startDateTime).toLocaleString("en-US")
        : "",
      game.assignUserId?.fullName ?? "",
    ];

    headers.forEach((h, i) => {
      sheet.cell(row, i + 1).value(h).style({
        bold: true,
        fontColor: "FFFFFF",
        fill: BLUE,
        border: true,
        horizontalAlignment: "center",
      });
    });

    row++;
    values.forEach((v, i) => {
      sheet.cell(row, i + 1).value(v).style({
        border: true,
        horizontalAlignment: "left",
      });
    });

    return row + 2;
  };
  for (const game of games) {
    const gameStats = statsMap[game._id.toString()] ?? {};

    const baseName = `${game.homeTeamName} vs ${game.awayTeamName}`;
    const sheetName = getUniqueSheetName(workbook, baseName);
    const sheet = workbook.addSheet(sheetName);
    let row = 1;
    addGameRowData(sheet, game)

    row = 5;

    // TEAM SUMMARY HELPER
    const addSummary = (team) => {
      if (!team || !team.stats) return;

      const summary = {
        score: team.score,
        shotOn: team.stats.shotOn,
        shotOff: team.stats.shotOff,
        save: team.stats.save,
        groundBall: team.stats.groundBall,
        drawW: team.stats.drawW,
        drawL: team.stats.drawL,
        turnoverForced: team.stats.turnoverForced,
        turnoverUnforced: team.stats.turnoverUnforced,
        goal: team.stats.goal,
        penalty: team.stats.penalty,
      };

      let col = 1;
      for (const key of Object.keys(summary)) {
        sheet.cell(row, col).value(STAT_LABELS[key] || key).style({ bold: true });
        col++;
      }

      row++;
      col = 1;
      for (const val of Object.values(summary)) {
        sheet.cell(row, col).value(val ?? 0);
        col++;
      }
      row += 2;
    };

    // ACTIONS HELPER
    const addActions = (title, actions = []) => {
      sheet.cell(row, 1).value(title).style({
        bold: true,
        fontColor: "FFFFFF",
        fill: BLUE,
        horizontalAlignment: "center",
      });
      sheet.range(row, 1, row, 9).merged(true);
      row += 2;

      const headers = [
        "Type", "Player No", "Quarter", "Minute", "Second",
        "Penalty Type", "Penalty Minutes", "Penalty Seconds", "Infraction"
      ];
      headers.forEach((h, i) => sheet.cell(row, i + 1).value(h).style({ bold: true }));
      row++;

      actions.forEach(a => {
        sheet.cell(row, 1).value(STAT_LABELS[a.type] || a.type);
        sheet.cell(row, 2).value(a.playerNo ? `#${a.playerNo}` : "");
        sheet.cell(row, 3).value(a.quarter ?? "");
        sheet.cell(row, 4).value(a.minute ?? "");
        sheet.cell(row, 5).value(a.second ?? "");
        sheet.cell(row, 6).value(a.penaltyType ?? "");
        sheet.cell(row, 7).value(a.penaltyMinutes ?? "");
        sheet.cell(row, 8).value(a.penaltySeconds ?? "");
        sheet.cell(row, 9).value(a.infraction ?? "");
        row++;
      });
      row++;
    };

    sheet.cell(row, 1).value(game.homeTeamName + " TEAM SUMMARY").style({
      bold: true,
      fontColor: "FFFFFF",
      fill: BLUE,
      horizontalAlignment: "center",
    });
    sheet.range(row, 1, row, 11).merged(true);
    row += 2;
    addSummary(gameStats.homeTeam);

    sheet.cell(row, 1).value(game.awayTeamName + " TEAM SUMMARY").style({
      bold: true,
      fontColor: "FFFFFF",
      fill: BLUE,
      horizontalAlignment: "center",
    });
    sheet.range(row, 1, row, 11).merged(true);
    row += 2;
    addSummary(gameStats.awayTeam);

    addActions("Home Actions", gameStats.actions?.filter(a => a.team === "home") ?? []);
    addActions("Away Actions", gameStats.actions?.filter(a => a.team === "away") ?? []);

    applyAutoWidth(sheet);
  }

  // ====================================
  // SEND FILE
  // ====================================
  const buffer = await workbook.outputAsync();
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="event_${eventId}_statistics.xlsx"`
  );
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  return res.send(buffer);
});

module.exports = {
  createEvent,
  updateEvent,
  getEventById,
  deleteEvent,
  listEvents,
  getEventListByEventDirector,
  getEventByIdAndUserId,
  exportEventGames
};
