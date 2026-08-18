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
    
    return Response({
        'user': UserSerializer(user).data,
        'message': 'ورود موفقیت‌آمیز بود'
    })


@api_view(['POST'])
def logout_view(request):
    """
    Logout current user.
    """
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
    users = User.objects.all().order_by('-created_at')
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
    return Response({
        'version': settings.version,
        'update_details': settings.update_details or ''
    })