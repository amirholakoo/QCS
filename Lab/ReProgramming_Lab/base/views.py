from django.shortcuts import render, redirect
from django.contrib import messages
from django.contrib.auth.decorators import login_required
import random,time, json, requests, os, base64
from django.http import JsonResponse

def SendApi(is_post=True,url="",header={},params={},body={}):
    error=False
    try:
        if is_post:
            response=requests.post(url, headers=header, data=params)
        else:
            response=requests.get(url, headers=header, data=params)
    except Exception as ex:
        error=ex
    
    return {"error":error,"result":response.text}


def Index(request):
    return render(request,"base/index.html")

