import * as osPath from 'path';
import { ItemDetailType, ItemType } from '../interfaces';

export function groupFilesByDirectory(items: ItemDetailType[]) {
  const root: ItemDetailType = {} as ItemDetailType;

  const mapping = items.reduce(
    (acc, item) => ({
      ...acc,
      [item.path]: item,
    }),
    {},
  );

  items?.forEach(item => {
    let currentDir: ItemDetailType | ItemType = root;

    const basePath = item?.path;
    mapping[basePath] = item;

    const parts = basePath?.split(osPath.sep);
    parts.forEach((part, index) => {
      if (!part?.length) {
        return;
      }

      const parentDir = parts?.slice(0, index).join(osPath.sep);
      const absolutePath = parts?.slice(0, index + 1).join(osPath.sep);

      const itemInner = mapping?.[absolutePath];

      const sharedProps = {
        name: part,
        path: absolutePath,
        ...itemInner,
      };

      if (parentDir?.length >= 1) {
        sharedProps.parent = parentDir;
      }

      if (index === parts.length - 1) {
        currentDir[part] = {
          ...sharedProps,
          type: 'file',
        };
      } else {
        if (!currentDir[part]) {
          currentDir[part] = {
            ...sharedProps,
            items: {},
            type: 'folder',
          } as ItemDetailType;
        }

        currentDir = (currentDir[part] as unknown as ItemDetailType)?.items;
      }
    });
  });

  return root;
}
