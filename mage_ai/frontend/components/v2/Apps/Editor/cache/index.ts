import { FileType } from '../../../IDE/interfaces';
import { get, set } from '@storage/localStorage';
import { isJsonString } from '@utils/string';

const BASE_KEY = 'materia-ide';

interface CachedFileType {
  cachedAt: number;
  file: FileType;
  updatedAt?: number;
}

export interface CacheType {
  client: CachedFileType;
  server: CachedFileType;
}

function cacheKey(uuid: string): string {
  return `${BASE_KEY}-${uuid}`;
}

export function getItem(uuid: string): FileType | null {
  return get(cacheKey(uuid));
}

export function updateFile(clientFile: FileType, serverFile?: FileType) {
  const key = cacheKey(clientFile.path);
  const ts = Number(new Date());

  let cache = get(key);

  if (!cache) {
    cache = {
      client: {
        cachedAt: ts,
      },
      server: {
        cachedAt: ts,
      },
    };
  }

  cache.client = {
    ...(cache?.client || {}),
    file: {
      ...(cache?.client?.file || {}),
      ...clientFile,
    },
    updatedAt: ts,
  };

  if (serverFile) {
    cache.server = {
      ...(cache?.server || {}),
      file: {
        ...(cache?.server?.file || {}),
        ...serverFile,
      },
      updatedAt: ts,
    };
  }

  set(key, cache);

  return cache;
}
