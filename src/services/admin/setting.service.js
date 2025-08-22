const settingmodel = require('../../models/setting.model');

// Add & update setting data
const saveSettingData = async (id, reqBody) => {
  //console.log(id);
  if (id) {
    return settingmodel.findByIdAndUpdate(id, reqBody, {
      new: true,
      runValidators: true,
    });
  } else {
    return settingmodel.create(reqBody);
  }
};

// Get settings data
const getSettingsData = async () => {
  return settingmodel.findOne();
};

const saveTimeSetting = async (id, reqBody) => {
  //console.log(id);
  if (id) {
    return settingmodel.findByIdAndUpdate(id, reqBody, {
      new: true,
      runValidators: true,
    });
  } else {
    return settingmodel.create(reqBody);
  }
};

module.exports = {
  saveSettingData,
  getSettingsData,
  saveTimeSetting,
};
