const catchAsync = require('../../helpers/asyncErrorHandler');
const ApiError = require('../../helpers/apiErrorConverter');
const eventService = require('../../services/event/event.service');

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

module.exports = {
  createEvent,
  updateEvent,
  getEventById,
  deleteEvent,
  listEvents,
  getEventListByEventDirector,
  getEventByIdAndUserId
};
