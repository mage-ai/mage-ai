import { useMemo } from 'react';

import CodeOutput from '@components/CodeBlock/CodeOutput';
import { CodeBlockOutputProps } from './constants';
import {
  buildBorderProps,
  buildConvertBlockMenuItems,
  calculateOffsetPercentage,
  getDownstreamBlockUuids,
  getMessagesWithType,
  getUpstreamBlockUuids,
  hasErrorOrOutput,
} from '@components/CodeBlock/utils';

function CodeBlockOutput({
  block,
  selected,
}: CodeBlockOutputProps) {
  const {
    borderColorShareProps,
    tags,
  } = useMemo(() => buildBorderProps({
    block,
    // dynamic,
    // dynamicUpstreamBlock,
    // hasError,
    // reduceOutput,
    // reduceOutputUpstreamBlock,
    selected,
  }), [
    block,
    // dynamic,
    // dynamicUpstreamBlock,
    // hasError,
    // reduceOutput,
    // reduceOutputUpstreamBlock,
    selected,
  ]);

  return (
    <>
      <CodeOutput
        {...borderColorShareProps}
        // block={block}
        // blockIndex={blockIdx}
        // blockMetadata={blockMetadata}
        // buttonTabs={sparkEnabled ? null : buttonTabs}
        // childrenBelowTabs={childrenBelowTabs}
        // collapsed={outputCollapsed}
        // hasOutput={hasOutput}
        // hideOutput={hideOutput}
        // isInProgress={isInProgress}
        // mainContainerWidth={mainContainerWidth}
        // messages={messagesWithType}
        // messagesAll={messages}
        // onClickSelectBlock={sideBySideEnabled
        //   ? isHidden && setHiddenBlocks
        //     ? () => setHiddenBlocks(prev => ({
        //       ...prev,
        //       [blockUUID]: !isHidden,
        //     }))
        //     : onClickSelectBlock
        //   : null
        // }
        // openSidekickView={openSidekickView}
        // outputRowNormalPadding={sideBySideEnabled || isDataIntegration || sparkEnabled}
        // pipeline={pipeline}
        // ref={blockOutputRef}
        // runCount={runCount}
        // runEndTime={runEndTime}
        // runStartTime={runStartTime}
        // scrollTogether={scrollTogether}
        // selected={selected && (!isHidden || !sideBySideEnabled)}
        // selectedTab={selectedTab}
        // setCollapsed={!sideBySideEnabled
        //   ? (val: boolean) => {
        //     setOutputCollapsed(() => {
        //       set(outputCollapsedUUID, val);
        //       return val;
        //     });
        //   }
        //   : null
        // }
        // setErrors={setErrors}
        // setOutputBlocks={setOutputBlocks}
        // setSelectedOutputBlock={setSelectedOutputBlock}
        // setSelectedTab={setSelectedTab}
        // showBorderTop={sideBySideEnabled}
        // sideBySideEnabled={sideBySideEnabled}
        // sparkEnabled={sparkEnabled}
      />
    </>
  );
}

export default CodeBlockOutput;
