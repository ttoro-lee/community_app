from pydantic import BaseModel, ConfigDict
from datetime import datetime


class EmoticonResponse(BaseModel):
    id: int
    name: str
    image_url: str
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
