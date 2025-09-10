const catchAsync = require('../../helpers/asyncErrorHandler');
const service = require('../../services/admin/setting.service');

// Add & update setting
const saveSettings = catchAsync(async (req, res, next) => {
  const settingId = req.params.id;
  const data = { ...req.body };
  // Extract file locations from req.files
  if (req.files) {
    if (req.files.sitelogo && req.files.sitelogo[0].location) {
      data.sitelogo = req.files.sitelogo[0].location;
    }
  }
  // Handle desktop placements
  ["top", "right", "left"].forEach((pos) => {
    if (req.files?.[`desktop[${pos}][image]`]?.[0]?.location) {
      data.desktop[pos].image = req.files[`desktop[${pos}][image]`][0].location;
    }
  });

  // Handle mobile placements
  ["top", "middle", "bottom"].forEach((pos) => {
    if (req.files?.[`mobile[${pos}][image]`]?.[0]?.location) {
      data.mobile[pos].image = req.files[`mobile[${pos}][image]`][0].location;
    }
  });

  await service.saveSettingData(settingId, data);
  res.status(200).send({ message: 'Settings saved successfully' });
});

// Get settings
const getSettings = catchAsync(async (req, res, next) => {
  const settings = await service.getSettingsData();
  res.status(200).json({ message: 'Get General Settings', settings });
});

const saveTimeSetting = catchAsync(async (req, res, next) => {
  const settingId = req.params.id;
  const { pauseTime } = req.body;

  if (pauseTime === undefined || pauseTime === null) {
    return res.status(400).json({ error: 'pauseTime is required' });
  }

  const now = new Date();
  now.setMinutes(now.getMinutes() + Number(pauseTime));

  const data = {
    pauseTime: now
  };

  await service.saveTimeSetting(settingId, data);
  res
    .status(200)
    .send({ status: 200, message: 'Settings saved successfully', data: data });
});
// deep
module.exports = {
  saveSettings,
  getSettings,
  saveTimeSetting,
};
