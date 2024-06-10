import * as osPath from 'path';

const ctx: Worker = self as any;

function groupFilesByDirectory(items: {
  extension?: string;
  items?: any;
  modified_timestamp?: number;
  name: string;
  parent?: any;
  path?: string
  relative_path?: string;
  size: number;
  type: string;
}[]) {
  const root: any = {} as any;

  items?.forEach((item) => {
    const parts = item?.path.split(osPath.sep).filter(Boolean);
    let currentDir: any | any = root;
    let parentDir: any | any | undefined = undefined;

    parts.forEach((part, index) => {
      const sharedProps = {
        ...item,
        name: part,
      };

      if (index === parts.length - 1) {
        currentDir[part] = {
          ...sharedProps,
          parent: parentDir as any, // Pointing to the parent directory
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
          extension: extensionParent,
          modified_timestamp: modified_timestampParent,
          name: nameParent,
          parent: parentParent,
          path: pathParent,
          relative_path: relative_pathParent,
          size: sizeParent,
          type: typeParent,
        } = currentDir[part];
        parentDir = {
          extension: extensionParent,
          modified_timestamp: modified_timestampParent,
          name: nameParent,
          parent: parentParent,
          path: pathParent,
          relative_path: relative_pathParent,
          size: sizeParent,
          type: typeParent,
        };
        currentDir = (currentDir[part] as any).items;
      }
    });
  });

  return root;
}

ctx.addEventListener('message', event => {
  const {
    data: { filePaths, groupByStrategy },
  } = event;
  const groupBy = 'directory' === groupByStrategy ? groupFilesByDirectory : () => ({});
  ctx.postMessage(groupBy(filePaths));
});
