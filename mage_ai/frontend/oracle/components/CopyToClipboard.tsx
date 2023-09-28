import React from 'react';
import { CopyToClipboard as CopyClipboard } from 'react-copy-to-clipboard';
import { toast } from 'react-toastify';

import FlexContainer from '@oracle/components/FlexContainer';
import Link, { LinkProps } from '@oracle/elements/Link';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import Tooltip from '@oracle/components/Tooltip';
import { Copy } from '@oracle/icons';
import { UNIT } from '@oracle/styles/units/spacing';

export enum IconPositionEnum {
  LEFT = 'left',
  RIGHT = 'right',
}

type CopyProps = {
  children?: any;
  copiedText: string;
  iconPosition?: IconPositionEnum;
  inverted?: boolean;
  linkProps?: LinkProps;
  linkText?: string;
  monospace?: boolean;
  muted?: boolean;
  small?: boolean;
  toastMessage?: string;
  withCopyIcon?: boolean;
};

function CopyToClipboard({
  children,
  copiedText,
  iconPosition = IconPositionEnum.LEFT,
  inverted,
  linkProps,
  linkText,
  monospace,
  muted,
  small,
  toastMessage,
  withCopyIcon,
}: CopyProps) {
  let el;
  if (children) {
    el = (
      <span>
        {children}
      </span>
    );
  } else if (withCopyIcon) {
    el = (
      <Link
        href="#"
        inline
        muted={muted}
        preventDefault
        sameColorAsText
        small={small}
        {...linkProps}
      >
        <FlexContainer alignItems="center">
          {iconPosition === IconPositionEnum.LEFT && (
            <Spacing mr={linkText ? 1 : 0}>
              <FlexContainer alignItems="center">
                <Copy inverted={inverted} muted={muted} size={UNIT * 2} />
              </FlexContainer>
            </Spacing>
          )}
          {linkText && (
            <Text inverted={inverted} monospace={monospace} muted={muted} small={small}>
              {linkText}
            </Text>
          )}
          {iconPosition === IconPositionEnum.RIGHT && (
            <Spacing ml={linkText ? 1 : 0}>
              <FlexContainer alignItems="center">
                <Copy inverted={inverted} muted={muted} />
              </FlexContainer>
            </Spacing>
          )}
        </FlexContainer>
      </Link>
    );
  }

  const buildMessage = () => toastMessage || 'Successfully copied to clipboard.';

  return (
    <Tooltip
      block
      label="Copy"
      size={null}
      widthFitContent
    >
      <CopyClipboard
        onCopy={() => toast.success(
          buildMessage(),
          {
            position: toast.POSITION.BOTTOM_RIGHT,
            toastId: copiedText,
          },
        )}
        text={copiedText}
      >
        {el}
      </CopyClipboard>
    </Tooltip>
  );
}

export default CopyToClipboard;
