import Dashboard from '@components/Dashboard';
import api from '@api';

function PipelineListPage() {
  const {
    data,
  } = api.pipelines.list();
  const { data: dataProjects } = api.projects.list();

  const pipelines = data?.pipelines;
  const projects = dataProjects?.projects;

  return (
    <Dashboard
      projects={projects}
      title="Pipelines"
    />
  );
}

export default PipelineListPage;
