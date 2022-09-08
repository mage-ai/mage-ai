import React, { useState } from 'react';
import { toast } from 'react-toastify';

import Col from '@components/shared/Grid/Col';
import KeyboardShortcutButton from '@oracle/elements/Button/KeyboardShortcutButton';
import Row from '@components/shared/Grid/Row';
import Text from '@oracle/elements/Text';
import { CellStyle } from './index.style';
import { Copy, Trash } from '@oracle/icons';
import { DARK_CONTENT_BACKGROUND } from '@oracle/styles/colors/content';
import { LIME_DARK } from '@oracle/styles/colors/main';
import { UNIT } from '@oracle/styles/units/spacing';
import { VariableType } from '@interfaces/PipelineVariableType';

type VariableRowProps = {
  copyText?: string;
  deleteVariable?: () => void;
  variable: VariableType;
}

function VariableRow({
  copyText: copyTextProp,
  deleteVariable,
  variable,
}: VariableRowProps) {
  const [showDelete, setShowDelete] = useState<boolean>(false);

  const {
    uuid,
    type,
    value,
  } = variable;

  const copyText = copyTextProp || `kwargs['${uuid}']`;

  return (
    <div
      onMouseEnter={() => setShowDelete(true)}
      onMouseLeave={() => setShowDelete(false)}
    >
      <Row>
        <Col md={1} hiddenSmDown>
          <CellStyle noPadding>
            <KeyboardShortcutButton
              backgroundColor={DARK_CONTENT_BACKGROUND}
              borderless
              centerText
              muted
              onClick={() => {
                navigator.clipboard.writeText(copyText);
                toast.success(
                  'Successfully copied to clipboard.',
                  {
                    position: toast.POSITION.BOTTOM_RIGHT,
                    toastId: uuid,
                  },
                );
              }}
              uuid={`Sidekick/GlobalVariables/${uuid}`}
              withIcon
            >
              <Copy size={2.5 * UNIT} />
            </KeyboardShortcutButton>
          </CellStyle>
        </Col>
        <Col md={5}>
          <CellStyle>
            <Text color={LIME_DARK} monospace small textOverflow>
              {uuid}
            </Text>
            {deleteVariable && showDelete && (
              <KeyboardShortcutButton
                backgroundColor={DARK_CONTENT_BACKGROUND}
                borderless
                inline
                muted
                onClick={deleteVariable}
                uuid={`Sidekick/GlobalVariables/delete_${uuid}`}
                withIcon
              >
                <Trash size={2.5 * UNIT} />
              </KeyboardShortcutButton>
            )}
          </CellStyle>
        </Col>
        <Col md={6}>
          <CellStyle>
            <Text monospace small>
              {value}
            </Text>
          </CellStyle>
        </Col>
        {/* <Col md={2} hiddenSmDown>
          <CellStyle>
            <Text color={DARK_CONTENT_MUTED} monospace textOverflow>
              {type}
            </Text>
          </CellStyle>
        </Col> */}
      </Row>
    </div>
  );
}

export default VariableRow;
