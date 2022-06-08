import ActionPayloadType, { ActionTypeEnum, AxisEnum } from '@interfaces/ActionPayloadType';
import ClickOutside from '@oracle/components/ClickOutside';
import Menu from '@oracle/components/Menu';
import actionsConfig from '@components/ActionForm/actions';
import { FormConfigType } from '../constants';

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
  const rowLinks = Object.entries(actionsConfig.rows).map(
    ([actionKey, actionConfig]: [ActionTypeEnum, FormConfigType]) => ({
      label: actionConfig.title,
      onClick: () => setActionPayload({
        action_type: actionKey,
        axis: AxisEnum.ROW,
      }),
      uuid: actionKey,
    }),
  );
  const columnLinks = Object.entries(actionsConfig.columns)
    .filter(([actionKey, actionConfig]: [ActionTypeEnum, FormConfigType]) => (
      columnOnly ? true : actionConfig.multiColumns
    ))
    .map(([actionKey, actionConfig]: [ActionTypeEnum, FormConfigType]) => ({
      label: actionConfig.title,
      onClick: () => setActionPayload({
        action_type: actionKey,
        axis: AxisEnum.COLUMN,
      }),
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
      />
    </ClickOutside>
  );
}

export default ActionMenu;
