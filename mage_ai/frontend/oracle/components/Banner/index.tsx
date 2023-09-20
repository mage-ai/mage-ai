import { useCallback, useState } from 'react';

import FlexContainer, { JUSTIFY_SPACE_BETWEEN_PROPS } from '../FlexContainer';
import Link from '@oracle/elements/Link';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import { BannerContainerStyle, BannerStyle } from './index.style';
import { ChevronRight } from '@oracle/icons';
import { ICON_SIZE_MEDIUM } from '@oracle/styles/units/icons';
import { get, set } from '@storage/localStorage';

type BannerProps = {
  children?: any;
  linkProps?: {
    href?: string;
    label?: string;
  }
  localStorageHideKey?: string;
  textProps?: {
    message?: string;
    warning?: boolean;
  }
};

function Banner({
  children,
  linkProps,
  localStorageHideKey,
  textProps,
}: BannerProps) {
  const localStorageHideValue = localStorageHideKey
    ? get(localStorageHideKey, false)
    : false;
  const [hideBannerState, setHideBannerState] = useState<boolean>(localStorageHideValue);

  const hideBanner = useCallback(() => {
    setHideBannerState(true);
    set(localStorageHideKey, true);
  }, [localStorageHideKey]);

  const { message, warning } = textProps || {};
  const { href, label: linkLabel } = linkProps || {};

  return (
    <BannerContainerStyle
      hide={hideBannerState}
    >
      <FlexContainer {...JUSTIFY_SPACE_BETWEEN_PROPS}>
        <BannerStyle>
          {children
            ? children
            : (
              <FlexContainer {...JUSTIFY_SPACE_BETWEEN_PROPS}>
                <Text
                  large
                  warning={warning}
                >
                  {message}
                </Text>
                {href &&
                  <Spacing ml={3}>
                    <FlexContainer {...JUSTIFY_SPACE_BETWEEN_PROPS}>
                      <Link
                        bold
                        href={href}
                        large
                        openNewWindow
                        sameColorAsText
                      >
                        {linkLabel}
                      </Link>

                      <Spacing ml="4px" />

                      <ChevronRight size={ICON_SIZE_MEDIUM} />
                    </FlexContainer>
                  </Spacing>
                }
              </FlexContainer>
            )
          }
        </BannerStyle>

        {localStorageHideKey && (
          <Spacing ml={2}>
            <Link
              bold
              large
              onClick={hideBanner}
              preventDefault
            >
              Hide
            </Link>
          </Spacing>
        )}
      </FlexContainer>
    </BannerContainerStyle>
  );
}

export default Banner;
