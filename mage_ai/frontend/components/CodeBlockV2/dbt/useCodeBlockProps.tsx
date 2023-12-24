import * as osPath from 'path';

import { UseCodeBlockComponentType, UseCodeBlockPropsType } from '../constants';

export default function useCodeBlockProps({
  block,
}: UseCodeBlockPropsType) {
  const {
    configuration,
    uuid,
  } = block;

  const projectPath = configuration?.file_source?.project_path;
  let title = uuid;
  if (projectPath) {
    title = title?.replace(projectPath, '');
    if (title?.startsWith(osPath.sep)) {
      title = title?.slice(1);
    }
  }

  const subtitle = configuration?.file_path || configuration?.file_source?.path;

  return {
    header: {
      subtitle,
      title,
    },
  };
}
