import { KeyValueType } from '@interfaces/CommandCenterType';

export interface RefType {
  current: null | ElementType;
}

export default interface ElementType extends Element {
  offsetLeft: number;
  offsetTop: number;
  style: KeyValueType,
}
