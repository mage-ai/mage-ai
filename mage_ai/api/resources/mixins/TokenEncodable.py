import jwt

JWT_SECRET = 'materia'


class TokenEncodable():
    def encode_token(self, token, expires):
        return jwt.encode({
            'expires': expires.timestamp(),
            'token': token,
        }, JWT_SECRET, algorithm='HS256')
