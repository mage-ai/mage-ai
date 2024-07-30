import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

import DBT from './DBT';
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

  const extensionDetailEl = useMemo(() => {
    if (!pipeline) {
      return null;
    }

    let ExtensionComponent;
    if (ExtensionTypeEnum.GREAT_EXPECTATIONS === selectedExtensionUUID) {
      ExtensionComponent = GreatExpectations;
    } else if (ExtensionTypeEnum.DBT === selectedExtensionUUID) {
      ExtensionComponent = DBT;
    }

    if (ExtensionComponent) {
      return (
        <ExtensionComponent
          {...sharedProps}
          extensionOption={extensionOption}
        />
      );
    }
  }, [
    extensionOption,
    pipeline,
    selectedExtensionUUID,
    sharedProps,
  ]);

  return (
    <DndProvider backend={HTML5Backend}>
      <Spacing p={PADDING_UNITS}>
        {!selectedExtensionUUID && (
          <Spacing mb={PADDING_UNITS}>
            <Text default>
              Power up your pipeline with extensions.
              Learn more about <Link
                href="https://docs.mage.ai/design/blocks/extension"
                openNewWindow
              >
                extension blocks
              </Link>.
            </Text>

            <Spacing mt={1}>
              <Text default>
                Click on a power up below to add and configure it for the <Text inline monospace>
                  {pipeline?.uuid}
                </Text> pipeline.
              </Text>
            </Spacing>
          </Spacing>
        )}
        {!data && !selectedExtensionUUID && <Spinner />}

        {extensionDetailEl}

        {!selectedExtensionUUID && extensionOptions?.map(({
          description,
          name,
          uuid,
        }, idx: number) => (
          <Spacing key={uuid} mt={idx >= 1 ? PADDING_UNITS : 0}>
            <Link
              block
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
                          <img
                            alt={name}
                            height={UNIT * 3}
                            src={`${router?.basePath}/images/extensions/${uuid}/logo.png`}
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
          </Spacing>
        ))}
      </Spacing>
    </DndProvider>
  );
}

export default Extensions;
