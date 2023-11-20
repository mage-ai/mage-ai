import { useEffect, useState } from 'react';

import Button from '@oracle/elements/Button';
import Dashboard from '@components/Dashboard';
import GlobalHookDetail from '@components/GlobalHooks/GlobalHookDetail';
import GlobalHooksList from '@components/GlobalHooks/GlobalHooksList';
import PrivateRoute from '@components/shared/PrivateRoute';
import { Add } from '@oracle/icons';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { queryFromUrl } from '@utils/url';

function GlobalHooksPage() {
  const [isNew, setIsNew] = useState<boolean>(false);
  const q = queryFromUrl();

  useEffect(() => {
    const {
      new: newParam,
    } = q;

    setIsNew(!!newParam);
  }, [q]);

  return (
    <Dashboard
      addProjectBreadcrumbToCustomBreadcrumbs={isNew}
      // @ts-ignore
      breadcrumbs={isNew
        ? [
          {
            label: () => 'Global hooks',
            linkProps: {
              href: '/global-hooks',
            },
          },
          {
            bold: true,
            label: () => 'New',
          },
        ]
        : null
      }
      subheaderChildren={!isNew && (
        <>
          <Button
            beforeIcon={<Add size={UNIT * 2.5} />}
            linkProps={{
              as: '/global-hooks?new=1',
              href: '/global-hooks',
            }}
            noHoverUnderline
            primary
            sameColorAsText
          >
            Add new global hook
          </Button>
        </>
      )}
      title="Global hooks"
      uuid="GlobalHooks/index"
    >
      {isNew && (
        <GlobalHookDetail
          isNew={isNew}
        />
      )}

      {!isNew && (
        <GlobalHooksList />
      )}
    </Dashboard>
  );
}

GlobalHooksPage.getInitialProps = async () => ({});

export default PrivateRoute(GlobalHooksPage);
