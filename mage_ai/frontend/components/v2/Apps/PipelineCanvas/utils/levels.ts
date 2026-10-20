const DELIMITER = '--';

export function buildNamesapceForLevel(level: number): string {
  return `level_${level}`;
}

export function buildUUIDForLevel(uuid: string, level: number): string {
  return [buildNamesapceForLevel(level) ?? '', String(uuid ?? '')]
    ?.filter?.(Boolean)
    .join(DELIMITER);
}

export function getBaseUUIDAtLevel(uuid: string, level: number): string {
  const prefix = `${buildUUIDForLevel('', level)}${DELIMITER}`;

  if (uuid?.startsWith(prefix)) {
    return uuid?.replace(prefix, '');
  }

  return uuid;
}
