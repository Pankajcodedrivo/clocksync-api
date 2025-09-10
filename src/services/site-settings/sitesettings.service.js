const Settings = require('../../models/setting.model');

const getSettings = async () => {
  const settingsData = await Settings.findOne().sort({ createdAt: -1 });
  return settingsData;
};

module.exports = {
  getSettings
};
