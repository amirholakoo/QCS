from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
import json
from .models import *
@csrf_exempt
def add_new_material(request):
    if request.method == "POST":
        data = json.loads(request.body)
        name = data.get("Material_Form_Name")
        desc = data.get("Material_Form_Desc")
        active = data.get("Material_Form_Active")
        print(name,desc,active)
        if not Material.objects.filter(Name__iexact=name).exists():
            new_material = Material(Name=name,
                                    Desc=desc,
                                    Active=active)
            new_material.save()
            return JsonResponse({"status": "success","alert":f"{new_material.Name} با موفقیت ثبت و اضافه شد."})
        else:
            return JsonResponse({"status": "error","alert":f"{name} از قبل وجود دارد"})
    else: return JsonResponse(
        {
            "status": "error",
            "alert": "دسترسی غیرمجاز است."
        },
        status=403
    )



def GetAllMaterial(request):
    target = list(Material.objects.values())
    return JsonResponse(
        {"status": "success","result":target}
    )