import { useEffect, useState } from 'react';
import { redirectToUrl } from '@utils/url';
import Headline from '@oracle/elements/Headline';
import Text from '@oracle/elements/Text';
import Spacing from '@oracle/elements/Spacing';
import GradientLogoIcon from '@oracle/icons/GradientLogo';

function NotFoundPage() {
  const [secondsToRedirect, setSecondsToRedirect] = useState(5);
  useEffect(() => {
    const i = setInterval(() => {
      if (secondsToRedirect > 0) {
        setSecondsToRedirect(secondsToRedirect - 1);
      } else {
        redirectToUrl('/pipelines');
      }
    }, 1000);

    return () => clearInterval(i);
  }, [secondsToRedirect]);

  return (
    <main
      style={{
        alignItems: 'center',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        marginTop: '16rem',
      }}
    >
      <GradientLogoIcon height={64} />
      <Spacing my={2}>
        <Headline level={1}>404 - Page Not Found</Headline>
      </Spacing>
      <Text large>
        You will be redirected to the Pipelines dashboard in {secondsToRedirect} seconds.
      </Text>
    </main>
  );
}

export default NotFoundPage;
