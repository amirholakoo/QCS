from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.models import User
from django.http import JsonResponse
import json, jdatetime
from .models import *
from production_machine.models import ProductionMachine
from material.models import Material
from brand.models import Brand
from datetime import datetime

@csrf_exempt
def AddNewPaper(request):
    if request.method == "POST":
        data = json.loads(request.body)
        try:
            if not Paper.objects.filter(RollNumber=data["Paper_Form_RollNumber"]):
                material_data = {}
                profile_detail = {}

                
                for key, value in list(data.items()):

                    if "Profile_Detail" in key:
                        profile_detail[key]=value
                        data.pop(key)
                        continue

                    if "Material_Form" in key:
                        material_data[key]=value
                        data.pop(key)
                        continue

                    if not value:
                        data.pop(key)
                        continue

                    new_key = key.replace("Paper_Form_", "")
                    data[new_key] = data.pop(key)


                jalali_date = jdatetime.datetime.strptime(
                    data["Date"],
                    "%Y-%m-%d"
                )
                data["Date"] = jalali_date.togregorian()
                data["ProductionMachine"] = ProductionMachine.objects.get(id = int(data["ProductionMachine"]))
                data["PersonName"] = User.objects.get(id=int(data["PersonName"]))
                data["PaperType"] = PaperType.objects.get(id=int(data["PaperType"]))

                for key, value in list(profile_detail.items()):
                    if not value:
                        profile_detail.pop(key)
                    else:
                        new_key = key.replace("Paper_Form_", "")
                        profile_detail[new_key] = profile_detail.pop(key)
                
                data["ProfileDetail"] = profile_detail

                new_paper=Paper.objects.create(**data)

                for key, value in material_data.items():
                    if "Material_Form_Object" in key and value:
                        material_id = int(key.replace("Material_Form_Object_",""))
                        material_target = Material.objects.get(id=material_id)
                        value = material_data[f"Material_Form_Value_{material_id}"]
                        dissolvedamount = material_data[f"Material_Form_Dissolved_Amount_{material_id}"]
                        brand_name = material_data[f"Material_Form_Brand_{material_id}"]
                        brand = Brand.objects.filter(Name=brand_name).first()
                        if not brand:
                            brand=Brand.objects.create(Name=brand_name)
                        desc =material_data[f"Material_Form_Desc_{material_id}"]

                        material_usage = MaterialUsage(Paper=new_paper,
                                                       Material=material_target,
                                                       Value=value,
                                                       DissolvedAmount=dissolvedamount,
                                                       Brand=brand,
                                                       Desc=desc)
                        material_usage.save()

                
                return JsonResponse({"status": "success","alert":f"شماره رول {data['RollNumber']} با موفقیت ثبت و اضافه شد."})
            else:
                return JsonResponse({"status": "error","alert":f"این شماره رول از قبل وجود دارد"})
        except Exception as ex:
            print(ex)
            return JsonResponse({"status": "error","alert":f"مشکلی در ایجاد فرم کاغذ پیش آمد، لطفا دوباره امتحان کنید و درصورت تکرار به پشتیبان فنی اطلاع دهید."})
    else:
        return JsonResponse(
                {
                    "status": "error",
                    "alert": "دسترسی غیرمجاز است."
                },
                status=403
            )

@csrf_exempt
def AddNewPaperType(request):
    if request.method == "POST":
        data = json.loads(request.body)
        name = data.get("PaperType_Form_Name")
        desc = data.get("PaperType_Form_Desc")
        active = data.get("PaperType_Form_Active")
        if not PaperType.objects.filter(Name__iexact=name).exists():
            new_PaperType = PaperType(Name=name,
                                      Desc=desc,
                                      Active=active)
            new_PaperType.save()
            return JsonResponse({"status": "success","alert":f"{new_PaperType.Name} با موفقیت ثبت و اضافه شد."})
        else:
            return JsonResponse({"status": "error","alert":f"{name} از قبل وجود دارد"})
    else: return JsonResponse(
        {
            "status": "error",
            "alert": "دسترسی غیرمجاز است."
        },
        status=403
    )


def GetAllPaperType(request):
    target = list(PaperType.objects.values())
    return JsonResponse(
        {"status": "success","result":target}
    )


def GetAllPaperPersonName(request):
    target = list(User.objects.values())
    return JsonResponse(
        {"status": "success","result":target}
    )


def GetAllRolls(request):

    page = int(request.GET.get("page", 1))
    last_id = request.GET.get("id")
    per_page = 20

    start = (page - 1) * per_page
    end = start + per_page

    new_result=None

    target = list(
        Paper.objects
        .order_by("-id")
        .values(
            *[f.name for f in Paper._meta.fields],
            "PaperType__Name",
            "ProductionMachine__Name",
        )[start:end]
    )
    
    shift_choices = dict(Paper.ShiftChoices)
    profile_choices = dict(Paper.ProfileChoices)
    for item in target:
        item["Date"] = jdatetime.datetime.fromgregorian(datetime=item["Date"]).strftime("%Y-%m-%d")
        item["Shift"] = shift_choices.get(item["Shift"])
        item["PaperProfile"] = profile_choices.get(item["PaperProfile"])
        item["MaterialUsage"] = list(MaterialUsage.objects.filter(Paper_id=item["id"]).values(
            *[f.name for f in MaterialUsage._meta.fields],
            "Material__Name",
        ))

    total = Paper.objects.count()
    total_pages = (total + per_page - 1) // per_page

    if page > 1 and last_id:
        last_id = int(last_id)
        print("================")
        new_target= list(Paper.objects.filter(id__gt=last_id).values(
            *[f.name for f in Paper._meta.fields],
            "PaperType__Name",
            "ProductionMachine__Name",
        ))
        for item in new_target:
            item["Date"] = jdatetime.datetime.fromgregorian(datetime=item["Date"]).strftime("%Y/%m/%d")
            item["Shift"] = shift_choices.get(item["Shift"])
            item["PaperProfile"] = profile_choices.get(item["PaperProfile"])
            item["MaterialUsage"] = list(MaterialUsage.objects.filter(Paper_id=item["id"]).values(
                *[f.name for f in MaterialUsage._meta.fields],
                "Material__Name",
            ))

            print(item["id"],len(new_target),last_id)
        target =  target + new_target

    return JsonResponse({
        "status": "success",
        "result": target,
        "new": new_result,
        "pagination": {
            "page": page,
            "per_page": per_page,
            "total": total,
            "total_pages": total_pages,
            "has_next": end < total
        }
    })

def GetRoll(request):
    roll_id = request.GET.get("roll_id")
    if roll_id:
        target = Paper.objects.filter(id=roll_id).values().first()
        target["Date"] = jdatetime.datetime.fromgregorian(datetime=target["Date"]).strftime("%Y-%m-%d")
        target["MaterialUsage"] = list(MaterialUsage.objects.filter(Paper_id=target["id"]).values(
                *[f.name for f in MaterialUsage._meta.fields],
                "Material__Name",
            ))
        if target:
            return JsonResponse({
                "status": "success",
                "result": target,
            })
        else:
            return JsonResponse({
                "status": "error",
                "alert": "این اطلاعات دیگر وجود ندارد",
            },
            status=404)
    else:
        return JsonResponse({
            "status": "error",
            "alert": "درخواست نامعتبر | هشدار نفوذ - سریعا به پشتیبان فنی اطلاع دهید",
        },
        status=403)