import { RectType } from '../shared/interfaces';

export function isEventInside(event: MouseEvent, contentBox: RectType, boundingBox?: RectType): boolean {
  const { height, left, top, width } = boundingBox ?? {};
  const {
    height: heightt,
    left: leftt,
    top: topt,
    width: widtht,
  } = contentBox ?? {};
  const { pageX, pageY } = event;

  return (
    (pageX >= left && pageX <= left + width && pageY >= top && pageY <= top + height) ||
    (pageX >= leftt && pageX <= leftt + widtht && pageY >= topt && pageY <= topt + heightt)
  );
}
