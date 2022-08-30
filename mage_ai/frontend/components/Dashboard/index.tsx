import Flex from '@oracle/components/Flex';
import Header from '@components/shared/Header';
import ProjectType from '@interfaces/ProjectType';
import Subheader from './Subheader';
import VerticalNavigation from './VerticalNavigation';
import { PURPLE_BLUE } from '@oracle/styles/colors/gradients';
import {
  ContainerStyle,
  VerticalNavigationStyle,
} from './index.style';

type DashboardProps = {
  children?: any;
  projects: ProjectType[];
  subheaderChildren?: any;
  title: string;
};

function Dashboard({
  children,
  projects,
  subheaderChildren,
  title,
}: DashboardProps) {
  const breadcrumbs = [];
  if (projects?.length >= 1) {
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
      <Header
        breadcrumbs={breadcrumbs}
        version={projects?.[0]?.version}
      />

      <ContainerStyle>
        <VerticalNavigationStyle>
          <VerticalNavigation />
        </VerticalNavigationStyle>

        <Flex
          flex={1}
          flexDirection="column"
        >
          <Subheader>
            {subheaderChildren}
          </Subheader>

          {children}
        </Flex>
      </ContainerStyle>
    </>
  );
}

export default Dashboard;
