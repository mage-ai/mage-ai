import Image from 'next/image';
import { useMemo } from 'react';

import ExtensionOptionType, { ExtensionTypeEnum } from '@interfaces/ExtensionOptionType';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import GreatExpectations from './GreatExpectations';
import Link from '@oracle/elements/Link';
import Panel from '@oracle/components/Panel';
import PanelV2 from '@oracle/components/Panel/v2';
import Spacing from '@oracle/elements/Spacing';
import Spinner from '@oracle/components/Spinner';
import Text from '@oracle/elements/Text';
import api from '@api';
import { ChevronRight } from '@oracle/icons';
import { ExtensionProps } from './constants';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { goToWithQuery } from '@utils/routing';
import { indexBy } from '@utils/array';
import { queryFromUrl } from '@utils/url';

function Extensions({
  addNewBlockAtIndex,
  pipeline,
}: ExtensionProps) {
  const { data } = api.extension_options.list();
  const extensionOptions: ExtensionOptionType[] = useMemo(() => data?.extension_options || [], [data]);
  const extensionOptionsByUUID = useMemo(() => indexBy(extensionOptions, ({ uuid }) => uuid), [
    extensionOptions,
  ]);
  const { extension: selectedExtensionUUID } = queryFromUrl();
  const extensionOption = useMemo(() => extensionOptionsByUUID[selectedExtensionUUID], [
    extensionOptionsByUUID,
    selectedExtensionUUID,
  ]);

  const sharedProps = useMemo(() => ({
    addNewBlockAtIndex,
    pipeline,
  }), [
    addNewBlockAtIndex,
    pipeline,
  ]);

  return (
    <>
      <Spacing p={PADDING_UNITS}>
        {!selectedExtensionUUID && (
          <Spacing mb={PADDING_UNITS}>
            <Text default>
              Select a power up to configure it for the current pipeline.
            </Text>
          </Spacing>
        )}
        {!data && !selectedExtensionUUID && <Spinner />}

        {ExtensionTypeEnum.GREAT_EXPECTATIONS === selectedExtensionUUID && pipeline && (
          <GreatExpectations
            {...sharedProps}
            extensionOption={extensionOption}
          />
        )}

        {!selectedExtensionUUID && extensionOptions?.map(({
          description,
          name,
          uuid,
        }) => (
          <Link
            block
            key={uuid}
            noHoverUnderline
            onClick={() => goToWithQuery({
              extension: uuid,
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
                  <PanelV2
                    borderless
                    fullHeight={false}
                    fullWidth={false}
                  >
                    <Spacing p={PADDING_UNITS}>
                      <FlexContainer alignItems="center">
                        <Image
                          alt={name}
                          height={UNIT * 3}
                          src={`/images/extensions/${uuid}/logo.png`}
                          width={UNIT * 3}
                        />
                      </FlexContainer>
                    </Spacing>
                  </PanelV2>

                  <Spacing mr={PADDING_UNITS} />

                  <Flex flexDirection="column">
                    <Text bold>
                      {name}
                    </Text>
                    <Text default small>
                      {description}
                    </Text>
                  </Flex>
                </Flex>
                <ChevronRight />
              </FlexContainer>
            </Panel>
          </Link>
        ))}
      </Spacing>
    </>
  );
}

export default Extensions;
