/**
 * Utility function to generate unique number per component instance
 */
export const generateKey = (() => {
  const count = 0;

  return () => `${count}`;

  // return () => `${++count}`;
})();

/**
 * Check whether the argument is a stateless component.
 *
 * We take advantage of the stateless nature of functional components to be
 * inline the rendering of the modal component as part of another immutable
 * component.
 *
 * This is necessary for allowing the modal to update based on the inputs passed
 * as the second argument to useModal without unmounting the previous version of
 * the modal component.
 */
export const isFunctionalComponent = (Component: Function) => {
  const prototype = Component.prototype;

  return !prototype || !prototype.isReactComponent;
};


/* * * * * * * * * * *
 * Element utilities *
 * * * * * * * * * * */

enum EventElementType {
  INPUT = 'input',
  INTERACTIVE = 'interactive',
}

const isEventElementType = (event, elementType): boolean => {
  if (event.target instanceof Element) {
    const tagName = (event.target as Element).tagName.toLowerCase();
    if (elementType === EventElementType.INPUT) {
      return ['input', 'textarea'].includes(tagName);
    } else if (elementType === EventElementType.INTERACTIVE) {
      return ['a', 'button', 'input', 'select', 'textarea'].includes(tagName);
    }
  }

  return false;
};

/** Determine whether the event target is an input element */
export const isInputElement = (event): boolean => isEventElementType(event, EventElementType.INPUT);

/** Determine whether the event target is an interactive element */
export const isInteractiveElement = (event): boolean => isEventElementType(event, EventElementType.INTERACTIVE);

/** Remove keyboard focus from the currently focused element  */
export const removeKeyboardFocus = () => {
  (document.activeElement as HTMLElement).blur();
};
