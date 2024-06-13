import Grid from '../../../../components/Grid';
import KeyboardText from '../Text';
import Text from '../../../Text';
import { KeyboardTextType, KeyboardTextGroupType } from '../types';

type KeyboardTextGroupProps = {
  inverted?: boolean;
  monospace?: boolean;
  small?: boolean;
  textGroup: KeyboardTextGroupType;
  xsmall?: boolean;
};

function KeyboardTextGroup({ textGroup, ...props }: KeyboardTextGroupProps) {
  const els = [];
  const previousKeys = [];

  textGroup?.forEach((keyTextGroup: KeyboardTextType[], idx1: number) => {
    const combo = [];

    keyTextGroup.forEach((keyText: KeyboardTextType, idx2: number) => {
      previousKeys.push(keyText);

      if (idx2 >= 1) {
        combo.push(
          <Text
            {...props}
            key={`key-text-plus-${previousKeys?.length}-${keyText}-${idx1}-${idx2}`}
            muted
          >
            +
          </Text>,
        );
      }

      combo.push(
        <KeyboardText
          {...props}
          inline
          key={`key-text-${previousKeys?.length}-${keyText}-${idx1}-${idx2}`}
          text={keyText}
        />,
      );
    });

    if (idx1 >= 1) {
      els.push(
        <Text key={`then-${idx1}`} muted small={props.small} xsmall={props.xsmall}>
          then
        </Text>,
      );
    }

    els.push(...combo);
  });

  return (
    <Grid alignItems="center" autoFlow="column" columnGap={4}>
      {els}
    </Grid>
  );
}

export default KeyboardTextGroup;
