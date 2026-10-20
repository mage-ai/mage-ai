export function getScrollbarWidth() {
  if (typeof window === 'undefined') {
    return 0;
  }

  // Create a temporary div container and append it into the body
  const container = document.createElement('div');
  // Append the element
  document.body.appendChild(container);

  // Force scrollbar on the container element
  container.style.overflow = 'scroll';
  container.style.position = 'absolute';
  container.style.top = '-9999px';
  container.style.width = '100px';
  container.style.height = '100px';

  // Add inner div
  const inner = document.createElement('div');
  // Force scrollbar on inner div
  inner.style.width = '100%';
  container.appendChild(inner);

  // Calculate the width based on the difference in offsetWidth
  const scrollbarWidth = container.offsetWidth - inner.offsetWidth;

  // Remove the temporary div containers
  document.body.removeChild(container);

  return scrollbarWidth;
}
