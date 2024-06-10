import React, { Suspense, lazy } from 'react';

import Route from '@components/v2/Route';

const LazyAppLayout = lazy(() => import('@components/v2/AppLayout'));

function GridPage() {
  return (
    <React.StrictMode>
      <Suspense fallback={<div>Loading...</div>}>
        <LazyAppLayout />
      </Suspense>
    </React.StrictMode>
  );
}

export default Route(GridPage);
