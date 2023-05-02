export interface UserFieldType {
  autoComplete?: string;
  disabled?: boolean;
  label: string;
  required?: boolean;
  type?: string;
  uuid: string;
}

export const USER_PROFILE_FIELDS = [
  {
    autoComplete: 'username',
    label: 'Username',
    required: true,
    uuid: 'username',
  },
  {
    autoComplete: 'email',
    disabled: false,
    label: 'Email',
    required: true,
    type: 'email',
    uuid: 'email',
  },
];

export const USER_PASSWORD_CURRENT_FIELD_UUID = 'password_current';

export const USER_PASSWORD_FIELDS = [
  {
    autoComplete: 'current-password',
    label: 'Current password',
    type: 'password',
    uuid: USER_PASSWORD_CURRENT_FIELD_UUID,
  },
  {
    autoComplete: 'new-password',
    label: 'New password',
    type: 'password',
    uuid: 'password',
  },
  {
    autoComplete: 'new-password',
    label: 'Confirm new password',
    type: 'password',
    uuid: 'password_confirmation',
  },
];
