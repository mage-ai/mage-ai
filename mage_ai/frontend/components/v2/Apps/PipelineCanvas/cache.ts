import { get as getBase, set } from '@storage/localStorage';

export function get(uuid) {
  return getBase(key(uuid)) ?? {};
}

export function update(uuid, data) {
  set(key(uuid), {
    ...get(uuid),
    ...data,
  });
}

export function remove(uuid, itemID) {
  const data = get(uuid);
  delete data[itemID];
  set(key(uuid), data);
}

function key(uuid: string) {
  return `pipeline_builder_canvas_local_settings_${uuid}`;
}
