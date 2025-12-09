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
  // ✅ Check role
  if (req.user.role !== 'event-director') {
    return res.status(403).json({
      status: 403,
      message: "Only event directors can access this data"
    });
  }

  // ✅ Define today's date
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // ✅ Fetch all events assigned to the director where endDate >= today
  const events = await eventService.getEventByMatch({
    assignUserId: req.user._id,
    endDate: { $gte: today }
  });

  return res.status(200).json({
    status: 200,
    events
  });
});


const exportEventGames = catchAsync(async (req, res) => {
  const { eventId } = req.params;

  const event = await eventService.getByEventId(eventId);
  if (!event) throw new ApiError(404, "Event not found");

  const games = await gameService.getGameByEventId({ eventId });

  const statsMap = {};
  const stats = await gameStatisticsService.findData({
    gameId: { $in: games.map((g) => g._id) }
  });

  stats.forEach(s => { statsMap[s.gameId.toString()] = s });

  const BLUE = "3B82F6";
  const GREY = "E5E7EB";

  // -----------------------------
  // Helper: Event row (A1–D1)
  // -----------------------------
  const addEventRowData = (sheet, event) => {
    let row = 1;

    const headers = ["Event Name", "Start Date", "End Date", "Event Director"];
    const values = [
      event.eventName,
      event.startDate ? event.startDate.toDateString() : "",
      event.endDate ? event.endDate.toDateString() : "",
      event.assignUserId.fullName ? event.assignUserId.fullName.toString() : ""
    ];

    // Header row
    headers.forEach((h, i) => {
      sheet.cell(row, i + 1)
        .value(h)
        .style({
          bold: true,
          fill: GREY,
          border: true,
          horizontalAlignment: "center",
        });
    });

    row++;

    // Value row
    values.forEach((v, i) => {
      sheet.cell(row, i + 1)
        .value(v)
        .style({
          border: true,
          horizontalAlignment: "left",
        });
    });

    return row + 2; // Next available row
  };

  // -----------------------------
  // Label dictionary
  // -----------------------------
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
    goal: "Goal",
    penalty: "Penalty",
  };

  const workbook = await XlsxPopulate.fromBlankAsync();

  // ============================================
  // SHEET 0 — EVENT OVERVIEW
  // ============================================
  const overview = workbook.sheet(0).name("Event Overview");

  let overviewRow = addEventRowData(overview, event);

  // List each game below the event info
  games.forEach(g => {
    overview.cell(overviewRow, 1)
      .value(`${g.homeTeamName} vs ${g.awayTeamName}`)
      .style({
        bold: true,
        fontColor: "FFFFFF",
        fill: BLUE,
        fontSize: 14,
        horizontalAlignment: "center",
      });

    // Merge across A–D
    overview.range(overviewRow, 1, overviewRow, 4).merged(true);
    overviewRow += 2;
  });

  overview.column(1).width(25);
  overview.column(2).width(25);
  overview.column(3).width(25);
  overview.column(4).width(35);

  // ============================================
  // GAME SHEETS
  // ============================================
  for (let i = 0; i < games.length; i++) {
    const game = games[i];
    const gameStats = statsMap[game._id.toString()];

    const sheetName = `${game.homeTeamName} vs ${game.awayTeamName}`.substring(0, 31);
    const sheet = i === 0 ? workbook.addSheet(sheetName) : workbook.addSheet(sheetName);

    let row = 1;

    // -----------------------------
    // GAME TITLE — A1 only
    // -----------------------------
    sheet.cell(1, 1)
      .value(`${game.homeTeamName} vs ${game.awayTeamName}`)
      .style({
        bold: true,
        fontColor: "FFFFFF",
        fill: BLUE,
        fontSize: 16,
        horizontalAlignment: "center",
      });

    row = 3; // Leave a blank row

    // -----------------------------
    // Team Summary Helper
    // -----------------------------
    const addSummary = (team) => {
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

      // Header
      let col = 1;
      Object.keys(summary).forEach(k => {
        sheet.cell(row, col).value(STAT_LABELS[k]).style({ bold: true });
        col++;
      });
      row++;

      // Values
      col = 1;
      Object.values(summary).forEach(v => {
        sheet.cell(row, col).value(v ?? 0);
        col++;
      });

      row += 2;
    };

    // -----------------------------
    // Actions Table Helper
    // -----------------------------
    const addActions = (title, actions) => {
      sheet.cell(row, 1)
        .value(title)
        .style({
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

      headers.forEach((h, i) => {
        sheet.cell(row, i + 1).value(h).style({ bold: true });
      });
      row++;

      actions.forEach(a => {
        sheet.cell(row, 1).value(STAT_LABELS[a.type] || a.type);
        sheet.cell(row, 2).value(a.playerNo ? `#${a.playerNo}` : "");
        sheet.cell(row, 3).value(a.quarter);
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

    // -----------------------------
    // Build Game Sheet Content
    // -----------------------------
    sheet.cell(row, 1).value("Home Summary").style({ bold: true });
    row++;
    addSummary(gameStats.homeTeam);

    sheet.cell(row, 1).value("Away Summary").style({ bold: true });
    row++;
    addSummary(gameStats.awayTeam);

    addActions("Home Actions", gameStats.actions.filter(a => a.team === "home"));
    addActions("Away Actions", gameStats.actions.filter(a => a.team === "away"));

    // Auto column width
    const used = sheet.usedRange();
    if (used) {
      const end = used.endCell();
      const lastRow = end.rowNumber();
      const lastCol = end.columnNumber();

      for (let col = 1; col <= lastCol; col++) {
        let max = 10;
        for (let r = 1; r <= lastRow; r++) {
          const v = sheet.cell(r, col).value();
          if (v != null) max = Math.max(max, String(v).length + 2);
        }
        sheet.column(col).width(max);
      }
    }
  }

  // Send File
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
