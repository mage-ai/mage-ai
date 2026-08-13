import { DataTypeEnum } from '@interfaces/KernelOutputType';

export const IMAGE_OUTPUT_DATA_TYPES: DataTypeEnum[] = [
  DataTypeEnum.IMAGE_PNG,
  DataTypeEnum.IMAGE_JPEG,
  DataTypeEnum.IMAGE_GIF,
  DataTypeEnum.IMAGE_WEBP,
];

export function isImageOutputDataType(t: DataTypeEnum): boolean {
  return IMAGE_OUTPUT_DATA_TYPES.includes(t);
}

export function imageMimeTypeForDataType(t: DataTypeEnum): string {
  if (t === DataTypeEnum.IMAGE_JPEG) {
    return 'image/jpeg';
  }
  if (t === DataTypeEnum.IMAGE_GIF) {
    return 'image/gif';
  }
  if (t === DataTypeEnum.IMAGE_WEBP) {
    return 'image/webp';
  }
  return 'image/png';
}
