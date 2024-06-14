const BASE_KEY = 'materia-ide';

function cacheKey(uuid: string): string {
  return `${BASE_KEY}-${uuid}`;
}
