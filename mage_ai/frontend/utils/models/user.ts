import UserType from '@interfaces/UserType';

export function displayName(user: UserType): string {
  if (user?.first_name) {
    return [
      user?.first_name,
      user?.last_name,
    ].filter(n => n).join(' ');
  }

  return user?.username;
}
