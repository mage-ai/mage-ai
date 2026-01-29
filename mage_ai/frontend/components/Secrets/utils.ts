import { SECRET_NAME_VALIDATION_REGEX } from './constants';

export const isSecretNameValid = (name: string) =>
  !!name && SECRET_NAME_VALIDATION_REGEX.test(name);

