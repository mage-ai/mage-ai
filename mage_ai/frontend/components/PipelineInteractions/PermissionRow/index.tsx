import Button from '@oracle/elements/Button';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Headline from '@oracle/elements/Headline';
import Select from '@oracle/elements/Inputs/Select';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import { Add, Close } from '@oracle/icons';
import {
  BlockInteractionRoleWithUUIDType,
  BlockInteractionTriggerType,
  BlockInteractionTriggerWithUUIDType,
  InteractionPermission,
  InteractionPermissionWithUUID,
} from '@interfaces/PipelineInteractionType';
import { ContainerStyle } from '../index.style';
import { PADDING_UNITS, UNITS_BETWEEN_ITEMS_IN_SECTIONS } from '@oracle/styles/units/spacing';
import { ROLES_FROM_SERVER } from '@interfaces/UserType';
import {
  SCHEDULE_INTERVALS,
  SCHEDULE_TYPE_TO_LABEL,
  ScheduleTypeEnum,
} from '@interfaces/PipelineScheduleType';
import { capitalize } from '@utils/string';
import { pauseEvent } from '@utils/events';
import { removeAtIndex } from '@utils/array';

type PermissionRowProps = {
  index: number;
  permission: InteractionPermissionWithUUID;
  setPermissions: (
    permissions: InteractionPermission[] | InteractionPermissionWithUUID[],
  ) => InteractionPermission[] | InteractionPermissionWithUUID[];
  updatePermission: (permission: InteractionPermission | InteractionPermissionWithUUID) => void;
};

function PermissionRow({
  index,
  permission,
  setPermissions,
  updatePermission,
}: PermissionRowProps) {
  return (
    <ContainerStyle>
      <Spacing p={PADDING_UNITS}>
        <FlexContainer
          alignItems="flex-start"
          flexDirection="row"
        >
          <Button
            iconOnly
            onClick={() => setPermissions(
              // @ts-ignore
              (prev: InteractionPermission[] | InteractionPermissionWithUUID[]) => removeAtIndex(
                prev,
                index,
              ),
            )}
          >
            <Close />
          </Button>

          <Spacing mr={PADDING_UNITS} />

          <FlexContainer flexDirection="column">

            <FlexContainer alignItems="center" flexDirection="row">
              <Headline level={5}>
                Triggers
              </Headline>

              <Spacing mr={PADDING_UNITS} />

              <FlexContainer alignItems="center">
                <Button
                  beforeIcon={<Add />}
                  compact
                  onClick={(e) => {
                    pauseEvent(e);
                    updatePermission({
                      ...permission,
                      // @ts-ignore
                      triggers: (permission?.triggers || []).concat({
                        // @ts-ignore
                        schedule_interval: '',
                        // @ts-ignore
                        schedule_type: '',
                        // @ts-ignore
                        uuid: '',
                      }),
                    });
                  }}
                  secondary
                  small
                >
                  Add trigger
                </Button>
              </FlexContainer>
            </FlexContainer>

            {permission?.triggers?.length >= 1 && (
              <Spacing mt={PADDING_UNITS}>
                {permission?.triggers?.map(({
                  schedule_interval: scheduleInterval,
                  schedule_type: scheduleType,
                  uuid,
                }: BlockInteractionTriggerWithUUIDType, idx: number) => (
                  <Spacing key={`permission-trigger-${index}-${idx}-${uuid}`} mt={idx >= 1 ? 1 : 0}>
                    <FlexContainer alignItems="center">
                      <Button
                        iconOnly
                        noBackground
                        noBorder
                        onClick={(e) => {
                          pauseEvent(e);
                          const arr = removeAtIndex(permission?.triggers || [], idx);
                          updatePermission({
                            ...permission,
                            triggers: arr,
                          });
                        }}
                      >
                        <Close />
                      </Button>

                      <Spacing mr={1} />

                      <Select
                        compact
                        onChange={(e) => {
                          const val = e.target.value;
                          const p = { ...permission };
                          const item = { ...p?.triggers?.[idx] };
                          item.schedule_type = val;
                          p.triggers[idx] = item;

                          updatePermission(p);
                        }}
                        placeholder="Type"
                        small
                        value={scheduleType}
                      >
                        {Object.entries(SCHEDULE_TYPE_TO_LABEL).map(([value, label]) => (
                          <option key={value} value={value}>
                            {capitalize(label())}
                          </option>
                        ))}
                      </Select>

                      {(ScheduleTypeEnum.TIME === scheduleType || !scheduleType) && (
                        <>
                          <Spacing mr={1} />

                          <Select
                            compact
                            monospace
                            onChange={(e) => {
                              const val = e.target.value;
                              const p = { ...permission };
                              const item = { ...p?.triggers?.[idx] };
                              item.schedule_interval = val;
                              p.triggers[idx] = item;

                              updatePermission(p);
                            }}
                            placeholder="Interval"
                            small
                            value={scheduleInterval}
                          >
                            {SCHEDULE_INTERVALS.map((value) => (
                              <option key={value} value={value}>
                                {value}
                              </option>
                            ))}
                          </Select>
                        </>
                      )}
                    </FlexContainer>
                  </Spacing>
                ))}
              </Spacing>
            )}
          </FlexContainer>

          <Spacing mr={UNITS_BETWEEN_ITEMS_IN_SECTIONS} />

          <FlexContainer flexDirection="column">
            <FlexContainer alignItems="center" flexDirection="row">
              <Headline level={5}>
                Roles
              </Headline>

              <Spacing mr={PADDING_UNITS} />

              <FlexContainer alignItems="center">
                <Button
                  beforeIcon={<Add />}
                  compact
                  onClick={(e) => {
                    pauseEvent(e);
                    updatePermission({
                      ...permission,
                      // @ts-ignore
                      roles: (permission?.roles || []).concat({
                        // @ts-ignore
                        role: '',
                        // @ts-ignore
                        uuid: '',
                      }),
                    });
                  }}
                  secondary
                  small
                >
                  Add role
                </Button>
              </FlexContainer>
            </FlexContainer>

            {permission?.roles?.length >= 1 && (
              <Spacing mt={PADDING_UNITS}>
                {permission?.roles?.map(({
                  role,
                  uuid,
                }: BlockInteractionRoleWithUUIDType, idx: number) => (
                  <Spacing key={`permission-role-${index}-${idx}-${uuid}`} mt={idx >= 1 ? 1 : 0}>
                    <FlexContainer alignItems="center">
                      <Button
                        iconOnly
                        noBackground
                        noBorder
                        onClick={(e) => {
                          pauseEvent(e);
                          const arr = removeAtIndex(permission?.roles || [], idx);
                          updatePermission({
                            ...permission,
                            roles: arr,
                          });
                        }}
                      >
                        <Close />
                      </Button>

                      <Spacing mr={1} />

                      <Select
                        compact
                        monospace
                        onChange={(e) => {
                          const val = e.target.value;
                          const p = { ...permission };
                          const item = { ...p?.roles?.[idx] };
                          item.role = val;
                          p.roles[idx] = item;

                          updatePermission(p);
                        }}
                        placeholder="Role"
                        small
                        value={role}
                      >
                        {ROLES_FROM_SERVER.map((value: string) => (
                          <option key={value} value={value}>
                            {value}
                          </option>
                        ))}
                      </Select>
                    </FlexContainer>
                  </Spacing>
                ))}
              </Spacing>
            )}
          </FlexContainer>
        </FlexContainer>
      </Spacing>
    </ContainerStyle>
  );
}

export default PermissionRow;
