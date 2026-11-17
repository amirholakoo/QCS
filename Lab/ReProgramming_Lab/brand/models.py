from django.db import models

class Brand(models.Model):
    Name = models.CharField(max_length=155,verbose_name="نام ماشین")
    Desc = models.CharField(max_length=255,verbose_name="توضیحات",blank=True,null=True)
    Active = models.BooleanField(default=True)
    Delete = models.BooleanField(default=False, verbose_name='حذف نمایشی')
    CreationDateTime = models.DateTimeField(auto_now_add=True,verbose_name="زمان ساخت",null=True,blank=True,db_index=True)
    LastUpdate = models.DateTimeField(auto_now=True,verbose_name="آخرین آپدیت",null=True,blank=True)

    def __str__(self):
        return self.Name
