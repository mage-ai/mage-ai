import { FileType } from '../interfaces';
import { get, remove, set } from '@storage/localStorage';

const BASE_KEY = 'materia-ide';

interface CachedFileType {
  cachedAt: number;
  file: FileType;
  updatedAt?: number;
}

export interface FileCacheType {
  client: CachedFileType;
  server: CachedFileType;
}

function cacheKey(uuid: string): string {
  return `${BASE_KEY}-${uuid}`;
}

export function isStale(path: string): boolean {
  const { client, server } = get(cacheKey(path)) || ({} as FileCacheType);
  return client?.file?.content !== server?.file?.content;
}

export function getFileCache(path: string): FileCacheType | null {
  return get(cacheKey(path));
}

export function deleteFileCache(path: string) {
  return remove(cacheKey(path));
}

export function updateFileCache({
  client: fileClient,
  server: fileServer,
}: {
  client?:
    | FileType
    | {
        content: string;
        path: string;
      };
  server?: FileType;
}) {
  const key = cacheKey(fileClient?.path || fileServer?.path);
  const ts = Number(new Date());

  let cache = get(key);
  const miss = !cache;
  cache = cache || {};

  if (fileClient) {
    cache.client = {
      ...(cache?.client || {}),
      cachedAt: miss ? ts : cache?.client?.cachedAt,
      file: {
        ...(cache?.client?.file || {}),
        ...fileClient,
      },
      updatedAt: ts,
    };
  }

  if (fileServer) {
    cache.server = {
      ...(cache?.server || {}),
      cachedAt: miss ? ts : cache?.server?.cachedAt,
      file: {
        ...(cache?.server?.file || {}),
        ...fileServer,
      },
      updatedAt: ts,
    };
  }

  set(key, cache);

  return cache;
}
