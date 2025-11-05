const Event = require('../../models/event.model');

// ✅ Create new Event
const createEvent = async (data) => {
  return Event.create(data);
};

// ✅ Find Event by id
const getByEventId = async (id) => {
  return Event.findById(id).populate('assignUserId');
};

// ✅ Find Event by id and assigned user
const getEventByIdAndUserId = async (_id, assignUserId) => {
  return Event.findOne({ _id, assignUserId });
};

// ✅ Update Event (prevent endDateTime update after endEvent=true)
const updateEvent = async (id, data) => {
  const event = await Event.findById(id);
  if (!event) throw new Error('Event not found');

  if (event.endEvent == true) {
    throw new Error('Cannot update endDate after event has ended.');
  }

  Object.assign(event, data);
  return event.save();
};

// ✅ List all events with pagination + search
const listEvents = async ({ page = 1, limit = 10, search = "", user }) => {
  const skip = (page - 1) * limit;

  const match = {};
  if (user?.role === "event-director") {
    match.assignUserId = user._id;
  }

  const pipeline = [
    {
      $lookup: {
        from: "users",
        localField: "assignUserId",
        foreignField: "_id",
        as: "assignedUser",
      },
    },
    { $unwind: { path: "$assignedUser", preserveNullAndEmptyArrays: true } },
    { $match: match },
  ];

  // 🔎 Add search filter
  if (search) {
    pipeline.push({
      $match: {
        $or: [
          { eventName: { $regex: search, $options: "i" } },
          { "assignedUser.fullName": { $regex: search, $options: "i" } },
        ],
      },
    });
  }

  const totalPipeline = [...pipeline, { $count: "total" }];
  const totalResult = await Event.aggregate(totalPipeline);
  const total = totalResult[0]?.total || 0;

  const events = await Event.aggregate([
    ...pipeline,
    { $sort: { createdAt: -1 } },
    { $skip: skip },
    { $limit: limit },
  ]);

  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    events,
  };
};

// ✅ Delete Event
const deleteEventById = async (id) => {
  return Event.findByIdAndDelete(id);
};

// ✅ Get event by field
const getEventByFieldId = async (fieldId) => {
  const now = new Date();

  // Find event that is currently active
  return Event.findOne({
    fieldId,
    startDateTime: { $lte: now },
    endDateTime: { $gte: now },
    endEvent: false,
  }).sort({ startDateTime: 1 });
};

// ✅ Count events
const getEventCount = async () => {
  return Event.countDocuments();
};

// ✅ Count events
const getEventByMatch = async (match) => {
  return Event.find(match);
};

module.exports = {
  createEvent,
  getByEventId,
  getEventByIdAndUserId,
  updateEvent,
  listEvents,
  deleteEventById,
  getEventByFieldId,
  getEventCount,
  getEventByMatch
};
