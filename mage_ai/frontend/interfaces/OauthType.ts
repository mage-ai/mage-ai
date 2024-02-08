import GoogleSignIn from '@components/Sessions/GoogleSignIn';
import MicrosoftSignIn from '@components/Sessions/MicrosoftSignIn';
import OktaSignIn from '@components/Sessions/OktaSignIn';

export enum OauthProviderEnum {
  ACTIVE_DIRECTORY = 'active_directory',
  BITBUCKET = 'bitbucket',
  GITHUB = 'github',
  GITLAB = 'gitlab',
  GOOGLE = 'google',
  OKTA = 'okta',
}

export const OAUTH_PROVIDER_SIGN_IN_MAPPING = {
  [OauthProviderEnum.ACTIVE_DIRECTORY]: MicrosoftSignIn,
  [OauthProviderEnum.GOOGLE]: GoogleSignIn,
  [OauthProviderEnum.OKTA]: OktaSignIn,
};

export default interface OauthType {
  provider?: string;
  authenticated?: boolean;
  expires?: string;
  url?: string;
  redirect_query_params?: any;
}
