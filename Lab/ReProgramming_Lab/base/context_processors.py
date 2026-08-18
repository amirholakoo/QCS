from accounts.models import ProfileModel
from Support.models import SupportTicket
from django.db.models import Q
from payment.models import Wallet
from .models import VersionControl
def basicdetail(request):
    ver = VersionControl.objects.all().first()
    context={"ticket":False,
             "wallet":False,
             "version":ver.version,}
    if request.user.is_authenticated and not request.user.is_superuser:
        user = ProfileModel.objects.get(User=request.user)
        wallet = Wallet.objects.get(Profile=user)
        ticket = SupportTicket.objects.filter(Q(To=user)|Q(From=user)).order_by("-CreationDateTime")
        ticket_remove_duplicate = False
        if ticket.count():
            ticket_remove_duplicate = []
            for x in ticket:
                if ticket_remove_duplicate:
                    is_append = False
                    for y in ticket_remove_duplicate:
                        if x.Code == y.Code:
                            is_append=True
                            if is_append:
                                break
                    if not is_append:
                        ticket_remove_duplicate.append(x)
                else:
                    ticket_remove_duplicate.append(x)
        context = {
            "ticket": ticket_remove_duplicate,
            "wallet":wallet,
            "version":ver.version,
        }
    return dict(context)