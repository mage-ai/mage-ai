import BlockType from '@interfaces/BlockType';

export default function useCodeBlockComponents({
  block,
}: {
  block: BlockType;
}): {
  header: any;
  tabs: any;
} {
  return {
    header: null,
    tabs: null,
  };
}
