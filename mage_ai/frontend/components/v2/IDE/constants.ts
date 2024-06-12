import { LanguageEnum } from './languages/constants';

export const languageClientConfig = {
  languageId: LanguageEnum.PYTHON,
  options: {
    $type: 'WebSocket',
    host: 'localhost',
    port: 8765,
    secured: false,
  },
};
export const loggerConfig = {
  debugEnabled: true,
  enabled: true,
};
