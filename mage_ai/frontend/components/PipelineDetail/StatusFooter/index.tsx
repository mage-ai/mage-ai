import React from 'react';
import { useMemo } from 'react';

import Divider from '@oracle/elements/Divider';
import FlexContainer from '@oracle/components/FlexContainer';
import KeyboardText from '@oracle/elements/KeyboardText';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import Tooltip from '@oracle/components/Tooltip';
import useKernel from '@utils/models/kernel/useKernel';
import { AlertTriangle, File as FileIcon, HexagonAll, Lightning } from '@oracle/icons';
import {
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
  inline?: boolean;
  pipelineType?: PipelineTypeEnum;
  pipelineContentTouched?: boolean;
  pipelineLastSaved?: number;
  refreshInterval?: number;
  saveStatus?: string;
  width?: number;
};

function StatusFooter({
  inline,
  pipelineType,
  pipelineContentTouched,
  pipelineLastSaved,
  refreshInterval,
  saveStatus,
  width,
}: StatusFooterProps, ref) {
  const { kernel } = useKernel({ pipelineType, refreshInterval });
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
      inline={inline}
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
                    noWrapping
                    small
                  >
                    CPU: <Text
                      danger={cpu >= 90}
                      inline
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
                    noWrapping
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

                  <Text monospace muted noWrapping small>
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
                  Or go to <Text inline monospace>
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
                muted
              size={ICON_SIZE}
              />
            )}

            <Spacing mr={1} />

            <Text monospace muted noWrapping small warning={pipelineContentTouched}>
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
