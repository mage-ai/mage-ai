import Dashboard from '@components/Dashboard';
import VerticalSectionLinks from '@components/VerticalSectionLinks';
import { BEFORE_WIDTH, BeforeStyle } from '@components/PipelineDetail/shared/index.style';
import { WorkspacesPageNameEnum, buildNavigationItems } from './constants';
import { getUser } from '@utils/session';
import { VERTICAL_NAVIGATION_WIDTH } from '@components/Dashboard/index.style';
import { BreadcrumbType } from '@components/shared/Header';

type WorkspacesDashboardProps = {
  breadcrumbs?: BreadcrumbType[],
  children: any;
  pageName: WorkspacesPageNameEnum;
  subheaderChildren: any;
};

function WorkspacesDashboard({
  breadcrumbs = [],
  children,
  pageName,
  subheaderChildren,
}: WorkspacesDashboardProps) {
  const user = getUser() || {};

  return (
    <Dashboard
      afterWidth={VERTICAL_NAVIGATION_WIDTH}
      breadcrumbs={[
        {
          bold: true,
          label: () => 'Workspaces',
        },
        ...breadcrumbs,
      ]}
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
