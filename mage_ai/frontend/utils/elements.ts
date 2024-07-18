import { delay } from './delay';

export function getChildrenDimensions(element: HTMLElement): { width: number; height: number } {
  return {
    width: getChildrenBoundingWidth(element),
    height: getChildrenTotalHeight(element),
  };
}

export function addClassNames(className: string, classNames: string[]): string {
  const arr = (className || '')?.split(' ')?.filter(cn => !classNames?.includes(cn));

  // @ts-ignore
  return (classNames || [])?.concat(arr).join(' ');
}

export function removeClassNames(
  className: string,
  classNames: string[] | ((className: string) => boolean),
): string {
  const arr = (className || '')
    ?.split(' ')
    ?.filter(cn =>
      typeof classNames === 'function' ? !classNames(cn) : !classNames?.includes(cn),
    );

  return (arr || [])?.join(' ');
}

export type BuildSetFunctionProps = (
  uuid: string,
  nodeOrNodes: any | any[],
  opts?: {
    delay?: number;
    tries?: number;
  },
) => void;

export function buildSetFunction(updateFunction) {
  async function setObject(
    uuid: string,
    nodeOrNodes: any | any[],
    opts: {
      delay?: number;
      tries?: number;
    } = {},
  ) {
    const valueIsArray = Array.isArray(nodeOrNodes);
    const nodes = valueIsArray ? nodeOrNodes : [nodeOrNodes];

    const mapping = {};

    await Promise.all(
      nodes?.map(async (node, idx: number) => {
        const tries = opts?.tries || 1;
        let attempt = 0;

        while (attempt < tries) {
          if (node?.current) {
            mapping[idx] = node?.current;
            break;
          } else {
            await delay(opts?.delay || 1000);
          }
          attempt++;
        }
      }),
    );

    const values = Object.values(mapping || {});

    updateFunction(prev => ({
      ...prev,
      [uuid]: valueIsArray ? values : values?.[0],
    }));
  }

  return setObject;
}

export function getClosestRole(
  element: HTMLElement | null,
  roles: string | string[],
): HTMLElement | null {
  const elements = (Array.isArray(roles) ? roles : [roles]).reduce((acc, role) => {
    const el = element?.closest('[role]')?.getAttribute('role')?.split(' ').includes(role)
      ? element.closest('[role]')
      : null;

    return el ? acc.concat(el) : acc;
  }, []);

  return elements?.[0] || null;
}

export function getClosestChildRole(
  element: HTMLElement | null,
  roles: string | string[],
): HTMLElement | null {
  if (!element) return null;

  const roleArray = Array.isArray(roles) ? roles : [roles];

  for (const role of roleArray) {
    const matchingChild = element.querySelector(`[role*="${role}"]`);
    if (matchingChild) {
      return matchingChild as HTMLElement;
    }
  }

  return null;
}

export const isElementVisible = (element: HTMLElement | null): boolean => {
  while (element) {
    if (element === document.body) {
      break;
    }

    const style = window.getComputedStyle(element);

    // Check for display, visibility, and opacity
    if (
      style.display === 'none' ||
      style.visibility === 'hidden' ||
      parseFloat(style.opacity) === 0
    ) {
      return false;
    }

    element = element.parentElement as HTMLElement;
  }

  // Check for dimensions
  const rect = element?.getBoundingClientRect();
  if (rect && (rect.width === 0 || rect.height === 0)) {
    return false;
  }

  return true;
};

const isInViewport = (element: HTMLElement | null): boolean => {
  if (!element) {
    return false;
  }

  const rect = element.getBoundingClientRect();

  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
};

export const isElementReallyVisible = (element: HTMLElement | null): boolean =>
  isElementVisible(element) && isInViewport(element);

function getChildrenTotalHeight(element: HTMLElement): number {
  let totalHeight = 0;

  element.childNodes.forEach(child => {
    if (child instanceof HTMLElement) {
      totalHeight += child.offsetHeight;
    }
  });

  return totalHeight;
}

function getChildrenBoundingWidth(element: HTMLElement): number {
  const children = Array.from(element.children) as HTMLElement[];

  let boundingLeft = Infinity;
  let boundingRight = -Infinity;

  children.forEach(child => {
    const rect = child.getBoundingClientRect();
    if (rect.left < boundingLeft) {
      boundingLeft = rect.left;
    }
    if (rect.right > boundingRight) {
      boundingRight = rect.right;
    }
  });

  return boundingRight - boundingLeft;
}
