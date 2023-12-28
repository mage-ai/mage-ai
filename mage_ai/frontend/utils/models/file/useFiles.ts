import { useMemo } from 'react';

import FileType from '@interfaces/FileType';
import api from '@api';

function useFiles({
  excludeDirPattern,
  excludePattern,
  pattern,
}: {
  excludeDirPattern?: string;
  excludePattern?: string;
  pattern?: string;
} = {}): {
  fetch: () => void;
  files: FileType[];
} {
  const { data, mutate } = api.files.list();
  const files: FileType[] = useMemo(() => data?.files || [], [data]);

  return {
    fetch: mutate,
    files,
  };
}

export default useFiles;
