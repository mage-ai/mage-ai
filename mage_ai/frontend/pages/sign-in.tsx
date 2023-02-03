import BasePage from '@components/BasePage';
import PublicRoute from '@components/shared/PublicRoute';
import SignForm from '@components/Sessions/SignForm';

function SignInPage() {
  return (
    <BasePage title="Sign in">
      <SignForm
        title="👋 Sign in"
      />
    </BasePage>
  );
}

SignInPage.getInitialProps = async () => ({});

export default PublicRoute(SignInPage, { redirectUrl: '/' });
