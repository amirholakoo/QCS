"""
Views for account app - simple authentication system.
"""
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.contrib.auth import login, logout, get_user_model
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from .serializers import UserSerializer, LoginSerializer
from .models import SystemSettings
import logging
from django.conf import settings
# Import LogEntry for activity logging (optional - wrapped in try/except to avoid hard dependency)
logger = logging.getLogger(__name__)
try:
    from logs.models import LogEntry
except Exception:
    LogEntry = None

User = get_user_model()


@api_view(['POST'])
@permission_classes([AllowAny])
@csrf_exempt
def login_or_register(request):
    """
    Login or register user based on first_name and last_name.
    If user exists, login. If not, create new user and login.
    """
    serializer = LoginSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(
            {'error': serializer.errors}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    first_name = serializer.validated_data.get('first_name', '').strip()
    last_name = serializer.validated_data.get('last_name', '').strip()
    
    # First, try to find existing user by first_name and last_name
    # If both names are empty, skip lookup and create new user
    try:
        if first_name or last_name:
            # Handle case where multiple users exist with same name
            existing_users = User.objects.filter(
                first_name__iexact=first_name,
                last_name__iexact=last_name
            )
            
            if existing_users.exists():
                # If multiple users exist, use the first one (most recently created)
                user = existing_users.order_by('-created_at').first()
                print(f"Found existing user: {user.username} ({user.first_name} {user.last_name})")
            else:
                raise User.DoesNotExist
        else:
            # Both names are empty - create new user (can't find by empty names)
            raise User.DoesNotExist
            
    except User.DoesNotExist:
        # User doesn't exist, create new one
        print(f"Creating new user: {first_name} {last_name}")
        
        # Generate unique username for new user
        # Handle case where both names are empty
        first_clean = first_name.lower().replace(' ', '') if first_name else ''
        last_clean = last_name.lower().replace(' ', '') if last_name else ''
        
        if first_clean or last_clean:
            base_username = f"{first_clean}_{last_clean}".strip('_')
        else:
            # If no name provided, use default pattern
            base_username = "user"
        
        username = base_username
        counter = 1
        
        # Ensure username uniqueness
        while User.objects.filter(username=username).exists():
            username = f"{base_username}_{counter}"
            counter += 1
        
        # Create new user
        user = User.objects.create(
            first_name=first_name or '',
            last_name=last_name or '',
            username=username
        )
        print(f"Created new user: {user.username}")
    
    # Login user
    login(request, user)
    request.session.save()
    # Log the login action (if LogEntry model is available)
    try:
        if LogEntry is not None:
            LogEntry.objects.create(
                username=user.username or f"{user.first_name} {user.last_name}".strip() or 'unknown',
                model_name='Auth',
                action_type='login',
                details={'user_id': user.id, 'first_name': user.first_name, 'last_name': user.last_name}
            )
    except Exception:
        # Don't prevent login if logging fails
        pass
    
    return Response({
        'user': UserSerializer(user).data,
        'message': 'ورود موفقیت‌آمیز بود'
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def logout_view(request):
    """
    Logout current user.
    """
    # Capture username before logout
    try:
        username = request.user.username if request.user and request.user.is_authenticated else None
    except Exception:
        username = None

    # Log the logout action (if LogEntry model is available)
    try:
        if LogEntry is not None:
            LogEntry.objects.create(
                username=username or 'anonymous',
                model_name='Auth',
                action_type='logout',
                details={'message': 'user logged out'}
            )
    except Exception:
        pass

    logout(request)
    return Response({'message': 'خروج موفقیت‌آمیز بود'})


@api_view(['GET'])
@permission_classes([AllowAny])
def current_user(request):
    """
    Get current authenticated user.
    """
    if request.user.is_authenticated:
        return Response({
            'user': UserSerializer(request.user).data
        })
    return Response(
        {'user': None}, 
        status=status.HTTP_200_OK
    )


@api_view(['GET'])
@permission_classes([AllowAny])
def list_users(request):
    """
    List all existing users for login suggestions.
    """
    users = User.objects.all().filter(is_active=True).order_by('-created_at')
    return Response({
        'users': UserSerializer(users, many=True).data
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def get_system_version(request):
    """
    Get current system version and update details.
    """
    settings = SystemSettings.get_settings()
    response = Response({
        "version": settings.version,
        "update_details": settings.update_details or "",
    })

    response["X-Django-Test"] = "YES"
    return response


@api_view(['GET'])
@permission_classes([AllowAny])
def get_updating_status(request):
    """Return maintenance/updating flag, timer seconds and message for client."""
    settings = SystemSettings.get_settings()
    return Response({
        'is_updating': settings.is_updating,
        'timer_seconds': settings.updating_timer_seconds,
        'message': settings.updating_message or ''
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def get_permissions(request):
    """
    Return a simple map of model permissions for the current user.
    """
    user = request.user
    target_models = {
        'paper': ('paper', 'paper'),
        'material': ('material', 'material'),
        'pulp': ('pulp', 'pulp'),
        'paper_type': ('paper_type', 'papertype'),
        'qc': ('qc', 'qcrecord'),
        'speed': ('speed', 'speed'),
        'production_machine': ('paper', 'productionmachine'),
        'customer': ('qc', 'customer'),
    }

    perms = {}
    for key, (app_label, model_name) in target_models.items():
        if user.is_authenticated:
            perms[key] = {
                'view': user.has_perm(f"{app_label}.view_{model_name}"),
                'add': user.has_perm(f"{app_label}.add_{model_name}"),
                'change': user.has_perm(f"{app_label}.change_{model_name}"),
                'delete': user.has_perm(f"{app_label}.delete_{model_name}"),
            }
        else:
            perms[key] = {'view': False, 'add': False, 'change': False, 'delete': False}

    return Response({'permissions': perms})