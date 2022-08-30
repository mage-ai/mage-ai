import Dashboard from '@components/Dashboard';
import api from '@api';

function RunListPage() {
  const { data: dataProjects } = api.projects.list();
  const projects = dataProjects?.projects;

  return (
    <Dashboard
      projects={projects}
      title="Runs"
    />
  );
}

export default RunListPage;
