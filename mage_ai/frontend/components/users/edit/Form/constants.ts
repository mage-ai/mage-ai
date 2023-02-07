export interface UserFieldType {
  autoComplete?: boolean;
  disabled?: boolean;
  label: string;
  type?: string;
  uuid: string;
}

export const USER_PROFILE_FIELDS = [
  {
    autoComplete: false,
    label: 'Username',
    required: true,
    uuid: 'username',
  },
  {
    autoComplete: false,
    disabled: true,
    label: 'Email',
    required: true,
    type: 'email',
    uuid: 'email',
  },
];

export const USER_PASSWORD_FIELDS = [
  {
    autoComplete: true,
    label: 'Current password',
    type: 'password',
    uuid: 'password_current',
  },
  {
    autoComplete: false,
    label: 'New password',
    type: 'password',
    uuid: 'password',
  },
  {
    autoComplete: false,
    label: 'Confirm new password',
    type: 'password',
    uuid: 'password_confirmation',
  },
];
