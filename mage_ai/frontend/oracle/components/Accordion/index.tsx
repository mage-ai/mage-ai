import React, { useState } from 'react';
import styled from 'styled-components';

import AccordionPanelImport, { AccordionPanelProps } from './AccordionPanel';
import Divider from '@oracle/elements/Divider';
import light from '@oracle/styles/themes/light'
import { BORDER_RADIUS } from '@oracle/styles/units/borders';

export type AccordionProps = {
  activeItemIndex?: number;
  children: any;
  onClick?: (visibleMapping: {
    [key: number]: boolean;
  }) => void;
  eventScreenName?: string;
  showDividers?: boolean;
  visibleMapping?: {
    [key: number]: boolean;
  };
  visibleMappingForced?: {
    [key: number]: boolean;
  };
} & AccordionPanelProps;

type AccordionPanelContainerProps = {
  index: number;
  showDividers?: boolean;
};

const AccordionStyle = styled.div<AccordionProps>`
  border-radius: ${BORDER_RADIUS}px;
  overflow: hidden;

  ${props => `
    border: 1px solid ${(props.theme.interactive || light.interactive).defaultBorder};
  `}
`;

const AccordionPanelContainerStyle = styled.div<AccordionPanelContainerProps>`
`;

const Accordion = ({
  activeItemIndex,
  children,
  onClick,
  showDividers,
  visibleMapping: visibleMappingProps,
  visibleMappingForced,
  ...props
}: AccordionProps) => {
  const [visibleMappingState, setVisibleMapping] = useState(visibleMappingProps || {});
  const [visibleCount, setVisibleCount] = useState({});
  const visibleMapping = {
    ...visibleMappingState,
    ...visibleMappingForced,
  };

  return (
    <AccordionStyle {...props}>
      {React.Children.map(children, (child, idx) => {
        const last = idx === (children || []).length - 1;
        const visible: boolean = visibleMapping[idx];

        return (
          <div key={idx}>
            <AccordionPanelContainerStyle
              index={idx}
              showDividers={showDividers}
            >
              {React.cloneElement(child, {
                ...props,
                first: idx === 0,
                last,
                onClick: () => {
                  let newVisibleMapping = {};
                  setVisibleCount({
                    ...visibleCount,
                    [idx]: visibleCount[idx] ? visibleCount[idx] + 1 : 1,
                  });
                  newVisibleMapping = {
                    ...visibleMapping,
                    [idx]: !visible,
                  };
                  setVisibleMapping(newVisibleMapping);

                  if (onClick) {
                    onClick(newVisibleMapping);
                  }
                },
                visible,
                visibleCount: visibleCount[idx] || 0,
                visibleHighlightDisabled: typeof activeItemIndex !== 'undefined'
                  ? idx !== activeItemIndex
                  : false,
              })}
            </AccordionPanelContainerStyle>

            {showDividers && <Divider />}
          </div>
        );
      })}
    </AccordionStyle>
  );
};

export const AccordionPanel = AccordionPanelImport;
export default Accordion;
