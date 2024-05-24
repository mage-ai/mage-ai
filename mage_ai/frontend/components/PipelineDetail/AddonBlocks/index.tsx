import React, { useEffect, useMemo, useState } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useRouter } from 'next/router';

import AddonBlock from './AddonBlock';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Link from '@oracle/elements/Link';
import Panel from '@oracle/components/Panel';
import PanelV2 from '@oracle/components/Panel/v2';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import { AddonBlockTypeEnum } from '@interfaces/AddonBlockOptionType';
import { BlockTypeEnum } from '@interfaces/BlockType';
import { Callback, ChevronRight, Conditional } from '@oracle/icons';
import { ExtensionProps } from '../Extensions/constants';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { goToWithQuery } from '@utils/routing';
import { queryFromUrl } from '@utils/url';

export type AddonBlocksProps = {} & ExtensionProps;

const ADDON_BLOCK_OPTIONS = [
  {
    Icon: Callback,
    name: 'Callbacks',
    uuid: AddonBlockTypeEnum.CALLBACK,
  },
  {
    Icon: Conditional,
    name: 'Conditionals',
    uuid: AddonBlockTypeEnum.CONDITIONAL,
  },
];

function AddonBlocks({
  ...props
}: AddonBlocksProps) {
  const router = useRouter();
  const [selectedAddonUUID, setSelectedAddonUUID] = useState<string>(null);

  useEffect(() => {
    setSelectedAddonUUID(queryFromUrl()?.addon);
  }, [router.asPath]);

  const addonDetailEl = useMemo(() => {
    let addOnProps;
    if (AddonBlockTypeEnum.CALLBACK === selectedAddonUUID) {
      addOnProps = {
        addOnBlockType: BlockTypeEnum.CALLBACK,
        addOnBlocks: props.pipeline?.callbacks,
        description: 'Run 1 or more callback blocks whenever the main block succeeds or fails.',
        displayBlockName: 'callback',
      };
    }
    else if (AddonBlockTypeEnum.CONDITIONAL === selectedAddonUUID) {
      addOnProps = {
        addOnBlockType: BlockTypeEnum.CONDITIONAL,
        addOnBlocks: props.pipeline?.conditionals,
        description: 'Run 1 or more conditional blocks to determine whether or not the main block should be run.',
        displayBlockName: 'conditional',
      };
    }

    if (addOnProps) {
      return (
        <AddonBlock
          {...addOnProps}
          {...props}
        />
      );
    }
  }, [
    props,
    selectedAddonUUID,
  ]);

  return (
    <DndProvider backend={HTML5Backend}>
      <Spacing p={PADDING_UNITS}>
        {addonDetailEl}

        {!selectedAddonUUID && ADDON_BLOCK_OPTIONS?.map(({
          name,
          uuid,
          Icon,
        }, idx: number) => (
          <Spacing key={uuid} mt={idx >= 1 ? PADDING_UNITS : 0}>
            <Link
              block
              noHoverUnderline
              onClick={() => goToWithQuery({
                addon: uuid,
              }, {
                pushHistory: true,
              })}
              preventDefault
            >
              <Panel dark>
                <FlexContainer
                  alignItems="center"
                  justifyContent="space-between"
                >
                  <Flex alignItems="center">
                    <PanelV2 fullWidth={false}>
                      <Spacing p={PADDING_UNITS}>
                        <FlexContainer alignItems="center">
                          <Icon fill="#885EFF" size={UNIT * 2} />
                        </FlexContainer>
                      </Spacing>
                    </PanelV2>

                    <Spacing mr={PADDING_UNITS} />

                    <Flex flexDirection="column">
                      <Text bold>
                        {name}
                      </Text>
                    </Flex>
                  </Flex>
                  <ChevronRight />
                </FlexContainer>
              </Panel>
            </Link>
          </Spacing>
        ))}
      </Spacing>
    </DndProvider>
  );
}

export default AddonBlocks;
