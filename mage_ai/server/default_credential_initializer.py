from mage_ai.authentication.passwords import create_bcrypt_hash, generate_salt
from mage_ai.orchestration.db.models.oauth import User

def get_default_credentials(default_role):
    password_salt = generate_salt()
    return User.create(
        email='admin@example.com',
        password_hash=create_bcrypt_hash('admin', password_salt),
        password_salt=password_salt,
        roles_new=[default_role],
        username='admin',
    )
