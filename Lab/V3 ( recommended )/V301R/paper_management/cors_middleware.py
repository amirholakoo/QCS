"""
Universal CORS middleware for handling all cross-origin requests
This middleware ensures CORS headers are added to ALL responses
"""

class UniversalCORSMiddleware:
    """
    Middleware to add CORS headers to all responses for development.
    This is a fallback to ensure no CORS issues occur.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        
        # Add CORS headers to all responses
        origin = request.META.get('HTTP_ORIGIN')
        
        # Allow all origins
        response['Access-Control-Allow-Origin'] = origin or '*'
        response['Access-Control-Allow-Credentials'] = 'true'
        response['Access-Control-Allow-Methods'] = 'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD'
        response['Access-Control-Allow-Headers'] = (
            'accept, accept-encoding, accept-language, authorization, '
            'cache-control, content-disposition, content-encoding, '
            'content-language, content-type, dnt, origin, pragma, '
            'referer, user-agent, x-csrftoken, x-forwarded-for, '
            'x-forwarded-proto, x-requested-with, x-real-ip, '
            'access-control-allow-private-network, '
            'access-control-request-headers, access-control-request-method'
        )
        response['Access-Control-Expose-Headers'] = (
            'access-control-allow-origin, access-control-allow-credentials, '
            'access-control-allow-headers, access-control-allow-methods, '
            'access-control-expose-headers, access-control-max-age, '
            'content-type, x-csrftoken'
        )
        response['Access-Control-Max-Age'] = '86400'
        
        # Handle private network requests
        if request.META.get('HTTP_ACCESS_CONTROL_REQUEST_PRIVATE_NETWORK'):
            response['Access-Control-Allow-Private-Network'] = 'true'
        
        # Handle preflight requests
        if request.method == 'OPTIONS':
            response.status_code = 200
            response['Content-Length'] = '0'
        
        return response

    def process_view(self, request, view_func, view_args, view_kwargs):
        # Handle preflight requests immediately
        if request.method == 'OPTIONS':
            from django.http import HttpResponse
            response = HttpResponse()
            response.status_code = 200
            response['Content-Length'] = '0'
            return response
        return None

