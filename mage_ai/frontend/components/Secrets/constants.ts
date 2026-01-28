export const SAMPLE_SECRET_VALUE = `
    "{{ mage_secret_var('<secret_name>') }}"
`;

export const SECRET_IN_CODE = `
    from mage_ai.data_preparation.shared.secrets import get_secret_value

    get_secret_value('<secret_name>')
`;
