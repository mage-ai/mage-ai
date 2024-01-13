import { KeyValueType } from '@interfaces/CommandCenterType';

export default interface ElementType extends Element {
  offsetLeft: number;
  offsetTop: number;
  style: KeyValueType,
};
