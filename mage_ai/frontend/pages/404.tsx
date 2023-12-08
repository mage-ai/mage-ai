import { useEffect } from 'react';
import { redirectToUrl } from '@utils/url';

function NotFoundPage() {
  useEffect(() => {
    redirectToUrl('/pipelines');
  }, []);

  return (
    <>
      <h1>404 - Page Not Found</h1>
      <p>Sorry, that page does not exist.</p>
    </>
  );
}

export default NotFoundPage;
