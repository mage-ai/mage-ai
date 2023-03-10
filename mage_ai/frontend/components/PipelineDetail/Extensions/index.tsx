import Image from 'next/image';
import { useMemo } from 'react';

import ExtensionOptionType, { ExtensionTypeEnum } from '@interfaces/ExtensionOptionType';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import GreatExpectations from './GreatExpectations';
import Link from '@oracle/elements/Link';
import Panel from '@oracle/components/Panel';
import PanelV2 from '@oracle/components/Panel/v2';
import PipelineType from '@interfaces/PipelineType';
import Spacing from '@oracle/elements/Spacing';
import Spinner from '@oracle/components/Spinner';
import Text from '@oracle/elements/Text';
import api from '@api';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { ChevronRight } from '@oracle/icons';
import { goToWithQuery } from '@utils/routing';
import { queryFromUrl } from '@utils/url';

type ExtensionsProps = {
  pipeline: PipelineType;
};

function Extensions({
  pipeline,
}: ExtensionsProps) {
  const { data } = api.extension_options.list();
  const extensionOptions: ExtensionOptionType[] = useMemo(() => data?.extension_options || [], [data]);
  const {
    extension: selectedExtensionUUID,
  } = queryFromUrl();

  return (
    <>
      <Spacing p={PADDING_UNITS}>
        {!data && !selectedExtensionUUID && <Spinner />}

        {ExtensionTypeEnum.GREAT_EXPECTATIONS === selectedExtensionUUID && pipeline && (
          <GreatExpectations
            pipeline={pipeline}
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
