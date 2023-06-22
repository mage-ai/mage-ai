import React, { useMemo } from 'react';
import Dashboard from '@components/Dashboard';
import ErrorsType from '@interfaces/ErrorsType';
import api from '@api';
import { BreadcrumbType } from '@components/shared/Header';
import { UNIT } from '@oracle/styles/units/spacing';
import { WorkspacesPageNameEnum, buildNavigationItems } from './constants';
import { getUser } from '@utils/session';

type WorkspacesDashboardProps = {
  before?: any;
  breadcrumbs?: BreadcrumbType[],
  children: any;
  errors?: ErrorsType;
  pageName: WorkspacesPageNameEnum;
  subheaderChildren?: any;
};

function WorkspacesDashboard({
  before,
  breadcrumbs = [],
  children,
  errors,
  pageName,
  subheaderChildren,
}: WorkspacesDashboardProps) {
  const { data: dataStatus } = api.statuses.list();
  const projectType = useMemo(
    () => dataStatus?.statuses?.[0]?.project_type,
    [dataStatus],
  );

  const user = getUser() || {};

  return (
    <Dashboard
      before={before}
      beforeWidth={before ? 50 * UNIT : 0}
      breadcrumbs={breadcrumbs}
      errors={errors}
      navigationItems={buildNavigationItems(user, projectType, pageName)}
      subheaderChildren={subheaderChildren}
      title="Workspaces"
      uuid="workspaces/index"
    >
      {children}
    </Dashboard>
  );
}

export default WorkspacesDashboard;
