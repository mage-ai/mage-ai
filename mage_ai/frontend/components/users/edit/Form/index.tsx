import { toast } from 'react-toastify';
import { useEffect, useState } from 'react';
import { useMutation } from 'react-query';

import Button from '@oracle/elements/Button';
import Headline from '@oracle/elements/Headline';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import TextInput from '@oracle/elements/Inputs/TextInput';
import UserType from '@interfaces/UserType';
import api from '@api';
import { UserFieldType, USER_PROFILE_FIELDS, USER_PASSWORD_FIELDS } from './constants';
import { isEmptyObject } from '@utils/hash';
import { parseErrorFromResponse, onSuccess } from '@api/utils/response';

type UserEditFormProps = {
  user: UserType;
};

function UserEditForm({
  user,
}: UserEditFormProps) {
  const [buttonDisabled, setButtonDisabled] = useState<boolean>(true);
  const [errors, setErrors] = useState<{
    [key: string]: string;
  }>({});
  const [profile, setProfile] = useState<UserType>(null);

  const [updateUser, { isLoading }] = useMutation(
    api.users.useUpdate(user?.id),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: ({
            user: userServer,
          }) => {
            setProfile(userServer);
            toast.success(
              'User profile successfully updated.',
              {
                position: toast.POSITION.BOTTOM_RIGHT,
                toastId: `user-update-success-${userServer.id}`,
              },
            );
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

  useEffect(() => {
    if (user && !profile) {
      setProfile(user);
    }

    if (profile?.password && profile?.password_confirmation) {
      if (profile.password !== profile.password_confirmation) {
        setErrors({
          password_confirmation: 'Password confirmation does not match.',
        });
      } else if (!profile?.password_current) {
        setErrors({
          password_current: 'This field is required.',
        });
      } else {
        setErrors(null);
      }
    } else if (profile?.password_current) {
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
  }, [profile, user]);

  return (
    <>
      <Headline>
        Edit profile
      </Headline>
      {USER_PROFILE_FIELDS.map(({
        autoComplete,
        disabled,
        label,
        required,
        type,
        uuid,
      }: UserFieldType) => (
        <Spacing key={uuid} mt={2}>
          <TextInput
            autoComplete={!!autoComplete}
            disabled={disabled}
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
            type={type}
            value={profile?.[uuid] || ''}
          />
        </Spacing>
      ))}

      <Spacing mt={5}>
        <Headline>
          Change password
        </Headline>

        {USER_PASSWORD_FIELDS.map(({
          autoComplete,
          disabled,
          label,
          required,
          type,
          uuid,
        }: UserFieldType) => (
          <Spacing key={uuid} mt={2}>
            <TextInput
              autoComplete={!!autoComplete}
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
          onClick={() => updateUser({ user: profile })}
          primary
        >
          Update user profile
        </Button>
      </Spacing>
    </>
  );
}

export default UserEditForm;
