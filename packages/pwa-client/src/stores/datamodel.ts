import { create } from 'zustand';

interface DataModelState {
  models: Map<string, Record<string, unknown>>;
  updateDataModel: (surfaceId: string, path: string, value: unknown) => void;
  getDataModel: (surfaceId: string) => Record<string, unknown>;
  clearDataModel: (surfaceId: string) => void;
}

function setNestedValue(
  obj: Record<string, unknown>,
  path: string,
  value: unknown,
): Record<string, unknown> {
  const keys = path.split('.');
  const result = { ...obj };

  if (keys.length === 1) {
    result[keys[0]] = value;
    return result;
  }

  let current = result;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    const existing = current[key];
    const next =
      existing !== null && existing !== undefined && typeof existing === 'object'
        ? { ...(existing as Record<string, unknown>) }
        : {};
    current[key] = next;
    current = next;
  }
  current[keys[keys.length - 1]] = value;

  return result;
}

export const useDataModelStore = create<DataModelState>((set, get) => ({
  models: new Map(),

  updateDataModel: (surfaceId, path, value) =>
    set((state) => {
      const models = new Map(state.models);
      const existing = models.get(surfaceId) ?? {};
      models.set(surfaceId, setNestedValue(existing, path, value));
      return { models };
    }),

  getDataModel: (surfaceId) => get().models.get(surfaceId) ?? {},

  clearDataModel: (surfaceId) =>
    set((state) => {
      const models = new Map(state.models);
      models.delete(surfaceId);
      return { models };
    }),
}));
