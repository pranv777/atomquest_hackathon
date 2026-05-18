from models import UoMType, Achievement
from datetime import datetime, timezone
from typing import Optional


def compute_progress_score(
    uom_type: UoMType,
    target_value: Optional[float],
    actual_value: Optional[float],
    target_date: Optional[datetime],
    actual_date: Optional[datetime],
) -> Optional[float]:
    """
    Compute progress score (0.0 – 1.0) based on UoM type.
    Returns None if data is insufficient.
    """
    if uom_type == UoMType.numeric_min:
        # Higher is better: achievement / target
        if target_value and target_value != 0 and actual_value is not None:
            return min(actual_value / target_value, 1.0)

    elif uom_type == UoMType.numeric_max:
        # Lower is better: target / achievement
        if actual_value and actual_value != 0 and target_value is not None:
            return min(target_value / actual_value, 1.0)

    elif uom_type == UoMType.timeline:
        # Date-based: completed before or on deadline = 100%
        if target_date and actual_date:
            if actual_date <= target_date:
                return 1.0
            # Partial: days overdue penalty
            total_days = (target_date - target_date.replace(month=1, day=1)).days or 1
            overdue = (actual_date - target_date).days
            return max(0.0, 1.0 - (overdue / total_days))
        return None

    elif uom_type == UoMType.zero:
        # Zero = success
        if actual_value is not None:
            return 1.0 if actual_value == 0 else 0.0

    return None
