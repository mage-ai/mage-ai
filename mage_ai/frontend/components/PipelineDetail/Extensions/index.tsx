import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';

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

export type ExtensionsProps = {} & ExtensionProps;

function Extensions({
  pipeline,
  ...props
}: ExtensionsProps) {
  const router = useRouter();

  const { data } = api.extension_options.list();
  const extensionOptions: ExtensionOptionType[] = useMemo(() => data?.extension_options || [], [data]);
  const extensionOptionsByUUID = useMemo(() => indexBy(extensionOptions, ({ uuid }) => uuid), [
    extensionOptions,
  ]);
  const [selectedExtensionUUID, setSelectedExtensionUUID] = useState<string>(null);
  const extensionOption = useMemo(() => extensionOptionsByUUID[selectedExtensionUUID], [
    extensionOptionsByUUID,
    selectedExtensionUUID,
  ]);

  const sharedProps = useMemo(() => ({
    ...props,
    pipeline,
  }), [
    pipeline,
    props,
  ]);

  useEffect(() => {
    setSelectedExtensionUUID(queryFromUrl()?.extension);
  }, [router.asPath]);

  return (
    <>
      <Spacing p={PADDING_UNITS}>
        {!selectedExtensionUUID && (
          <Spacing mb={PADDING_UNITS}>
            <Text default>
              Power up your pipelines with these extensions.
              Click on a power up below to configure it for <Text inline monospace>
                {pipeline?.uuid}
              </Text>.
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
                  <PanelV2 fullWidth={false}>
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
