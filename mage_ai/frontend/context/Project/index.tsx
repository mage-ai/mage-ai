import React, { useContext } from 'react';

import ProjectType from '@interfaces/ProjectType';

const ProjectContext = React.createContext<ProjectType>({
  latest_version: null,
  name: null,
  version: null,
});

export const useProjectContext = () => useContext(ProjectContext);

export default ProjectContext;
