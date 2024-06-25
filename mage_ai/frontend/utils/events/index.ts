export function pauseEvent(e) {
  if (e.stopPropagation) {
    e.stopPropagation();
  }
  if (e.preventDefault) {
    e.preventDefault();
  }
  e.cancelBubble = true;
  e.returnValue = false;

  return false;
}

export function newMessageRequestUUID(): string {
  return String(Number(new Date()));
}
