from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
import json
from .models import *
@csrf_exempt
def add_new_ProductionMachine(request):
    if request.method == "POST":
        data = json.loads(request.body)
        name = data.get("ProductionMachine_Form_Name")
        desc = data.get("ProductionMachine_Form_Desc")
        active = data.get("ProductionMachine_Form_Active")
        print(name,desc,active)
        if not ProductionMachine.objects.filter(Name__iexact=name).exists():
            new_ProductionMachine = ProductionMachine(Name=name,
                                                      Desc=desc,
                                                      Active=active)
            new_ProductionMachine.save()
            return JsonResponse({"status": "success","alert":f"{new_ProductionMachine.Name} با موفقیت ثبت و اضافه شد."})
        else:
            return JsonResponse({"status": "error","alert":f"{name} از قبل وجود دارد"})
    else: return JsonResponse(
        {
            "status": "error",
            "alert": "دسترسی غیرمجاز است."
        },
        status=403
    )


def GetAllProductionMachine(request):
    target = list(ProductionMachine.objects.values())
    return JsonResponse(
        {"status": "success","result":target}
    )