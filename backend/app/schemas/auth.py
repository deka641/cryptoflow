from pydantic import BaseModel, EmailStr

class UserRegister(BaseModel):
    email: str
    password: str
    full_name: str | None = None

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str | None
    is_active: bool

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
