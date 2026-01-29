export const SAMPLE_SECRET_VALUE = `
    "{{ mage_secret_var('<secret_name>') }}"
`;

export const SECRET_IN_CODE = `
    from mage_ai.data_preparation.shared.secrets import get_secret_value

    get_secret_value('<secret_name>')
`;

export const SECRET_NAME_VALIDATION_REGEX = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

export const SECRET_NAME_INVALID_MESSAGE = 'Name must start with a letter or underscore '
  + 'and contain only letters, numbers, and underscores.';

export const ENCRYPTION_WARNING = 'The encryption key is stored in a file on your machine. '
  + 'If you need more secure encryption, we recommend using a secrets manager.';

export const SECRETS_INFO = 'Secrets are not editable, they can only be created and deleted. '
  + 'Secrets are shared across the project, and can be used in configuration fields.';
