import * as osPath from 'path';

const ctx: Worker = self as any;

function groupFilesByDirectory(paths: string[]) {
  const root: any = {} as any;

  paths.forEach((path) => {
    const parts = path.split(osPath.sep).filter(Boolean);
    let currentDir: any | any = root;
    let parentDir: any | any | undefined = undefined;

    parts.forEach((part, index) => {
      const sharedProps = {
        name: part,
      };

      if (index === parts.length - 1) {
        currentDir[part] = {
          ...sharedProps,
          parent: parentDir as any, // Pointing to the parent directory
          size: 123, // Mock size
          type: 'file',
        };
      } else {
        if (!currentDir[part]) {
          currentDir[part] = {
            ...sharedProps,
            items: {},
            parent: parentDir as any, // Pointing to the parent directory
            type: 'folder',
          } as any;
        }

        const {
          name,
          parent,
          type,
        } = currentDir[part];
        parentDir = {
          name,
          parent,
          type,
        };
        currentDir = (currentDir[part] as any).items;
      }
    });
  });

  return root;
}

ctx.addEventListener('message', (event) => {
  const { data } = event;
  ctx.postMessage(groupFilesByDirectory(data));
});
