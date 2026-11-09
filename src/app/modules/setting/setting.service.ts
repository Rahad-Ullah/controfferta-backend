import { Setting } from './setting.model';

// a nested object becomes dotted paths so one field does not replace its siblings
const flatten = (value: unknown, prefix = ''): Record<string, unknown> => {
  if (value === undefined) return {};
  if (Array.isArray(value) || value === null || typeof value !== 'object') {
    return prefix ? { [prefix]: value } : {};
  }

  return Object.entries(value as Record<string, unknown>).reduce(
    (fields, [key, child]) => {
      const path = prefix ? `${prefix}.${key}` : key;
      return { ...fields, ...flatten(child, path) };
    },
    {},
  );
};

// ---------------- create or update setting ----------------
// one document for the site; a partial update keeps the fields that were not sent
const createOrUpdateSetting = async (payload: Record<string, unknown>) => {
  const $set = flatten(payload);
  if (!Object.keys($set).length) {
    return Setting.findOne();
  }

  return Setting.findOneAndUpdate(
    {},
    { $set },
    { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true },
  );
};

// ---------------- get setting ----------------
const getSetting = async () => Setting.findOne();

export const SettingServices = {
  createOrUpdateSetting,
  getSetting,
};
