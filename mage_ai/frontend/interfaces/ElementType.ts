import { KeyValueType } from '@interfaces/CommandCenterType';

export interface RefType {
  current: null | ElementType | any;
}

export interface RefMappingType {
  [uuid: string]: RefType;
}

export interface RefArrayMappingType {
  [uuid: string]: RefType[];
}

export default interface ElementType extends Element {
  offsetLeft: number;
  offsetTop: number;
  style: KeyValueType;
}
