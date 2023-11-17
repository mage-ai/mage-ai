import GoogleSignIn from '@components/Sessions/GoogleSignIn';
import MicrosoftSignIn from '@components/Sessions/MicrosoftSignIn';
import OktaSignIn from '@components/Sessions/OktaSignIn';

export enum OauthProviderEnum {
  ACTIVE_DIRECTORY = 'active_directory',
  GITHUB = 'github',
  GOOGLE = 'google',
  OKTA = 'okta',
}

export const OAUTH_PROVIDER_SIGN_IN_MAPPING = {
  [OauthProviderEnum.ACTIVE_DIRECTORY]: MicrosoftSignIn,
  [OauthProviderEnum.GOOGLE]: GoogleSignIn,
  [OauthProviderEnum.OKTA]: OktaSignIn,
};

export default interface OauthType {
  access_token?: string;
  provider: string;
}
