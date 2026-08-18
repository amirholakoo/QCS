from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.models import User
from django.contrib import messages
from dashboard.views import Dashboard


def LoginView(request):
    name = request.session.pop("user_name", None)
    family = request.session.pop("user_family", None)
    if request.method == "POST":
        username = request.POST.get("user_name")
        user = User.objects.filter(username=username).first()
        if user:
            login(request, user)
            messages.success(request,f"{user.first_name if user.first_name else user.last_name} عزیز خوش آمدید")
            return redirect(Dashboard)

        messages.error(request,"این کاربر وجود ندارد")
            
    context = {
        "users": User.objects.all(),
        "user_that_already_exist": name + " " + family if name or family else None,
    }
    return render(request,"accounts/login.html",context)


def register(request):
    if request.method == "POST":
        name = request.POST.get("user_name")
        familly = request.POST.get("user_familly")
        print(name,familly)
        if (name or familly) and len(name+familly) > 2:
            print("valid username")
            if not  User.objects.filter(first_name=name).filter(last_name=familly).first():
                print("user not exist")
                user = User.objects.create_user(username=f"user-{User.objects.count()+1001}",
                                                first_name=name,
                                                last_name=familly,
                                                password=None)
                user.save()
                print("user succesfully created")
                messages.success(request,f"کابر {user.get_full_name()} با موفقیت ساخته شد")
                messages.info(request,f"لطفا وارد حساب خود شوید")
                return redirect(LoginView)
                # login(request, user)
            else:
                print("user exist")
                messages.warning(request,f"این کاربر از قبل وجود دارد لطفا وارد حساب کاربری خود شوید")
                request.session["user_name"] = name
                request.session["user_family"] = familly
                return redirect(LoginView)
                
        else:
            print("not valid username")
        # user = User.objects.create_user(username=f"user-{User.objects.count()+1001}",
        #                                 password=None)
        # user.save()
        # login(request, user)
        
    return render(request,"accounts/register.html")


@login_required
def LogOut(request):
    logout(request)
    return redirect(LoginView)