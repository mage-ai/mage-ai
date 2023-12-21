from mage_ai.authentication.passwords import create_bcrypt_hash, generate_salt
from mage_ai.orchestration.db.models.oauth import User
from mage_ai.settings import DEFAULT_ADMIN_EMAIL, DEFAULT_ADMIN_PASSWORD


def get_default_credentials(default_role):
    password_salt = generate_salt()
    return User.create(
        email=DEFAULT_ADMIN_EMAIL,
        password_hash=create_bcrypt_hash(DEFAULT_ADMIN_PASSWORD, password_salt),
        password_salt=password_salt,
        roles_new=[default_role],
        username='admin',
    )
