import React, { useMemo } from 'react';
import Dashboard from '@components/Dashboard';
import ErrorsType from '@interfaces/ErrorsType';
import api from '@api';
import useGetUser from '@utils/hooks/useGetUser';
import { BreadcrumbType } from '@components/shared/Header';
import { UNIT } from '@oracle/styles/units/spacing';
import { WorkspacesPageNameEnum, buildNavigationItems } from './constants';

type WorkspacesDashboardProps = {
  before?: any;
  breadcrumbs?: BreadcrumbType[],
  children: any;
  errors?: ErrorsType;
  headerOffset?: number;
  mainContainerHeader?: any;
  pageName: WorkspacesPageNameEnum;
  setErrors?: (errors: ErrorsType) => void;
  subheaderChildren?: any;
};

function WorkspacesDashboard({
  before,
  breadcrumbs = [],
  children,
  errors,
  headerOffset,
  mainContainerHeader,
  pageName,
  setErrors,
  subheaderChildren,
}: WorkspacesDashboardProps) {
  const { data: dataStatus } = api.statuses.list();
  const projectType = useMemo(
    () => dataStatus?.statuses?.[0]?.project_type,
    [dataStatus],
  );

  const user = useGetUser() || {};

  return (
    <Dashboard
      before={before}
      beforeWidth={before ? 50 * UNIT : 0}
      breadcrumbs={breadcrumbs}
      errors={errors}
      headerOffset={headerOffset}
      mainContainerHeader={mainContainerHeader}
      navigationItems={buildNavigationItems(user, projectType, pageName)}
      setErrors={setErrors}
      subheaderChildren={subheaderChildren}
      title="Workspaces"
      uuid="workspaces/index"
    >
      {children}
    </Dashboard>
  );
}

export default WorkspacesDashboard;
