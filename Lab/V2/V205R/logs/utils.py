"""
Utility functions for logging system activities.
"""
from .models import LogEntry


def log_action(username, model_name, action_type,details=False):
    """
    Log a system activity.
    
    Args:
        username (str): Username of the user performing the action
        model_name (str): Name of the model being acted upon
        action_type (str): Type of action ('create', 'edit', 'delete')
    """
    try:
        log = LogEntry(
            username=username,
            model_name=model_name,
            action_type=action_type
        )
        log.save()
        if details:
            log.details = details
        log.save()
    except Exception as e:
        # Log the error but don't break the main operation
        print(f"Failed to log action: {e}")