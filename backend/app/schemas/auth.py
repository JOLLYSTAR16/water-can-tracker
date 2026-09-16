from pydantic import BaseModel


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    must_change_password: bool
    user_id: int
    name: str
    role: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str