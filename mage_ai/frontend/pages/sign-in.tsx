import BasePage from '@components/BasePage';
import SignForm from '@components/Sessions/SignForm';

function SignInPage() {
  return (
    <BasePage
      headerProps={{
        hideActions: true,
      }}
      title="Sign in"
    >
      <SignForm
        title="👋 Sign in"
      />
    </BasePage>
  );
}

SignInPage.getInitialProps = async () => ({});

export default SignInPage;
