import FeatureType from '@interfaces/FeatureType';
import Text from '@oracle/elements/Text';
import { GRAY_LINES, SILVER } from '@oracle/styles/colors/main';
import { BORDER_RADIUS_LARGE } from '@oracle/styles/units/borders';
import { PADDING } from '@oracle/styles/units/spacing';
import React from 'react';
import styled from 'styled-components';

export const ContainerStyle = styled.div`
  border: 1px solid ${GRAY_LINES};
  border-radius: ${BORDER_RADIUS_LARGE}px;
`;

export const HeaderStyle = styled.div`
  background: ${SILVER};
  padding: ${PADDING}px;
  border-bottom: 1px solid ${GRAY_LINES};
  border-top-left-radius: ${BORDER_RADIUS_LARGE}px;
  border-top-right-radius: ${BORDER_RADIUS_LARGE}px;
`;

export const BodyStyle = styled.div`
  border-bottom-left-radius: ${BORDER_RADIUS_LARGE}px;
  border-bottom-right-radius: ${BORDER_RADIUS_LARGE}px;
`;

type FeatureProfilesProps = {
  features: FeatureType[],
  statistics: any,
}

function FeatureProfiles({
  features,
  statistics,
}: FeatureProfilesProps) {
  return (
    <ContainerStyle>
      <HeaderStyle>
        <Text>
          Feature Profiles
        </Text>
      </HeaderStyle>
    </ContainerStyle>
  )
}

export default FeatureProfiles;