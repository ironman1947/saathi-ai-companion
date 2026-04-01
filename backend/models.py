from sqlalchemy import Column, Integer, String, Text
from database import Base

class Chat(Base):
    __tablename__ = "chats"

    id       = Column(Integer, primary_key=True, index=True)
    user_id  = Column(String)
    role     = Column(String)   # user / assistant
    message  = Column(Text)
    persona  = Column(String)
