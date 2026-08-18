"""
Custom pagination classes for the API.
"""
from rest_framework.pagination import PageNumberPagination


class CustomPageNumberPagination(PageNumberPagination):
    """
    Custom pagination class that allows clients to set page size.
    """
    page_size = 50  # Default page size
    page_size_query_param = 'page_size'  # Allow client to override with ?page_size=X
    max_page_size = 10000  # Maximum allowed page size for 'show all'

