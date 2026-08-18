"""
Models for QC (Quality Control) app - quality control records and related data.
"""
from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator, MaxValueValidator
import json

User = get_user_model()


class Customer(models.Model):
    """
    Customer information for QC records.
    """
    name_family = models.CharField(max_length=200, verbose_name='نام و نام خانوادگی')
    national_code = models.CharField(max_length=20, verbose_name='کد ملی')
    phone_number = models.CharField(max_length=20, verbose_name='شماره تلفن')
    address = models.CharField(max_length=300, verbose_name='آدرس')
    postal_code = models.CharField(max_length=20, verbose_name='کد پستی')
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='تاریخ ایجاد')
    last_updated = models.DateTimeField(auto_now=True, verbose_name='آخرین بروزرسانی')
    
    class Meta:
        verbose_name = 'مشتری'
        verbose_name_plural = 'مشتریان'
        ordering = ['-created_at']
    
    def __str__(self):
        return self.name_family


class Loading(models.Model):
    """
    Loading specifications for QC records.
    """
    grammage = models.FloatField(verbose_name='گراماژ')
    width = models.FloatField(verbose_name='عرض')
    humidity = models.FloatField(verbose_name='رطوبت')
    burst = models.FloatField(verbose_name='burst',null=True, blank=True)
    cub = models.FloatField(verbose_name='کاب',null=True, blank=True)
    md = models.FloatField(verbose_name='MD',null=True, blank=True)  # Machine Direction
    cd = models.FloatField(verbose_name='CD',null=True, blank=True)  # Cross Direction
    ash = models.FloatField(verbose_name='خاکستر (Ash)', null=True, blank=True)  # Ash content
    custom = models.BooleanField(verbose_name='سفارشی', default=False)  # Custom fields flag
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='تاریخ ایجاد')
    last_updated = models.DateTimeField(auto_now=True, verbose_name='آخرین بروزرسانی')
    
    class Meta:
        verbose_name = 'مشخصات بارگیری'
        verbose_name_plural = 'مشخصات بارگیری‌ها'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Loading - گراماژ: {self.grammage}, عرض: {self.width}"


class QCRecord(models.Model):
    """
    Quality Control record that combines paper rolls, customer info, and loading specs.
    """
    # Many-to-many relationship with Paper records (user can select multiple papers)
    rollnumbers = models.ManyToManyField(
        'paper.Paper', 
        verbose_name='شماره رول‌ها',
        related_name='qc_records',
        help_text='رکوردهای کاغذ انتخاب شده برای این کنترل کیفی'
    )
    customer_id = models.ForeignKey(
        Customer, 
        on_delete=models.CASCADE, 
        verbose_name='مشتری'
    )
    loading_id = models.ForeignKey(
        Loading, 
        on_delete=models.CASCADE, 
        verbose_name='مشخصات بارگیری'
    )
    
    # User who created this QC record
    user = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name='کاربر')
    
    # Custom paper fields that user chose for printing (stored as JSON list of field names)
    custom_items = models.JSONField(
        default=list, 
        verbose_name='فیلدهای سفارشی انتخاب شده',
        help_text='لیست نام فیلدهای کاغذ که کاربر برای چاپ انتخاب کرده'
    )
    
    # Column order for print table (stored as JSON list of field names in user's preferred order)
    column_order = models.JSONField(
        default=list,
        null=True,
        blank=True,
        verbose_name='ترتیب ستون‌های جدول چاپ',
        help_text='ترتیب ستون‌های جدول چاپ که کاربر تنظیم کرده است'
    )
    
    # Number of printed versions requested
    print_count = models.PositiveIntegerField(
        default=1, 
        verbose_name='تعداد چاپ',
        validators=[MinValueValidator(1)]
    )
    
    # Status tracking
    STATUS_CHOICES = [
        ('draft', 'پیش‌نویس'),
        ('completed', 'تکمیل شده'),
        ('printed', 'چاپ شده'),
    ]
    status = models.CharField(
        max_length=20, 
        choices=STATUS_CHOICES, 
        default='draft',
        verbose_name='وضعیت'
    )
    
    # Timestamps
    create_time = models.DateTimeField(auto_now_add=True, verbose_name='زمان ایجاد')
    last_update = models.DateTimeField(auto_now=True, verbose_name='آخرین بروزرسانی')
    
    class Meta:
        verbose_name = 'رکورد کنترل کیفی'
        verbose_name_plural = 'رکوردهای کنترل کیفی'
        ordering = ['-create_time']
    
    def __str__(self):
        roll_count = self.rollnumbers.count()
        if roll_count == 1:
            roll_info = self.rollnumbers.first().roll_number
        else:
            roll_info = f"{roll_count} رول"
        return f"QC-{self.id} - {roll_info} - {self.customer_id.name_family}"
    
    def get_custom_fields_display(self):
        """
        Get display names for custom fields in Persian, with combined fields support.
        """
        field_mapping = {
            'real_grammage': 'GMS',
            'humidity': 'moisture',
            'ash_percentage': 'خاکستر (Ash)',
            'cub': 'کاب',
            'burst_test': 'burst',
            'tensile_strength_md': 'MD',
            'tensile_strength_cd': 'CD',
            'paper_size': 'width',
            'shift': 'شیفت',
            'machine_speed': 'speed',
            'calender_applied': 'کلندر',
            'NumberOfTears': 'Break',
            'profile': 'profile',
            'density_valve': 'شیر چگالی',
            'diluting_valve': 'شیر رقیق‌ساز',
            'cct1': 'CCT 1',
            'cct2': 'CCT 2',
            'cct3': 'CCT 3',
            'cct4': 'CCT 4',
            'cct5': 'CCT 5',
            'rct1': 'RCT 1',
            'rct2': 'RCT 2',
            'rct3': 'RCT 3',
            'rct4': 'RCT 4',
            'rct5': 'RCT 5',
            'rct1-5': 'RCT 1-5',  # Combined field
            'cct1-5': 'CCT 1-5',  # Combined field
            'tearing_time': 'زمان پارگی',
        }
        
        # Get processed fields (with combinations)
        processed_fields = self._process_combined_fields()
        
        return [field_mapping.get(field_info['field_name'], field_info['field_name']) 
                for field_info in processed_fields]
    
    def get_custom_table_data(self):
        """
        Get custom table data considering custom field mapping.
        If loading.custom is True, replace table data (custom fields) with loading data.
        Also combines RCT1-5 and CCT1-5 fields into single cells.
        """
        # Get roll numbers and their custom field data
        papers = self.rollnumbers.all()
        roll_data = []
        
        # Process custom fields to combine RCT and CCT fields
        processed_fields = self._process_combined_fields()
        
        for paper in papers:
            paper_data = {
                'roll_number': paper.roll_number,
                'custom_fields': {}
            }
            
            # Get values for each processed field
            for field_info in processed_fields:
                field_name = field_info['field_name']
                is_combined = field_info.get('is_combined', False)
                combined_fields = field_info.get('combined_fields', [])
                
                if is_combined:
                    # Handle combined fields (RCT1-5, CCT1-5)
                    values = []
                    for sub_field in combined_fields:
                        if self.loading_id.custom:
                            # In custom mode, we don't have loading equivalents for RCT/CCT
                            # so use real data
                            value = getattr(paper, sub_field, None)
                        else:
                            # Normal mode: use real data
                            value = getattr(paper, sub_field, None)
                        
                        values.append(str(value) if value is not None else 'N/A')
                    
                    paper_data['custom_fields'][field_name] = ','.join(values)
                else:
                    # Handle regular fields
                    if self.loading_id.custom:
                        # Custom mode: replace custom field values with loading data
                        loading_field_mapping = {
                            'real_grammage': self.loading_id.grammage,  # GMS <- grammage
                            'humidity': self.loading_id.humidity,        # moisture <- humidity  
                            'paper_size': self.loading_id.width,        # width <- width
                            'cub': self.loading_id.cub,                # cub <- cub
                            'burst_test': self.loading_id.burst,        # burst <- burst
                            'tensile_strength_md': self.loading_id.md,  # MD <- md
                            'tensile_strength_cd': self.loading_id.cd,  # CD <- cd
                            'ash_percentage': self.loading_id.ash,      # ash <- ash
                        }
                        
                        if field_name in loading_field_mapping:
                            # Use loading data for this field
                            paper_data['custom_fields'][field_name] = loading_field_mapping[field_name]
                        else:
                            # Field not in mapping: replace with "-"
                            paper_data['custom_fields'][field_name] = '-'
                    else:
                        # Normal mode: use real custom field values
                        field_value = getattr(paper, field_name, None)
                        paper_data['custom_fields'][field_name] = field_value
            
            roll_data.append(paper_data)
        
        return roll_data
    
    def _process_combined_fields(self):
        """
        Process custom fields to combine RCT1-5 and CCT1-5 into single fields.
        """
        processed_fields = []
        rct_fields = []
        cct_fields = []
        other_fields = []
        
        # Separate RCT, CCT, and other fields
        for field_name in self.custom_items:
            if field_name.startswith('rct') and field_name[3:].isdigit():
                rct_fields.append(field_name)
            elif field_name.startswith('cct') and field_name[3:].isdigit():
                cct_fields.append(field_name)
            else:
                other_fields.append(field_name)
        
        # Add combined RCT field if any RCT fields are present
        if rct_fields:
            # Sort RCT fields (rct1, rct2, rct3, rct4, rct5)
            rct_fields.sort(key=lambda x: int(x[3:]))
            processed_fields.append({
                'field_name': 'rct1-5',
                'is_combined': True,
                'combined_fields': rct_fields
            })
        
        # Add combined CCT field if any CCT fields are present
        if cct_fields:
            # Sort CCT fields (cct1, cct2, cct3, cct4, cct5)
            cct_fields.sort(key=lambda x: int(x[3:]))
            processed_fields.append({
                'field_name': 'cct1-5',
                'is_combined': True,
                'combined_fields': cct_fields
            })
        
        # Add other fields as regular fields
        for field_name in other_fields:
            processed_fields.append({
                'field_name': field_name,
                'is_combined': False
            })
        
        return processed_fields
    
    def get_roll_numbers_list(self):
        """
        Get list of roll numbers for this QC record.
        """
        return list(self.rollnumbers.values_list('roll_number', flat=True))
    
    def get_roll_numbers_display(self):
        """
        Get formatted string of roll numbers for display.
        """
        roll_numbers = self.get_roll_numbers_list()
        if len(roll_numbers) <= 3:
            return ', '.join(roll_numbers)
        else:
            return f"{', '.join(roll_numbers[:3])} و {len(roll_numbers) - 3} رول دیگر"
