import { useMemo } from 'react';

import CodeBlockHeader from './Header';
import useDBT from './dbt/useCodeBlockProps';
import { BlockTypeEnum } from '@interfaces/BlockType';
import { UseCodeBlockComponentProps, UseCodeBlockComponentType } from './constants';

export default function useCodeBlockComponents({
  ...props
}: UseCodeBlockComponentProps): UseCodeBlockComponentType {
  const {
    block,
    executionState,
    interruptKernel,
    runBlockAndTrack,
    selected,
    status,
    theme,
  } = props;
  const {
    type,
  } = block || {
    type: null,
  };

  const header = useMemo(() => {
    if (BlockTypeEnum.DBT === type) {
      const codeBlockProps = useDBT(props);

      return (
        <CodeBlockHeader
          block={block}
          executionState={executionState}
          interruptKernel={interruptKernel}
          runBlockAndTrack={runBlockAndTrack}
          selected={selected}
          status={status}
          theme={theme}
          {...codeBlockProps?.header}
        />
      );
    }
  }, [
    executionState,
    selected,
  ]);


  return {
    editor: null,
    extraDetails: null,
    footer: null,
    header,
    headerTabs: null,
    output: null,
    outputTabs: null,
    tags: null,
  };
}
