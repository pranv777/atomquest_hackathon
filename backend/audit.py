from sqlalchemy.orm import Session
from typing import Any, Optional
import models


def log_action(
    db: Session,
    user_id: int,
    action: str,
    entity_type: str,
    entity_id: Optional[int] = None,
    old_values: Optional[Any] = None,
    new_values: Optional[Any] = None,
    description: Optional[str] = None,
):
    entry = models.AuditLog(
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        old_values=old_values,
        new_values=new_values,
        description=description,
    )
    db.add(entry)
    db.commit()
