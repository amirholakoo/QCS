from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
import json
from .models import *
@csrf_exempt
def add_new_brand(request):
    if request.method == "POST":
        data = json.loads(request.body)
        name = data.get("Brand_Form_Name")
        desc = data.get("Brand_Form_Desc")
        active = data.get("Brand_Form_Active")
        print(name,desc,active)
        if not Brand.objects.filter(Name__iexact=name).exists():
            new_brand = Brand(Name=name,
                                                      Desc=desc,
                                                      Active=active)
            new_brand.save()
            return JsonResponse({"status": "success","alert":f"{new_brand.Name} با موفقیت ثبت و اضافه شد."})
        else:
            return JsonResponse({"status": "error","alert":f"{name} از قبل وجود دارد"})
    else: return JsonResponse(
        {
            "status": "error",
            "alert": "دسترسی غیرمجاز است."
        },
        status=403
    )


def GetAllBrand(request):
    target = list(Brand.objects.values())
    return JsonResponse(
        {"status": "success","result":target}
    )