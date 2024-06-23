export function findClosestRole(event, roles) {
  const targetElement = event.target as HTMLElement;
  return roles.find(role => targetElement.closest(`[role="${role}"]`));
}
