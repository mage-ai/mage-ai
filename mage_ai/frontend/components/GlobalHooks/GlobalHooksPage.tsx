import { useEffect, useState } from 'react';

import Button from '@oracle/elements/Button';
import Dashboard from '@components/Dashboard';
import GlobalHookDetail from '@components/GlobalHooks/GlobalHookDetail';
import GlobalHooksList from '@components/GlobalHooks/GlobalHooksList';
import { Add } from '@oracle/icons';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { queryFromUrl } from '@utils/url';

type GlobalHooksPageProps = {
  rootProject?: boolean;
};

function GlobalHooksPage({
  rootProject,
}: GlobalHooksPageProps) {
  const [isNew, setIsNew] = useState<boolean>(false);
  const q = queryFromUrl();

  useEffect(() => {
    const {
      new: newParam,
    } = q;

    setIsNew(!!newParam);
  }, [q]);

  const title = rootProject ? 'Platform global hooks' : 'Global hooks';

  return (
    <Dashboard
      addProjectBreadcrumbToCustomBreadcrumbs={isNew}
      // @ts-ignore
      breadcrumbs={isNew
        ? [
          {
            label: () => title,
            linkProps: {
              href: `/${rootProject ? 'platform/' : ''}global-hooks`,
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
            inline
            linkProps={{
              as: `/${rootProject ? 'platform/' : ''}global-hooks?new=1`,
              href: `/${rootProject ? 'platform/' : ''}global-hooks`,
            }}
            noHoverUnderline
            primary
            sameColorAsText
          >
            Add new global hook
          </Button>
        </>
      )}
      title={title}
      uuid="GlobalHooks/index"
    >
      {isNew && (
        <GlobalHookDetail
          isNew={isNew}
          rootProject={rootProject}
        />
      )}

      {!isNew && (
        <GlobalHooksList rootProject={rootProject} />
      )}
    </Dashboard>
  );
}

export default GlobalHooksPage;
