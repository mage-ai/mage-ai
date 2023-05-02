import { toast } from 'react-toastify';
import { useEffect, useState } from 'react';
import { useMutation } from 'react-query';

import Button from '@oracle/elements/Button';
import FlexContainer from '@oracle/components/FlexContainer';
import Headline from '@oracle/elements/Headline';
import Select from '@oracle/elements/Inputs/Select';
import Spacing from '@oracle/elements/Spacing';
import TextInput from '@oracle/elements/Inputs/TextInput';
import UserType, {
  ROLE_DISPLAY_MAPPING,
  ROLES,
  RoleValueEnum,
} from '@interfaces/UserType';
import api from '@api';
import usePrevious from '@utils/usePrevious';
import {
  USER_PASSWORD_CURRENT_FIELD_UUID,
  USER_PASSWORD_FIELDS,
  USER_PROFILE_FIELDS,
  UserFieldType,
} from './constants';
import { isEmptyObject, selectKeys } from '@utils/hash';
import { onSuccess } from '@api/utils/response';

type UserEditFormProps = {
  disabledFields?: string[];
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

  const [updateUser, { isLoading }] = useMutation(
    newUser ? api.users.useCreate() : api.users.useUpdate(user?.id),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: ({
            user: userServer,
          }) => {
            const newProfile =
              // @ts-ignore
              selectKeys(userServer, USER_PROFILE_FIELDS.concat(USER_PASSWORD_FIELDS).map(({
                uuid,
              }) => uuid));
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
              exception,
              message,
              type,
            },
          }) => {
            toast.error(
              exception || message,
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
      setProfile(selectKeys(user, USER_PROFILE_FIELDS.concat(USER_PASSWORD_FIELDS).map(({
        uuid,
      }) => uuid)));
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

                if (e.target.value === RoleValueEnum.OWNER) {
                  setProfile(prev => ({
                    ...prev,
                    owner: true,
                    roles: null,
                  }));
                } else {
                  setProfile(prev => ({
                    ...prev,
                    owner: false,
                    roles: e.target.value,
                  }));
                }
              }}
              primary
              setContentOnMount
              value={(profile?.owner ? RoleValueEnum.OWNER : profile?.roles)
                || (user?.roles || '')}
            >
              <option value="" />
              {ROLES.map((value) => (
                <option key={value} value={value}>
                  {ROLE_DISPLAY_MAPPING[value]}
                </option>
              ))}
              {!newUser &&
                <option key="owner_role" value={RoleValueEnum.OWNER}>
                  {ROLE_DISPLAY_MAPPING[RoleValueEnum.OWNER]}
                </option>
              }
            </Select>
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
              // @ts-ignore
              onClick={() => updateUser({ user: profile })}
              primary
            >
              {newUser ? 'Create new user' : 'Update user profile'}
            </Button>

            {showDelete && (
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
