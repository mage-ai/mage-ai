from enum import Enum

"""
- **400 Bad Request**: The server could not understand the request due to invalid syntax.
- **401 Unauthorized**: The client must authenticate itself to get the requested response.
- **403 Forbidden**: The client does not have access rights to the content.
- **404 Not Found**: The server cannot find the requested resource.
- **405 Method Not Allowed**: The request method is known by the server
    but is not supported by the target resource.
- **408 Request Timeout**: The server timed out waiting for the request.
- **409 Conflict**: The request conflicts with the current state of the server.
- **410 Gone**: The requested content has been removed from the server.
"""


class ErrorCode(int, Enum):
    CODE_400 = 400
    CODE_401 = 401
    CODE_402 = 402
    CODE_403 = 403
    CODE_404 = 404
    CODE_500 = 500
