"""
Utility functions for logging system activities.
"""
import json
from .models import LogEntry


def get_field_verbose_name(model, field_name):
    """
    Get verbose name for a model field.
    
    Args:
        model: Django model class
        field_name (str): Name of the field
        
    Returns:
        str: Verbose name of the field, or field_name if not found
    """
    try:
        field = model._meta.get_field(field_name)
        return field.verbose_name
    except:
        return field_name


def format_json_field_value(value):
    """
    Format JSON field value for display in logs.
    For material_usage and similar JSON fields, format nicely.
    
    Args:
        value: JSON string or dict
        
    Returns:
        str: Formatted string representation
    """
    if not value:
        return '-'
    
    # If it's already a string, try to parse it
    if isinstance(value, str):
        try:
            value = json.loads(value)
        except:
            return value
    
    # If it's a dict (like material_usage), format it nicely
    if isinstance(value, dict):
        formatted_items = []
        for key, data in value.items():
            if isinstance(data, dict):
                val = data.get('val', '')
                brand = data.get('brand', '')
                text = data.get('text', '')
                soluble = data.get('Soluble_in_water', '')
                
                item_parts = []
                if val:
                    item_parts.append(f'مقدار: {val}')
                if brand:
                    item_parts.append(f'برند: {brand}')
                if text:
                    item_parts.append(f'توضیحات: {text}')
                if soluble:
                    item_parts.append(f'محلول در آب: {soluble}')
                
                if item_parts:
                    formatted_items.append(f'ماده {key}: {", ".join(item_parts)}')
            else:
                formatted_items.append(f'{key}: {data}')
        
        return ' | '.join(formatted_items) if formatted_items else str(value)
    
    return str(value)


def log_action(username, model_name, action_type, details=False):
    """
    Log a system activity.
    
    Args:
        username (str): Username of the user performing the action
        model_name (str): Name of the model being acted upon
        action_type (str): Type of action ('create', 'edit', 'delete')
        details (list): List of detail dictionaries with 'name', 'old', 'new', 'roll_number'
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