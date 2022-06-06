import Select from '@oracle/elements/Inputs/Select';
import actionsConfig from '@components/ActionForm/actions';
import ActionPayloadType, { ActionTypeEnum, AxisEnum } from '@interfaces/ActionPayloadType';
import { UNIT } from '@oracle/styles/units/spacing';

type ActionDropdownProps = {
  actionType: ActionTypeEnum;
  setActionPayload: (payload: ActionPayloadType) => void;
};

function ActionDropdown({
  actionType,
  setActionPayload,
}: ActionDropdownProps) {
  return (
    <Select
      onChange={e => setActionPayload(JSON.parse(e.target.value))}
      value={actionType}
      width={UNIT * 20}
    >
      <option value="">
        New action
      </option>

      {Object.entries(actionsConfig.rows).map(([k, v]) => (
        <option
          key={k}
          value={JSON.stringify({
            action_type: k,
            axis: AxisEnum.ROW,
          })}
        >
          {v.title}
        </option>
      ))}

      {Object.entries(actionsConfig.columns).map(([k, v]) => v.multiColumns && (
        <option
          key={k}
          value={JSON.stringify({
            action_type: k,
            axis: AxisEnum.COLUMN,
          })}
        >
          {v.title}
        </option>
      ))}
    </Select>
  );
}

export default ActionDropdown;
