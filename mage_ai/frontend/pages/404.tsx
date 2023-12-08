import { useEffect } from 'react';
import { redirectToUrl } from '@utils/url';
import { toast } from 'react-toastify';

function NotFoundPage() {
  useEffect(() => {
    toast.error('The previous page does not exist.');
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
