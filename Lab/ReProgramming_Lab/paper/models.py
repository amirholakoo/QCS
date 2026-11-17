from django.db import models
from django.contrib.auth.models import User

class PaperType(models.Model):
    Name = models.CharField(max_length=155,verbose_name="نام")
    Desc = models.CharField(max_length=255,verbose_name="توضیحات",blank=True,null=True)
    Active = models.BooleanField(default=True)
    Delete = models.BooleanField(default=False, verbose_name='حذف نمایشی')
    CreationDateTime = models.DateTimeField(auto_now_add=True,verbose_name="زمان ساخت",null=True,blank=True,db_index=True)
    LastUpdate = models.DateTimeField(auto_now=True,verbose_name="آخرین آپدیت",null=True,blank=True)

    def __str__(self):
        return self.Name


class Paper(models.Model):

    # ======= Base Information ======
    Date = models.DateTimeField(verbose_name="تاریخ",db_index=True)
    RollStartTime = models.CharField(max_length=10,verbose_name="زمان شروع رول")
    RollEndTime = models.CharField(max_length=10,verbose_name="زمان پایان رول")
    ProductionMachine = models.ForeignKey("production_machine.ProductionMachine",on_delete=models.PROTECT,verbose_name="ماشین تولید")
    RollNumber = models.CharField(max_length=10,verbose_name="شماره رول")
    PersonName = models.ForeignKey(User,on_delete=models.PROTECT,verbose_name="نام مسئول")
    ShiftChoices = ((2,"شب"),(1,"روز"))
    Shift = models.IntegerField(choices=ShiftChoices,verbose_name="شیفت")

    # ======= Paper Information ======
    PaperType = models.ForeignKey("paper.PaperType",on_delete=models.PROTECT,verbose_name="نوع کاغذ")
    Width = models.IntegerField(verbose_name="عرض کاغذ")
    Grammage = models.FloatField(verbose_name="گرماژ",blank=True,null=True)
    Moisture = models.FloatField(verbose_name="رطوبت",blank=True,null=True)
    Ash = models.FloatField(verbose_name="ash",blank=True,null=True)
    Cobb = models.FloatField(verbose_name="Cobb",blank=True,null=True)
    ProfileChoices = ((1,"-1g+"),
                      (2,"-2g+"),
                      (3,"-3g+"),
                      (4,"-4g+"),
                      (5,"بیشتر از 5 گرم نوسان سر تا سر کاغذ"),)
    PaperProfile = models.IntegerField(choices=ProfileChoices,verbose_name="پروفایل کاغذ",blank=True,null=True)

    # ====== Paper Profile Detail ======
    ProfileDetail = models.JSONField(verbose_name="جزئیات پروفایل",blank=True,null=True)

    # ====== Density Settings ======
    Density1 = models.FloatField(verbose_name="غلظت سنج 1 ( حوض 8 )",blank=True,null=True)
    Diluent1 = models.FloatField(verbose_name="رقیق کننده غلظت سنج 1 ( حوض 8 )",blank=True,null=True)
    Density2 = models.FloatField(verbose_name="غلظت سنج 2",blank=True,null=True)
    Diluent2 = models.FloatField(verbose_name="رقیق کننده غلظت سنج 2",blank=True,null=True)
    Density3 = models.FloatField(verbose_name="غلظت سنج 3",blank=True,null=True)
    Diluent3 = models.FloatField(verbose_name="رقیق کننده غلظت سنج 3",blank=True,null=True)
    Density4 = models.FloatField(verbose_name="غلظت سنج 4",blank=True,null=True)
    Diluent4 = models.FloatField(verbose_name="رقیق کننده غلظت سنج 4",blank=True,null=True)
    Density5 = models.FloatField(verbose_name="غلظت سنج 5",blank=True,null=True)
    Diluent5 = models.FloatField(verbose_name="رقیق کننده غلظت سنج 5",blank=True,null=True)


    # ====== Production Machine Setting ======
    LowerHeadboxStockValve = models.FloatField(verbose_name="شیر خمیر هدباکس پایین",blank=True,null=True)
    UpperHeadboxStockValve = models.FloatField(verbose_name="شیر خمیر هدباکس بالا",blank=True,null=True)
    MainDryer1And2Temp = models.FloatField(verbose_name="دمای اصلی خشک کن 1 و 2",blank=True,null=True)
    MainDryer3Temp = models.FloatField(verbose_name="دمای اصلی خشک کن 3",blank=True,null=True)
    PaperTempBeforeSizePress = models.FloatField(verbose_name="دمای کاغذ قبل از ورود به سایز پرس",blank=True,null=True)
    StarchTempBeforeSizePress = models.FloatField(verbose_name="دمای نشساسته قبل از ورود به سایز پرس",blank=True,null=True)
    PaperTempBeforeDryer3 = models.FloatField(verbose_name="دمای کاغذ قبل از ورود به خشک کن سه",blank=True,null=True)
    Dryer3FirstCylinderTemp = models.FloatField(verbose_name="دمای سیلندر اول خشک کن 3",blank=True,null=True)
    PaperTempBeforePopeReel = models.FloatField(verbose_name="دمای کاغذ قبل از پوپ ریل",blank=True,null=True)

    # ====== Strength Tests ======
    Burst = models.CharField(max_length=255,blank=True,null=True)
    MD = models.CharField(max_length=25,blank=True,null=True)
    CD = models.CharField(max_length=25,blank=True,null=True)
    CCT1 = models.CharField(max_length=25,blank=True,null=True)
    CCT2 = models.CharField(max_length=25,blank=True,null=True)
    CCT3 = models.CharField(max_length=25,blank=True,null=True)
    CCT4 = models.CharField(max_length=25,blank=True,null=True)
    CCT5 = models.CharField(max_length=25,blank=True,null=True)
    RCT1 = models.CharField(max_length=25,blank=True,null=True)
    RCT2 = models.CharField(max_length=25,blank=True,null=True)
    RCT3 = models.CharField(max_length=25,blank=True,null=True)
    RCT4 = models.CharField(max_length=25,blank=True,null=True)
    RCT5 = models.CharField(max_length=25,blank=True,null=True)

    # ====== Production Deatil ======
    BreakCount = models.IntegerField(verbose_name="تعداد پارگی",blank=True,null=True)
    BreakTime = models.CharField(max_length=25,verbose_name="زمان پارگی",blank=True,null=True)
    ProductionDowntime = models.IntegerField(verbose_name="زمان توقف ماشین",blank=True,null=True)
    BreakCause = models.CharField(max_length=255,verbose_name="علت پارگی",blank=True,null=True)
    CalenderApplied = models.BooleanField(default=False,verbose_name="کلندر اعمال شده؟")
    MachineSpeed = models.IntegerField(verbose_name="سرعت ماشین",blank=True,null=True)

    Active = models.BooleanField(default=True)
    Delete = models.BooleanField(default=False, verbose_name='حذف نمایشی')
    CreationDateTime = models.DateTimeField(auto_now_add=True,verbose_name="زمان ساخت",null=True,blank=True,db_index=True)
    LastUpdate = models.DateTimeField(auto_now=True,verbose_name="آخرین آپدیت",null=True,blank=True)


class MaterialUsage(models.Model):
    Paper = models.ForeignKey("paper",on_delete=models.PROTECT)
    Material = models.ForeignKey("material.Material",on_delete=models.PROTECT)
    Value = models.FloatField(blank=True,null=True,verbose_name="مقدار")
    DissolvedAmount = models.FloatField(blank=True,null=True,verbose_name="محلول در آب")
    Brand = models.ForeignKey("brand.Brand",on_delete=models.PROTECT,blank=True,null=True)
    Desc = models.CharField(max_length=255,verbose_name="توضیحات",blank=True,null=True)

    Active = models.BooleanField(default=True)
    Delete = models.BooleanField(default=False, verbose_name='حذف نمایشی')
    CreationDateTime = models.DateTimeField(auto_now_add=True,verbose_name="زمان ساخت",null=True,blank=True,db_index=True)
    LastUpdate = models.DateTimeField(auto_now=True,verbose_name="آخرین آپدیت",null=True,blank=True)
    

