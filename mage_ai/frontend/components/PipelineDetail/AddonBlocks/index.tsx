import React, { useEffect, useMemo, useState } from 'react';
import { ExtensionProps } from '../Extensions/constants';
import Spacing from '@oracle/elements/Spacing';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import Text from '@oracle/elements/Text';
import Link from '@oracle/elements/Link';
import { goToWithQuery } from '@utils/routing';
import Panel from '@oracle/components/Panel';
import PanelV2 from '@oracle/components/Panel/v2';
import FlexContainer from '@oracle/components/FlexContainer';
import Flex from '@oracle/components/Flex';
import { Callback, ChevronRight, Conditional } from '@oracle/icons';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { AddonBlockTypeEnum } from '@interfaces/AddonBlockOptionType';
import Callbacks from '../Callbacks';
import { queryFromUrl } from '@utils/url';
import { useRouter } from 'next/router';
import Conditionals from '../Conditionals';
import { BlockTypeEnum } from '@interfaces/BlockType';
import AddonBlock from './AddonBlock';

export type AddonBlocksProps = {} & ExtensionProps;

const ADDON_BLOCK_OPTIONS = [
  {
    name: 'Callbacks',
    uuid: AddonBlockTypeEnum.CALLBACK,
    Icon: Callback,
  },
  {
    name: 'Conditionals',
    uuid: AddonBlockTypeEnum.CONDITIONAL,
    Icon: Conditional,
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
        addOnBlocks: props.pipeline?.callbacks,
        addOnBlockType: BlockTypeEnum.CALLBACK,
        displayBlockName: 'callback',
      };
    }
    else if (AddonBlockTypeEnum.CONDITIONAL === selectedAddonUUID) {
      addOnProps = {
        addOnBlocks: props.pipeline?.conditionals,
        addOnBlockType: BlockTypeEnum.CONDITIONAL,
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
