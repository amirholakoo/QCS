from .views import calendar

def calendar_details(request):
    cal,curent,form,year,month = calendar(False,request)
    print("==============",curent)
    context = {
        'calendar': cal,
        'curent': curent,
    }
    return context