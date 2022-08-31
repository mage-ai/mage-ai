import Flex from '@oracle/components/Flex';
import Head from '@oracle/elements/Head';
import Header, { BreadcrumbType } from '@components/shared/Header';
import ProjectType from '@interfaces/ProjectType';
import Subheader from './Subheader';
import VerticalNavigation, { VerticalNavigationProps } from './VerticalNavigation';
import api from '@api';
import { PURPLE_BLUE } from '@oracle/styles/colors/gradients';
import {
  ContainerStyle,
  VerticalNavigationStyle,
} from './index.style';

type DashboardProps = {
  breadcrumbs?: BreadcrumbType[];
  children?: any;
  subheaderChildren?: any;
  title: string;
};

function Dashboard({
  breadcrumbs: breadcrumbsProp,
  children,
  navigationItems,
  subheaderChildren,
  title,
}: DashboardProps & VerticalNavigationProps) {
  const { data: dataProjects } = api.projects.list();
  const projects = dataProjects?.projects;

  const breadcrumbs = [];
  if (breadcrumbsProp) {
    breadcrumbs.push(...breadcrumbsProp);
  } else if (projects?.length >= 1) {
    breadcrumbs.push(...[
      {
        label: () => projects[0]?.name,
      },
      {
        gradientColor: PURPLE_BLUE,
        label: () => title,
      },
    ]);
  }

  return (
    <>
      <Head title={title} />

      <Header
        breadcrumbs={breadcrumbs}
        version={projects?.[0]?.version}
      />

      <ContainerStyle>
        <VerticalNavigationStyle>
          <VerticalNavigation navigationItems={navigationItems} />
        </VerticalNavigationStyle>

        <Flex
          flex={1}
          flexDirection="column"
        >
          {subheaderChildren && (
            <Subheader>
              {subheaderChildren}
            </Subheader>
          )}

          {children}
        </Flex>
      </ContainerStyle>
    </>
  );
}

export default Dashboard;
