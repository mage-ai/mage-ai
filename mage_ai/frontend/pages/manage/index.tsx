import React, { useCallback, useEffect, useMemo, useState } from 'react';

import Button from '@oracle/elements/Button';
import ConfigureWorkspace from '@components/workspaces/ConfigureWorkspace';
import ErrorsType from '@interfaces/ErrorsType';
import Panel from '@oracle/components/Panel';
import PrivateRoute from '@components/shared/PrivateRoute';
import ProjectType from '@interfaces/ProjectType';
import Table from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import WorkspacesDashboard from '@components/workspaces/Dashboard';
import WorkspaceDetail from '@components/workspaces/Detail';
import WorkspaceType, { WorkspaceQueryEnum } from '@interfaces/WorkspaceType';
import api from '@api';
import { BORDER_RADIUS_XXXLARGE } from '@oracle/styles/units/borders';
import { Expand, Refresh } from '@oracle/icons';
import { UNIT } from '@oracle/styles/units/spacing';
import { WorkspacesPageNameEnum } from '@components/workspaces/Dashboard/constants';
import { capitalizeRemoveUnderscoreLower } from '@utils/string';
import { useModal } from '@context/Modal';
import { getFilters, setFilters } from '@storage/workspaces';
import { useRouter } from 'next/router';
import Toolbar from '@components/shared/Table/Toolbar';
import { filterQuery, queryFromUrl } from '@utils/url';
import { META_QUERY_KEYS } from '@api/constants';
import { ClusterTypeEnum } from '@components/workspaces/constants';
import { isEmptyObject, selectEntriesWithValues } from '@utils/hash';
import { goToWithQuery } from '@utils/routing';

function WorkspacePage() {
  const router = useRouter();
  const { data: dataStatus } = api.statuses.list();
  const [errors, setErrors] = useState<ErrorsType>(null);

  const q = queryFromUrl();
  const query = useMemo(() => ({
    ...filterQuery(q, [
      WorkspaceQueryEnum.NAMESPACE,
    ]),
  }), [q]);

  const clusterType = useMemo(
    () => dataStatus?.statuses?.[0]?.instance_type || 'ecs',
    [dataStatus],
  );

  const { data } = api.projects.list({}, {
    revalidateOnFocus: false,
  });
  const project: ProjectType = useMemo(() => data?.projects?.[0], [data]);

  const { data: dataWorkspaces, mutate: fetchWorkspaces } = api.workspaces.list(
    {
      ...query,
      cluster_type: clusterType,
    },
    {
      revalidateOnFocus: false,
    },
  );

  const workspaces = useMemo(
    () => dataWorkspaces?.workspaces?.filter(({ name }) => name),
    [dataWorkspaces],
  );

  const [showModal, hideModal] = useModal(() => (
    <ConfigureWorkspace
      clusterType={clusterType}
      onCancel={hideModal}
      onCreate={() => {
        fetchWorkspaces();
        hideModal();
      }}
      project={project}
    />
  ), {
  }, [
    clusterType,
    fetchWorkspaces,
    project,
  ], {
    background: true,
    disableClickOutside: true,
    disableEscape: true,
    uuid: 'configure_workspace',
  });

  const [showDetailModal, hideDetailModal] = useModal(({
    workspace,
  }) => (
    <Panel>
      <div style={{ width: '750px' }}>
        <WorkspaceDetail
          clusterType={clusterType}
          fetchWorkspaces={fetchWorkspaces}
          onSuccess={hideDetailModal}
          setErrors={setErrors}
          workspace={workspace}
        />
      </div>
    </Panel>
  ), {
  }, [clusterType, fetchWorkspaces, setErrors, workspaces], {
    background: true,
    uuid: 'workspace_detail',
  });

  const onClickRow = useCallback((rowIndex: number) => {
    const workspace = workspaces?.[rowIndex];
    showDetailModal({ workspace });
  }, [showDetailModal, workspaces]);

  useEffect(() => {
    let queryFinal = {};

    if (isEmptyObject(query)) {
      const filtersQuery = {};
      const f = getFilters();

      if (f) {
        Object.entries(f).forEach(([k, v]) => {
          if (typeof v !== 'undefined' && v !== null) {
            // @ts-ignore
            if (META_QUERY_KEYS.includes(k)) {
              filtersQuery[k] = v;
            } else {
              filtersQuery[k] = [];

              Object.entries(v).forEach(([k2, v2]) => {
                if (v2) {
                  filtersQuery[k].push(k2);
                }
              });
            }
          }
        });
      }

      if (!isEmptyObject(filtersQuery)) {
        queryFinal = {};
        Object.entries({
          ...queryFinal,
          ...filtersQuery,
        } || {}).forEach(([k, v]) => {
          if (typeof v !== 'undefined' && v !== null) {
            queryFinal[k] = v;
          }
        });
      }
    } else {
      const f = {};
      Object.entries(query).forEach(([k, v]) => {
        f[k] = {};

        let v2 = v;

        if (typeof v !== 'undefined' && v !== null) {
          // @ts-ignore
          if (META_QUERY_KEYS.includes(k)) {
              f[k] = v2;
          } else {
            if (!Array.isArray(v2)) {
              // @ts-ignore
              v2 = [v2];
            }

            if (v2 && Array.isArray(v2)) {
              v2?.forEach((v3) => {
                f[k][v3] = true;
              });
            }
          }
        }
      });

      setFilters(selectEntriesWithValues(f));
    }

    if (!isEmptyObject(queryFinal)) {
      goToWithQuery(selectEntriesWithValues(queryFinal), {
        pushHistory: false,
      });
    }
  }, [
    query,
  ]);

  const toolbarEl = useMemo(() => {
    let filterOptions = {};
    let filterValueLabelMapping = {};
    if (clusterType === ClusterTypeEnum.K8S) {
      filterOptions = {
        namespace: [WorkspaceQueryEnum.ALL],
      };
      filterValueLabelMapping = {
        namespace: {
          [WorkspaceQueryEnum.ALL]: 'All namespaces',
        },
      };
    }

    return (
      <Toolbar
        addButtonProps={{
          label: 'Create new workspace',
          onClick: showModal,
        }}
        extraActionButtonProps={{
          Icon: Refresh,
          disabled: false,
          onClick: () => fetchWorkspaces(),
          tooltip: 'Refresh workspaces',
        }}
        filterOptions={filterOptions}
        filterValueLabelMapping={filterValueLabelMapping}
        onClickFilterDefaults={() => {
          setFilters({});
          router.push('/manage');
        }}
        onFilterApply={(query, updatedQuery) => {
          // @ts-ignore
          if (Object.values(updatedQuery).every(arr => !arr?.length)) {
            setFilters({});
          }
        }}
        // @ts-ignore
        query={query}
      />
    );
  }, [
    clusterType,
    fetchWorkspaces,
    query,
    router,
    showModal,
  ]);

  return (
    <WorkspacesDashboard  
      breadcrumbs={[
        {
          bold: true,
          label: () => 'Workspaces',
        },
      ]}
      errors={errors}
      pageName={WorkspacesPageNameEnum.WORKSPACES}
      setErrors={setErrors}
      subheaderChildren={toolbarEl}
    >
      <Table
        columnFlex={[2, 4, 2, 3, 1, null]}
        columns={[
          {
            uuid: 'Status',
          },
          {
            uuid: 'Instance Name',
          },
          {
            uuid: 'Type',
          },
          {
            uuid: 'URL/IP',
          },
          {
            uuid: 'Open',
          },
        ]}
        onClickRow={['ecs', 'k8s'].includes(clusterType) && onClickRow}
        rows={workspaces?.map(({ instance, url }: WorkspaceType) => {
          const {
            ip,
            name,
            status,
            type,
          } = instance;
          
          const ipOrUrl = url || ip;
          
          let link = ipOrUrl;
          if (ipOrUrl && !ipOrUrl.includes('http')) {
            link = `http://${ipOrUrl}`;
            if (clusterType === 'ecs') {
              link = `http://${ipOrUrl}:6789`;
            }
          }

          return [
            <Button
              borderRadius={`${BORDER_RADIUS_XXXLARGE}px`}
              danger={'STOPPED' === status}
              default={'PROVISIONING' === status}
              key="status"
              notClickable
              padding="6px"
              success={'RUNNING' === status}
              warning={'PENDING' === status}
            >
              {capitalizeRemoveUnderscoreLower(status)}
            </Button>,
            <Text
              key="name"
            >
              {name}
            </Text>,
            <Text
              key="type"
            >
              {capitalizeRemoveUnderscoreLower(type)}
            </Text>,
            <Text
              key="ip"
            >
              {ipOrUrl || 'N/A'}
            </Text>,
            <Button
              disabled={!ipOrUrl}
              iconOnly
              key="open_button"
              onClick={() => window.open(link)}
            >
              <Expand size={2 * UNIT} />
            </Button>,
          ];
        })}
      />
    </WorkspacesDashboard>
  );
}

WorkspacePage.getInitialProps = async () => ({});

export default PrivateRoute(WorkspacePage);
