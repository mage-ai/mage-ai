import { useEffect, useMemo, useState } from 'react';

import BrowseTemplates from '@components/CustomTemplates/BrowseTemplates';
import Dashboard from '@components/Dashboard';
import PrivateRoute from '@components/shared/PrivateRoute';
import { queryFromUrl } from '@utils/url';

function Templates() {
  const [isNew, setIsNew] = useState<boolean>(false);
  const [objectType, setObjectType] = useState<string>(null);
  const [pipelineUUID, setPipelineUUID] = useState<string>(null);
  const q = queryFromUrl();

  useEffect(() => {
    const {
      new: newParam,
      object_type: objectTypeParam,
      pipeline_uuid: pipelineUUIDParam,
    } = q;

    if (objectTypeParam) {
      setObjectType(objectTypeParam);
    }

    if (pipelineUUIDParam) {
      setPipelineUUID(pipelineUUIDParam);
    }

    setIsNew(!!newParam);
  }, [q]);

  const keys = useMemo(() => {
    const arr = [isNew ? 'New' : 'Browse'];

    if (objectType) {
      arr.push(objectType);
    }

    if (pipelineUUID) {
      arr.push(pipelineUUID);
    }

    return arr;
  }, [
    isNew,
    objectType,
    pipelineUUID,
  ]);

  return (
    <Dashboard
      addProjectBreadcrumbToCustomBreadcrumbs={isNew}
      // @ts-ignore
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
        key={keys.join('_')}
        objectType={objectType}
        pipelineUUID={pipelineUUID}
        showAddingNewTemplates={isNew}
      />
    </Dashboard>
  );
}

Templates.getInitialProps = async () => ({});

export default PrivateRoute(Templates);
