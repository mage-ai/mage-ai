import React, { useContext } from 'react';

import ProjectContextType from '@interfaces/ProjectType';

const ProjectContext = React.createContext<ProjectContextType>({
  latest_version: null,
  name: null,
  require_user_authentication: null,
  version: null,
});

export const useProjectContext = () => useContext(ProjectContext);

export default ProjectContext;
