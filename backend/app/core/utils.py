"""
Utility functions
"""
import re
import unicodedata
from sqlalchemy.orm import Session


def slugify(text: str) -> str:
    """
    Convert text to URL-safe slug
    
    Examples:
        "John Doe" -> "john-doe"
        "José María" -> "jose-maria"
        "Hello World!!!" -> "hello-world"
    
    Args:
        text: Text to convert to slug
        
    Returns:
        URL-safe slug string
    """
    # Convert to lowercase
    text = text.lower()
    
    # Normalize unicode characters (é -> e, ñ -> n, etc.)
    text = unicodedata.normalize('NFKD', text)
    text = text.encode('ascii', 'ignore').decode('ascii')
    
    # Replace spaces and non-alphanumeric characters with hyphens
    text = re.sub(r'[^a-z0-9]+', '-', text)
    
    # Remove leading/trailing hyphens
    text = text.strip('-')
    
    # Replace multiple consecutive hyphens with single hyphen
    text = re.sub(r'-+', '-', text)
    
    return text


def generate_user_slug(name: str, db: Session, exclude_id: int = None) -> str:
    """
    Generate unique user profile slug from name
    
    Format: {name-slug} or {name-slug-2}, {name-slug-3}, etc.
    Example: "john-doe" or "john-doe-2"
    
    Args:
        name: User's name
        db: Database session
        exclude_id: User ID to exclude from uniqueness check (for updates)
        
    Returns:
        Unique slug without exposing user ID
    """
    from app.models.user import User
    
    base_slug = slugify(name)
    slug = base_slug
    counter = 2
    
    # Check if slug exists, append counter if needed
    while True:
        query = db.query(User).filter(User.slug == slug)
        if exclude_id:
            query = query.filter(User.id != exclude_id)
        
        if not query.first():
            return slug
        
        slug = f"{base_slug}-{counter}"
        counter += 1


def parse_user_slug(slug: str) -> str:
    """
    Parse user slug - now just returns the slug as-is since we query by slug field
    
    Args:
        slug: Profile slug (e.g., "john-doe" or "john-doe-2" or "123" for backwards compatibility)
        
    Returns:
        The slug string to query against User.slug or User.id
    """
    return slug
