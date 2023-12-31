import { useEffect, useRef, useState } from 'react';

import CodeEditor from '@components/CodeEditor';
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
  executeAction,
  focusedItemIndex,
  invokeRequest,
  item,
  itemsRef,
  refError,
  removeApplication,
}: ApplicationProps) {
  const refUUID = useRef(null);

  const application = item?.application;
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

          <SetupSectionRow title="Full path">
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
  }

  return (
    <>
    </>
  );
}

export default ApplicationItemDetail;
