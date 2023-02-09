import { toast } from 'react-toastify';
import { useEffect, useState } from 'react';
import { useMutation } from 'react-query';

import Button from '@oracle/elements/Button';
import Headline from '@oracle/elements/Headline';
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
import { isEmptyObject, selectKeys } from '@utils/hash';
import { onSuccess } from '@api/utils/response';

type UserEditFormProps = {
  hideFields?: string[];
  newUser?: boolean;
  onSaveSuccess?: (user: UserType) => void;
  title?: string;
  user: UserType;
};

function UserEditForm({
  hideFields: hideFieldsProp,
  newUser,
  onSaveSuccess,
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
            // @ts-ignore
            const newProfile = selectKeys(userServer, USER_PROFILE_FIELDS.concat(USER_PASSWORD_FIELDS).map(({
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
              message,
              type,
            },
          }) => {
            toast.error(
              message,
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
          <Button
            disabled={buttonDisabled || (errors && !isEmptyObject(errors))}
            loading={isLoading}
            // @ts-ignore
            onClick={() => updateUser({ user: profile })}
            primary
          >
            {newUser ? 'Create new user' : 'Update user profile'}
          </Button>
        </Spacing>
      </form>
    </>
  );
}

export default UserEditForm;
