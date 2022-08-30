import Header from '@components/shared/Header';
import ProjectType from '@interfaces/ProjectType';
import { PURPLE_BLUE } from '@oracle/styles/colors/gradients';

type DashboardProps = {
  projects: ProjectType[];
  title: string;
};

function Dashboard({
  projects,
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
    </>
  );
}

export default Dashboard;
