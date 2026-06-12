export function toRad(deg) {
  return (parseFloat(deg) || 0) * (Math.PI / 180);
}

export function readNumber(...values) {
  for (const value of values) {
    const parsed = parseFloat(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 0;
}

export function getModelPosition(model, building) {
  return {
    x: readNumber(
      model?.building_offset_x,
      model?.offset_x,
      building?.offset_x
    ),
    y: readNumber(
      model?.building_offset_y,
      model?.offset_y,
      building?.offset_y
    ),
    z: readNumber(
      model?.building_offset_z,
      model?.offset_z,
      building?.offset_z
    ),
  };
}

export function getModelScale(model) {
  return {
    x: readNumber(model?.scale_x, model?.scale) || 1,
    y: readNumber(model?.scale_y, model?.scale) || 1,
    z: readNumber(model?.scale_z, model?.scale) || 1,
  };
}

export function getModelRotation(model) {
  return {
    x: parseFloat(model?.rotate_x) || 0,
    y: parseFloat(model?.rotate_y) || 0,
    z: parseFloat(model?.rotate_z) || 0,
  };
}

export function findBuildingModel(allModels = [], building) {
  if (!building) return null;

  return allModels.find(
    (m) =>
      String(m.building_id) === String(building.id) &&
      (m.is_active === true || m.is_active === 1 || m.is_active === '1')
  ) ?? allModels.find(
    (m) => String(m.building_id) === String(building.id)
  ) ?? null;
}

export function getFocusKey(building, model) {
  if (!building) return 'campus';

  const pos = getModelPosition(model, building);

  return [
    building.id,
    pos.x.toFixed(3),
    pos.y.toFixed(3),
    pos.z.toFixed(3),
  ].join(':');
}