import re

def validate_email(email):
    """Simple robust regex validation for email."""
    if not email:
        return False
    pattern = r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$'
    return bool(re.match(pattern, email.strip()))

def validate_mobile(mobile):
    """Validate phone number: digits, optional leading +, length 7-15."""
    if not mobile:
        return False
    cleaned = re.sub(r'[\s\-\(\)]', '', mobile.strip())
    pattern = r'^\+?[0-9]{7,15}$'
    return bool(re.match(pattern, cleaned))

def calculate_grade(percentage):
    """
    Calculate letter grade based on percentage score:
    - >= 90: A+
    - >= 80: A
    - >= 70: B
    - >= 60: C
    - >= 40: D
    - < 40:  F
    """
    if percentage >= 90:
        return 'A+'
    elif percentage >= 80:
        return 'A'
    elif percentage >= 70:
        return 'B'
    elif percentage >= 60:
        return 'C'
    elif percentage >= 40:
        return 'D'
    else:
        return 'F'
