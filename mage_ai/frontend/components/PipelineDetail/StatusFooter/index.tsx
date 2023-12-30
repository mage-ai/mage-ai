import React from 'react';
import moment from 'moment';
import { useMemo } from 'react';

import Divider from '@oracle/elements/Divider';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import KernelType from '@interfaces/KernelType';
import KeyboardText from '@oracle/elements/KeyboardText';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import Tooltip from '@oracle/components/Tooltip';
import useKernel from '@utils/models/kernel/useKernel';
import { AlertTriangle, File as FileIcon, HexagonAll, Lightning } from '@oracle/icons';
import {
  KEY_CODE_ENTER,
  KEY_CODE_META,
  KEY_SYMBOL_CONTROL,
  KEY_SYMBOL_META,
  KEY_SYMBOL_S,
} from '@utils/hooks/keyboardShortcuts/constants';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { PipelineTypeEnum } from '@interfaces/PipelineType';
import { StatusFooterStyle } from './index.style';
import { isMac } from '@utils/os';
import { roundNumber } from '@utils/string';

const ICON_SIZE = UNIT * 1.25;

type StatusFooterProps = {
  pipeline: PipelineTypeEnum;
  pipelineContentTouched?: boolean;
  pipelineLastSaved?: number;
  saveStatus?: string;
  width?: number;
};

function StatusFooter({
  pipeline,
  pipelineContentTouched,
  pipelineLastSaved,
  saveStatus,
  width,
}: StatusFooterProps, ref) {
  const { kernel } = useKernel({ pipelineType: pipeline?.type });
  const {
    alive,
    usage,
  } = kernel || {};

  const kernelMemory = useMemo(() => {
    if (usage?.kernel_memory) {
      const memory = usage.kernel_memory;
      const k = 1024;
      const dm = 2;
      const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

      const i = Math.floor(Math.log(memory) / Math.log(k));

      return `${parseFloat((memory / Math.pow(k, i)).toFixed(dm))}${sizes[i]}`;
    }

    return null;
  }, [usage?.kernel_memory]);

  const cpu = useMemo(() => typeof usage?.kernel_cpu !== 'undefined'
    ? roundNumber(usage?.kernel_cpu, 3)
    : null
    ,
  [
    usage,
  ]);

  return (
    <StatusFooterStyle
      ref={ref}
      width={width}
    >
      <Divider light />

      <Spacing px={PADDING_UNITS} py={1}>

      <FlexContainer alignItems="center" justifyContent="space-between">
        {usage && (
          <>
            <FlexContainer alignItems="center">
              {cpu !== null && (
                <>
                  <Lightning
                    muted
                    size={ICON_SIZE}
                  />

                  <Spacing mr={1} />

                  <Text
                    monospace
                    muted
                    small
                  >
                    CPU: <Text
                      inline
                      danger={cpu >= 90}
                      muted={cpu < 50}
                      small
                      warning={cpu >= 50 && cpu < 90}
                    >
                      {cpu}%
                    </Text>
                  </Text>
                </>
              )}

              {cpu !== null && kernelMemory !== null && (
                <Spacing mx={PADDING_UNITS}>
                  <Spacing mr={1} />

                  <Text
                    monospace
                    muted
                    small
                  >
                    /
                  </Text>
                </Spacing>
              )}

              {kernelMemory !== null && (
                <>
                  <HexagonAll
                    muted
                    size={ICON_SIZE}
                  />

                  <Spacing mr={1} />

                  <Text monospace muted small>
                    Memory: {kernelMemory}
                  </Text>
                </>
              )}

              <Spacing mx={PADDING_UNITS} />
            </FlexContainer>
          </>
        )}

        <Tooltip
          appearAbove
          appearBefore
          block
          description={
            <>
              <FlexContainer alignItems="center">
                <Text default inline>Press</Text>&nbsp;<KeyboardText
                  inline
                  keyText={isMac() ? KEY_SYMBOL_META : KEY_SYMBOL_CONTROL}
                />&nbsp;<Text default inline>+</Text>&nbsp;<KeyboardText
                  inline
                  keyText={KEY_SYMBOL_S}
                />&nbsp;<Text default inline>to save changes.</Text>
                <br />
              </FlexContainer>

              <Spacing mt={1}>
                <Text default>
                  Or, go to <Text inline monospace>
                    File
                  </Text>{' › '}<Text inline monospace>
                    Save pipeline
                  </Text>.
                </Text>
              </Spacing>
            </>
          }
          size={null}
          widthFitContent
        >
          <FlexContainer alignItems="center">
            {pipelineContentTouched && (
              <AlertTriangle
                size={ICON_SIZE}
                warning
              />
            )}
            {!pipelineContentTouched && (
              <FileIcon
                size={ICON_SIZE}
                muted
              />
            )}

            <Spacing mr={1} />

            <Text monospace muted small warning={pipelineContentTouched}>
              {saveStatus}
            </Text>
          </FlexContainer>
        </Tooltip>
      </FlexContainer>
      </Spacing>
    </StatusFooterStyle>
  );
}

export default React.forwardRef(StatusFooter);
