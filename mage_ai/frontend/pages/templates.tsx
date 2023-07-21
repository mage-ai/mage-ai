import Dashboard from '@components/Dashboard';
import BrowseTemplates from '@components/CustomTemplates/BrowseTemplates';

function Templates() {
  return (
    <Dashboard
      title="Templates"
      uuid="Templates/index"
    >
      <BrowseTemplates />
    </Dashboard>
  );
}

export default Templates;
