import { toast } from 'react-toastify';
import { useEffect, useMemo, useState } from 'react';
import { useMutation } from 'react-query';

import Button from '@oracle/elements/Button';
import Chip from '@oracle/components/Chip';
import FlexContainer from '@oracle/components/FlexContainer';
import Headline from '@oracle/elements/Headline';
import RoleType from '@interfaces/RoleType';
import Select from '@oracle/elements/Inputs/Select';
import Spacing from '@oracle/elements/Spacing';
import TextInput from '@oracle/elements/Inputs/TextInput';
import UserType from '@interfaces/UserType';
import api from '@api';
import usePrevious from '@utils/usePrevious';
import {
  USER_PASSWORD_CURRENT_FIELD_UUID,
  USER_PASSWORD_FIELDS,
  USER_PROFILE_FIELDS,
  UserFieldType,
} from './constants';
import { find, remove } from '@utils/array';
import { getUser } from '@utils/session';
import { isEmptyObject, selectKeys } from '@utils/hash';
import { onSuccess } from '@api/utils/response';

type UserEditFormProps = {
  disabledFields?: string[];
  entity?: string,
  entityID?: string,
  hideFields?: string[];
  newUser?: boolean;
  onDeleteSuccess?: () => void;
  onSaveSuccess?: (user: UserType) => void;
  showDelete?: boolean;
  title?: string;
  user: UserType;
};

function UserEditForm({
  disabledFields,
  entity,
  entityID,
  hideFields: hideFieldsProp,
  newUser,
  onDeleteSuccess,
  onSaveSuccess,
  showDelete,
  title,
  user,
}: UserEditFormProps) {
  const [buttonDisabled, setButtonDisabled] = useState<boolean>(true);
  const [errors, setErrors] = useState<{
    [key: string]: string;
  }>({});
  const [profile, setProfile] = useState<UserType>(null);
  const {
    owner: isOwner,
  } = getUser() || {};

  const { data: dataRoles, mutate: fetchRoles } = api.roles.list({
    entity: entity,
    entity_ids: entityID ? [entityID] : [],
    limit_roles: !!newUser,
  }, {
    revalidateOnFocus: false,
  });
  const roles = useMemo(
    () => dataRoles?.roles || [],
    [dataRoles?.roles],
  );

  const [updateUser, { isLoading }] = useMutation(
    newUser ? api.users.useCreate() : api.users.useUpdate(user?.id),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: ({
            user: userServer,
          }) => {
            // @ts-ignore
            const keys = USER_PROFILE_FIELDS.concat(USER_PASSWORD_FIELDS).map(({
              uuid,
            }) => uuid);
            keys.push('roles_new');
            const newProfile = selectKeys(userServer, keys);
            setProfile(newProfile);

            toast.success(
              newUser ? 'New user created successfully.' : 'User profile successfully updated.',
              {
                position: toast.POSITION.BOTTOM_RIGHT,
                toastId: `user-update-success-${userServer.id}`,
              },
            );
            onSaveSuccess?.(newProfile);
          },
          onErrorCallback: ({
            error: {
              errors,
              exception,
              message,
              type,
            },
          }) => {
            toast.error(
              errors?.error || exception || message,
              {
                position: toast.POSITION.BOTTOM_RIGHT,
                toastId: type,
              },
            );
          },
        },
      ),
    },
  );

  const [deleteUser, { isLoading: isLoadingDelete }] = useMutation(
    api.users.useDelete(user?.id),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: () => {
            onDeleteSuccess?.();
          },
          onErrorCallback: ({
            error: {
              errors,
              message,
            },
          }) => {
            alert(message);
            console.log(errors);
          },
        },
      ),
    },
  );

  const hideFields = hideFieldsProp ? [...hideFieldsProp] : [];
  if (newUser) {
    hideFields.push(USER_PASSWORD_CURRENT_FIELD_UUID);
  }
  const requirePasswordCurrent = !hideFields
    || !hideFields.includes(USER_PASSWORD_CURRENT_FIELD_UUID);

  const userPrev = usePrevious(user);
  useEffect(() => {
    if (user && (!profile || userPrev?.id !== user?.id)) {
      // @ts-ignore
      const keys = USER_PROFILE_FIELDS.concat(USER_PASSWORD_FIELDS).map(({
        uuid,
      }) => uuid);
      keys.push('roles_new');
      // @ts-ignore
      setProfile(selectKeys(user, keys));
    }

    if (profile?.password || profile?.password_confirmation) {
      if (profile?.password !== profile?.password_confirmation) {
        setErrors({
          password_confirmation: 'Password confirmation does not match.',
        });
      } else if (requirePasswordCurrent && !profile?.password_current) {
        setErrors({
          password_current: 'This field is required.',
        });
      } else {
        setErrors(null);
      }
    } else if (profile?.password_current && requirePasswordCurrent) {
      if (profile?.password && profile?.password_confirmation) {
        setErrors(null);
      } else {
        setErrors({
          password: 'This field is required.',
          password_confirmation: 'This field is required.',
        });
      }
    } else if (!profile?.password_current && !profile?.password && !profile?.password_confirmation) {
      setErrors(null);
    }
  }, [
    profile,
    requirePasswordCurrent,
    user,
    userPrev,
  ]);

  const profileRoles = useMemo(() => {
    let userRoles = [];

    const roleIDs = roles?.map(({ id }: RoleType) => id) || [];
    if (profile) {
      userRoles = profile.roles_new;
    } else if (user?.roles_new && user?.roles_new.length > 0) {
      userRoles = user.roles_new;
    }
    return userRoles?.filter((({ id }: RoleType) => roleIDs.includes(id)));
  }, [profile, roles, user]);

  return (
    <>
      <Headline>
        {title || 'Edit profile'}
      </Headline>

      <form>
        {USER_PROFILE_FIELDS.filter(({
          uuid,
        }) => !hideFields || !hideFields.includes(uuid)).map(({
          autoComplete,
          disabled,
          label,
          required,
          type,
          uuid,
        }: UserFieldType) => (
          <Spacing key={uuid} mt={2}>
            <TextInput
              autoComplete={autoComplete}
              disabled={disabled && !newUser}
              label={label}
              // @ts-ignore
              onChange={e => {
                setButtonDisabled(false);
                setProfile(prev => ({
                  ...prev,
                  [uuid]: e.target.value,
                }));
              }}
              primary
              required={required}
              setContentOnMount
              type={type}
              value={profile?.[uuid] || ''}
            />
          </Spacing>
        ))}

        {!user?.owner && (
          <Spacing mt={2}>
            <Select
              disabled={disabledFields?.includes('roles')}
              label="Roles"
              // @ts-ignore
              onChange={e => {
                setButtonDisabled(false);
                const role = find(roles, (({ id }: RoleType) => id == e.target.value));
                if (role) {
                  setProfile(prev => {
                    const prevRoles = prev?.roles_new || [];
                    let updatedProfile = {};
                    if (!find(prevRoles, ({ id }: RoleType) => id == role?.id)) {
                      updatedProfile = {
                        roles_new: [...prevRoles, role],
                      };
                    }
                    return {
                      ...prev,
                      ...updatedProfile,
                    };
                  });
                }
              }}
              primary
              setContentOnMount
            >
              {roles.map(({ id, name }) => (
                <option key={name} value={id}>
                  {name}
                </option>
              ))}
            </Select>
            <Spacing mb={1} />
            <FlexContainer alignItems="center" flexWrap="wrap">
              {profileRoles?.map(({ id, name }: RoleType) => (
                <Spacing
                  key={`user_roles/${name}`}
                  mb={1}
                  mr={1} 
                >
                  <Chip
                    label={name}
                    onClick={() => {
                      setButtonDisabled(false);
                      setProfile(prev => ({
                        ...prev,
                        roles_new: remove(
                          prev.roles_new || [],
                          ({ id: rid }: RoleType) => rid === id,
                        ),
                      }));
                    }}
                    primary
                  />
                </Spacing>
              ))}
            </FlexContainer>
            
          </Spacing>
        )}

        <Spacing mt={5}>
          <Headline>
            {newUser ? 'Password' : 'Change password'}
          </Headline>

          {USER_PASSWORD_FIELDS.filter(({
            uuid,
          }) => !hideFields || !hideFields.includes(uuid)).map(({
            autoComplete,
            disabled,
            label,
            required,
            type,
            uuid,
          }: UserFieldType) => (
            <Spacing key={uuid} mt={2}>
              <TextInput
                autoComplete={autoComplete}
                disabled={disabled}
                label={label}
                meta={{
                  error: errors?.[uuid],
                  touched: !!errors?.[uuid],
                }}
                // @ts-ignore
                onChange={e => {
                  setButtonDisabled(false);
                  setProfile(prev => ({
                    ...prev,
                    [uuid]: e.target.value,
                  }));
                }}
                primary
                required={required}
                setContentOnMount
                type={type}
                value={profile?.[uuid] || ''}
              />
            </Spacing>
          ))}
        </Spacing>

        <Spacing mt={5}>
          <FlexContainer>
            <Button
              disabled={buttonDisabled || (errors && !isEmptyObject(errors))}
              loading={isLoading}
              onClick={() => {
                const updated_profile = {
                  ...profile,
                };
                if ('roles_new' in updated_profile) {
                  // @ts-ignore
                  updated_profile['roles_new'] = profile.roles_new?.map(({ id }: RoleType) => id);
                }
                // @ts-ignore
                updateUser({ user: updated_profile });
              }}
              primary
            >
              {newUser ? 'Create new user' : 'Update user profile'}
            </Button>

            {(showDelete && isOwner) && (
              <Spacing ml={1}>
                <Button
                  danger
                  loading={isLoadingDelete}
                  // @ts-ignore
                  onClick={() => {
                    if (typeof window !== 'undefined'
                      && window.confirm(
                        `Are you sure you want to delete ${profile.username || profile.email}?`,
                      )) {

                      deleteUser();
                    }
                  }}
                >
                  Delete user
                </Button>
              </Spacing>
            )}
          </FlexContainer>
        </Spacing>
      </form>
    </>
  );
}

export default UserEditForm;
