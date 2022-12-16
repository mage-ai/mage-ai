import ActionPayloadType, { ActionTypeEnum, AxisEnum } from '@interfaces/ActionPayloadType';
import ClickOutside from '@oracle/components/ClickOutside';
import Menu from '@oracle/components/Menu';
import actionsConfig from '@components/ActionForm/actions';
import { FormConfigType } from '../constants';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';

type ActionMenuProps = {
  columnOnly?: boolean;
  setActionPayload: (payload: ActionPayloadType) => void;
  setVisible: (visible: boolean) => void;
  visible: boolean;
};

function ActionMenu({
  columnOnly,
  setActionPayload,
  setVisible,
  visible,
}: ActionMenuProps) {
  const handleClick = (
    actionKey: ActionTypeEnum,
    axis: AxisEnum,
  ) => {
    setActionPayload({
      action_type: actionKey,
      axis,
    });
    setVisible(false);
  };

  const rowLinks = Object.entries(actionsConfig.rows).map(
    ([actionKey, actionConfig]: [ActionTypeEnum, FormConfigType]) => ({
      label: actionConfig.title,
      onClick: () => handleClick(actionKey, AxisEnum.ROW),
      uuid: actionKey,
    }),
  );
  const columnLinks = Object.entries(actionsConfig.columns)
    .filter(([actionKey, actionConfig]: [ActionTypeEnum, FormConfigType]) => (
      columnOnly ? true : actionConfig.multiColumns
    ))
    .map(([actionKey, actionConfig]: [ActionTypeEnum, FormConfigType]) => ({
      label: actionConfig.title,
      onClick: () => handleClick(actionKey, AxisEnum.COLUMN),
      uuid: actionKey,
    }));
  const allLinks = rowLinks.concat(columnLinks);

  return (
    <ClickOutside
      disableEscape
      onClickOutside={() => setVisible(false)}
      open={visible}
    >
      <Menu
        linkGroups={[
          {
            links: columnOnly ? columnLinks : allLinks,
            uuid: 'actions',
          },
        ]}
        right={UNIT * PADDING_UNITS}
      />
    </ClickOutside>
  );
}

export default ActionMenu;
