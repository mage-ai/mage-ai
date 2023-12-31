import { useEffect, useRef, useState } from 'react';

import CodeEditor from '@components/CodeEditor';
import FlexContainer from '@oracle/components/FlexContainer';
import Link from '@oracle/elements/Link';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import { ApplicationProps } from '../ItemApplication/constants';
import {
  DATE_FORMAT_FULL,
  TIME_FORMAT_NO_SEC,
  dateFromFromUnixTimestamp,
  momentInLocalTimezone,
} from '@utils/date';
import { FILE_EXTENSION_TO_LANGUAGE_MAPPING } from '@interfaces/FileType';
import { ObjectTypeEnum } from '@interfaces/CommandCenterType';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { SetupSectionRow } from '@components/shared/SetupSection';
import { pluralize } from '@utils/string';
import { shouldDisplayLocalTimezone } from '@components/settings/workspace/utils';

function ApplicationItemDetail({
  applicationsRef,
  executeAction,
  focusedItemIndex,
  invokeRequest,
  item,
  itemsRef,
  refError,
  removeApplication,
  router,
}: ApplicationProps) {
  const refUUID = useRef(null);

  const application = item?.applications?.[applicationsRef?.current?.length - 1];
  const action = application?.action;

  const [modelState, setModel] = useState(null);
  const model = refUUID?.current === item?.uuid ? modelState : null;

  useEffect(() => {
    invokeRequest({
      action,
      focusedItemIndex,
      item,
    }).then(() => {
      const itemRef = itemsRef?.current?.[focusedItemIndex];
      refUUID.current = item?.uuid;
      setModel(itemRef?.actionResults?.[action?.uuid]?.[action?.request?.response_resource_key]);
    });
  }, [action, focusedItemIndex, invokeRequest, item]);

  if (ObjectTypeEnum.FILE === item?.object_type) {
    const {
      extension,
      modified_timestamp: modifiedTimestamp,
      size,
    } = item?.metadata?.file || {
      extension: null,
      modified_timestamp: null,
      size: null,
    };

    const language = FILE_EXTENSION_TO_LANGUAGE_MAPPING[item?.metadata?.file?.extension];

    const editor = (
      <CodeEditor
        autoHeight
        language={language}
        padding={UNIT * 2}
        readOnly
        value={model?.content}
      />
    );

    const displayLocalTimezone = shouldDisplayLocalTimezone();
    const dt = momentInLocalTimezone(
      dateFromFromUnixTimestamp(modifiedTimestamp),
      displayLocalTimezone,
    );

    return (
      <>
        <Spacing p={PADDING_UNITS}>
          <SetupSectionRow title="Filename">
            <Text monospace rightAligned>
              {model?.name}
            </Text>
          </SetupSectionRow>

          <SetupSectionRow title="File path">
            <div style={{ maxWidth: '70%' }}>
              <Text monospace rightAligned>
                {model?.path}
              </Text>
            </div>
          </SetupSectionRow>

          <SetupSectionRow title="Language">
            <Text monospace rightAligned>
              {language}
            </Text>
          </SetupSectionRow>

          <SetupSectionRow title="Size">
            <Text monospace rightAligned>
              {pluralize('byte', size, true)}
            </Text>
          </SetupSectionRow>

          <SetupSectionRow title="Modified">
            <Text monospace rightAligned>
              {dt?.format(DATE_FORMAT_FULL)} at {dt?.format(TIME_FORMAT_NO_SEC)}
            </Text>
          </SetupSectionRow>
        </Spacing>

        {editor}
      </>
    );
  } else if (ObjectTypeEnum.BLOCK === item?.object_type) {
    const {
      name,
      file_path: filePath,
      pipelines,
      uuid: blockUUID,
    } = item?.metadata?.block || {
      file_path: null,
      name: null,
      pipelines: null,
      uuid: null,
    };

    const editor = (
      <CodeEditor
        autoHeight
        language={model?.language}
        padding={UNIT * 2}
        readOnly
        value={model?.content}
      />
    );

    const pipelinesCount = pipelines?.length || 0;

    const pipelineUUIDs = [];
    pipelines?.forEach(({
      uuid
    }, idx) => {
      pipelineUUIDs.push(
        <Link
          block
          key={`${uuid}-${idx}-link`}
          preventDefault
          href="#"
          monospace
          onClick={(e) => {
            e.preventDefault();
            router.push(`/pipelines/${uuid}/edit`, null, {
              shallow: true,
            });
          }}
          style={{
            marginLeft: 12,
          }}
        >
          {uuid}
        </Link>
      );
    });

    return (
      <>
        <Spacing p={PADDING_UNITS}>
          <SetupSectionRow title="Name">
            <Text monospace rightAligned>
              {model?.name || name || blockUUID}
            </Text>
          </SetupSectionRow>

          <SetupSectionRow title="File path">
            <div style={{ maxWidth: '70%' }}>
              <Text monospace rightAligned>
                {model?.configuration?.file_source?.path
                  || model?.configuration?.file_path
                  || filePath
                }
              </Text>
            </div>
          </SetupSectionRow>

          <SetupSectionRow title="Language">
            <Text monospace rightAligned>
              {model?.language}
            </Text>
          </SetupSectionRow>

          <SetupSectionRow title="Pipelines">
            <FlexContainer
              flexWrap="wrap"
              justifyContent="flex-end"
              style={{ maxWidth: '70%' }}
            >
              {pipelineUUIDs}
            </FlexContainer>
          </SetupSectionRow>
        </Spacing>

        {editor}
      </>
    );
  }

  return (
    <>
    </>
  );
}

export default ApplicationItemDetail;
