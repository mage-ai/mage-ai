export function safeAppendChild(parent, child) {
  if (child.contains(parent)) {
    console.error('HierarchyRequestError: Cannot append a parent element to its descendant.');
  } else {
    parent?.appendChild(child);
  }
}
