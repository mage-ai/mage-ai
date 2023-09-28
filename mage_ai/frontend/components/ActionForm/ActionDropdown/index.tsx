import React from 'react';

import ActionPayloadType, { ActionTypeEnum, AxisEnum } from '@interfaces/ActionPayloadType';
import Select from '@oracle/elements/Inputs/Select';
import actionsConfig from '@components/ActionForm/actions';
import { UNIT } from '@oracle/styles/units/spacing';

type ActionDropdownProps = {
  actionType: ActionTypeEnum;
  columnOnly?: boolean;
  setActionPayload: (payload: ActionPayloadType) => void;
};

function ActionDropdown({
  actionType,
  columnOnly,
  setActionPayload,
}: ActionDropdownProps, ref) {
  return (
    <Select
      onChange={e => setActionPayload(JSON.parse(e.target.value))}
      ref={ref}
      value={actionType}
      width={UNIT * 20}
    >
      <option value="">
        New action
      </option>

      {!columnOnly && Object.entries(actionsConfig.rows).map(([k, v]) => (
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

      {Object.entries(actionsConfig.columns).map(([k, v]) =>
        (columnOnly ? true : v.multiColumns) && (
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

export default React.forwardRef(ActionDropdown);
