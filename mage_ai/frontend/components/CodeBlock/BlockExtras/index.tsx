import { ThemeContext } from 'styled-components';
import { useContext, useMemo } from 'react';

import BlockType from '@interfaces/BlockType';
import FlexContainer from '@oracle/components/FlexContainer';
import Button from '@oracle/elements/Button';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import { ViewKeyEnum } from '@components/Sidekick/constants';
import { getColorsForBlockType } from '@components/CodeBlock/index.style';
import { indexBy } from '@utils/array';

type BlockExtrasProps = {
  block: BlockType;
  blocks: BlockType[];
  openSidekickView?: (newView: ViewKeyEnum, pushHistory?: boolean, opts?: {
    blockUUID: string;
  }) => void;
};

function BlockExtras({
  block,
  blocks,
  openSidekickView,
}: BlockExtrasProps) {
  const themeContext = useContext(ThemeContext);

  const blocksByUUID = useMemo(() => indexBy(blocks, ({ uuid }) => uuid), [blocks]);
  const callbackBlocks = useMemo(() => block?.callback_blocks?.reduce((acc, uuid) => {
    const b = blocksByUUID?.[uuid];
    if (b) {
      return acc.concat(b);
    }

    return acc;
  }, []), [
    block,
    blocksByUUID,
  ]);

  return (
    <>
      {callbackBlocks?.length >= 1 && (
        <>
          <Spacing px={1}>
            <Text bold muted>
              Callbacks
            </Text>
          </Spacing>
          <FlexContainer alignItems="center">
            {callbackBlocks?.map(({
              color: colorInit,
              type,
              uuid,
            }) => {
              const color = getColorsForBlockType(
                type,
                {
                  blockColor: colorInit,
                  theme: themeContext,
                },
              ).accentLight;

              return (
                <Spacing key={uuid} ml={1} mt={1}>
                  <Button
                    backgroundColor={color}
                    compact
                    onClick={() => {
                      openSidekickView(ViewKeyEnum.CALLBACKS, true, {
                        blockUUID: uuid,
                      });
                    }}
                    small
                  >
                    <Text monospace small>
                      {uuid}
                    </Text>
                  </Button>
                </Spacing>
              );
            })}
          </FlexContainer>
        </>
      )}
    </>
  );
}

export default BlockExtras;
