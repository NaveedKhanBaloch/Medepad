"""Domain errors. The API layer maps these to HTTP status codes."""


class DomainError(Exception):
    status_code = 400

    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


class NotFoundError(DomainError):
    status_code = 404


class PermissionDeniedError(DomainError):
    status_code = 403


class AuthenticationError(DomainError):
    status_code = 401


class ConflictError(DomainError):
    status_code = 409


class TooManyRequestsError(DomainError):
    status_code = 429


class GenerationError(DomainError):
    status_code = 502
