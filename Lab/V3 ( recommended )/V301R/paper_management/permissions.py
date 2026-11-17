import logging

from rest_framework.permissions import DjangoModelPermissions

logger = logging.getLogger(__name__)


class DjangoModelPermissionsWithView(DjangoModelPermissions):

    perms_map = {
        'GET': ['%(app_label)s.view_%(model_name)s'],
        'OPTIONS': [],
        'HEAD': [],
        'POST': ['%(app_label)s.add_%(model_name)s'],
        'PUT': ['%(app_label)s.change_%(model_name)s'],
        'PATCH': ['%(app_label)s.change_%(model_name)s'],
        'DELETE': ['%(app_label)s.delete_%(model_name)s'],
    }

    def has_permission(self, request, view):

        try:
            required = self.get_required_permissions(
                request.method,
                view.queryset.model
            )
        except Exception as e:
            logger.warning(f"PERM_ERROR={e}")
            raise

        result = super().has_permission(request, view)

        logger.warning(
            f"""
            PATH={request.path}
            USER={request.user}
            AUTH={request.user.is_authenticated}
            COOKIES={request.COOKIES}
            SESSION_KEY={request.session.session_key}
            SESSION_DATA={dict(request.session)}
            HEADERS={dict(request.headers)}
            """
        )

        return result