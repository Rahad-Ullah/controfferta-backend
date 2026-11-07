import { ISetting } from './setting.interface';
import { Setting } from './setting.model';

// ------------ create/update setting ------------------
const createOrUpdateSetting = async (payload: ISetting): Promise<ISetting | null> => {
  const result = await Setting.findOneAndUpdate(
    {},
    payload,
    { upsert: true, new: true }
  );
  return result;
};

// ------------ get setting ------------------
const getSetting = async (): Promise<ISetting | null> => {
  const result = await Setting.findOne();
  return result;
};

export const SettingServices = {
  createOrUpdateSetting,
  getSetting,
};