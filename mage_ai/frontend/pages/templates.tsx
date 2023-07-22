import { useEffect, useState } from 'react';

import BrowseTemplates from '@components/CustomTemplates/BrowseTemplates';
import Dashboard from '@components/Dashboard';
import PrivateRoute from '@components/shared/PrivateRoute';
import { queryFromUrl } from '@utils/url';

function Templates() {
  const [isNew, setIsNew] = useState<boolean>(false);
  const q = queryFromUrl();

  useEffect(() => {
    const { new: newParam } = q;
    setIsNew(!!newParam);
  }, [q]);

  return (
    <Dashboard
      addProjectBreadcrumbToCustomBreadcrumbs={isNew}
      breadcrumbs={isNew
        ? [
          {
            label: () => 'Templates',
            linkProps: {
              href: '/templates',
            },
          },
          {
            bold: true,
            label: () => 'New',
          },
        ]
        : null
      }
      title="Templates"
      uuid="Templates/index"
    >
      <BrowseTemplates
        key={isNew ? 'New' : 'Browse'}
        showAddingNewTemplates={isNew}
      />
    </Dashboard>
  );
}

Templates.getInitialProps = async () => ({});

export default PrivateRoute(Templates);
