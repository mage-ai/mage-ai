import jwt

JWT_SECRET = 'Materia'


class TokenEncodable():
    def encode_token(self, token, expires):
        encoded_token = jwt.encode({
            'expires': expires.timestamp(),
            'token': token,
        }, JWT_SECRET, algorithm='HS256')
        return encoded_token.decode('utf-8')
