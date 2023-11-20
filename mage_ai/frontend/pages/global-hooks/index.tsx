import { useEffect, useState } from 'react';

// import Button from '@oracle/elements/Button';
import Dashboard from '@components/Dashboard';
import GlobalHookDetail from '@components/GlobalHooks/GlobalHookDetail';
import GlobalHooksList from '@components/GlobalHooks/GlobalHooksList';
import PrivateRoute from '@components/shared/PrivateRoute';
// import Spacing from '@oracle/elements/Spacing';
// import { Add } from '@oracle/icons';
// import { GlobalDataProductObjectTypeEnum } from '@interfaces/GlobalDataProductType';
// import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { queryFromUrl } from '@utils/url';

function GlobalHooksPage() {
  const [isNew, setIsNew] = useState<boolean>(false);
  const [objectUUID, setObjectUUID] = useState<string>(null);
  const [objectType, setObjectType] = useState<string>(null);
  const q = queryFromUrl();

  useEffect(() => {
    const {
      new: newParam,
      object_type: objectTypeParam,
      object_uuid: objectUUIDParam,
    } = q;

    if (objectTypeParam) {
      setObjectType(objectTypeParam);
    }

    if (objectUUIDParam) {
      setObjectUUID(objectUUIDParam);
    }

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
      title="Global hooks"
      uuid="GlobalHooks/index"
    >
      {isNew && (
        <GlobalHookDetail
          // globalDataProduct={{
          //   object_type: objectType ? objectType as GlobalDataProductObjectTypeEnum : null,
          //   object_uuid: objectUUID,
          // }}
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
