import React from 'react';
import Dashboard from '@components/Dashboard';
import { BreadcrumbType } from '@components/shared/Header';
import { UNIT } from '@oracle/styles/units/spacing';
import { WorkspacesPageNameEnum, buildNavigationItems } from './constants';
import { getUser } from '@utils/session';

type WorkspacesDashboardProps = {
  before?: any;
  breadcrumbs?: BreadcrumbType[],
  children: any;
  pageName: WorkspacesPageNameEnum;
  subheaderChildren?: any;
};

function WorkspacesDashboard({
  before,
  breadcrumbs = [],
  children,
  pageName,
  subheaderChildren,
}: WorkspacesDashboardProps) {
  const user = getUser() || {};

  return (
    <Dashboard
      before={before}
      beforeWidth={before ? 50 * UNIT : 0}
      breadcrumbs={breadcrumbs}
      navigationItems={buildNavigationItems(user, pageName)}
      subheaderChildren={subheaderChildren}
      title="Workspaces"
      uuid="workspaces/index"
    >
      {children}
    </Dashboard>
  );
}

export default WorkspacesDashboard;
