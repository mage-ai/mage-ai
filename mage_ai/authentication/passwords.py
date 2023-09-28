import bcrypt


def generate_salt() -> str:
    return bcrypt.gensalt(14)


def create_bcrypt_hash(password: str, salt: str) -> str:
    password_bytes = password.encode()
    password_hash_bytes = bcrypt.hashpw(password_bytes, salt)
    password_hash_str = password_hash_bytes.decode()
    return password_hash_str


def verify_password(password: str, hash_from_database: str) -> bool:
    password_bytes = password.encode()
    hash_bytes = hash_from_database.encode()

    # this will automatically retrieve the salt from the hash,
    # then combine it with the password (parameter 1)
    # and then hash that, and compare it to the user's hash
    does_match = bcrypt.checkpw(password_bytes, hash_bytes)

    return does_match
