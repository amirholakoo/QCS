from django.db import models
import json
import jdatetime
from datetime import datetime
from zoneinfo import ZoneInfo

IRAN_TZ = ZoneInfo("Asia/Tehran")

class Sensor(models.Model):
    """Model to represent a thermal sensor device"""
    name = models.CharField(max_length=100, unique=True, help_text="Sensor name/identifier")
    api_endpoint = models.CharField(max_length=255, help_text="API endpoint URL (e.g., 172.16.1.46/data)")
    is_active = models.BooleanField(default=True, help_text="Whether this sensor is currently active")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['name']
        indexes = [
            models.Index(fields=['is_active', 'id']),  # For filtering active sensors
        ]
    
    def __str__(self):
        return f"{self.name} ({self.api_endpoint})"
    
    def get_configuration(self):
        """Get or create the configuration for this sensor"""
        config, created = ProbeConfiguration.objects.get_or_create(
            sensor=self,
            defaults={
                'active_formula': '-0.3771*temp+26.63',
                'probes_data': {},
                'probe_count': 0,
                'checked_probes': [],
                'humidity_threshold': 7.0,
                'edge_threshold': 5.0,
                'auto_edge_detection': True,
                'find_edge_by_threshold': True,
                'edge_data': {}
            }
        )
        return config

class ProbeConfiguration(models.Model):
    """Model to store probe configuration (positions and active formula)"""
    sensor = models.ForeignKey(Sensor, on_delete=models.CASCADE, related_name='configurations', null=True, blank=True, help_text="Associated sensor")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    active_formula = models.TextField()
    temperature = models.FloatField(default=0,blank=True,null=True)
    humidity = models.FloatField(default=0,blank=True,null=True)
    probe_count = models.IntegerField(default=0)
    probes_data = models.JSONField(default=dict)
    checked_probes = models.JSONField(default=list)
    humidity_threshold = models.FloatField(default=7)
    roll_number = models.IntegerField(null=True, blank=True, default=0)
    edge_threshold = models.FloatField(default=5)
    auto_edge_detection = models.BooleanField(default=True)
    # If True: use threshold algorithm; If False: use manual edge_data positions
    find_edge_by_threshold = models.BooleanField(default=True)
    # Edge detection data: {"start_col": int, "end_col": int, "row": int, "is_detected": bool}
    edge_data = models.JSONField(default=dict, blank=True)
    class Meta:
        ordering = ['-updated_at']
        indexes = [
            models.Index(fields=['sensor', '-updated_at']),  # For sensor config lookups
        ]
    
    def __str__(self):
        return f"ProbeConfig {self.updated_at} - {self.probe_count} probes"
    
    def save(self, *args, **kwargs):
        # Timestamps are automatically set by auto_now_add and auto_now
        super().save(*args, **kwargs)
    
    def get_created_at_jalali(self):
        """Convert stored timestamp to Jalali format"""
        try:
            if self.created_at:
                if self.created_at.tzinfo is None:
                    dt = self.created_at.replace(tzinfo=IRAN_TZ)
                else:
                    dt = self.created_at.astimezone(IRAN_TZ)
                jalali_dt = jdatetime.datetime.fromgregorian(datetime=dt)
                return jalali_dt.strftime('%Y/%m/%d %H:%M:%S')
            return str(self.created_at)
        except Exception:
            return str(self.created_at)
    
    def get_updated_at_jalali(self):
        """Convert stored timestamp to Jalali format"""
        try:
            if self.updated_at:
                if self.updated_at.tzinfo is None:
                    dt = self.updated_at.replace(tzinfo=IRAN_TZ)
                else:
                    dt = self.updated_at.astimezone(IRAN_TZ)
                jalali_dt = jdatetime.datetime.fromgregorian(datetime=dt)
                return jalali_dt.strftime('%Y/%m/%d %H:%M:%S')
            return str(self.updated_at)
        except Exception:
            return str(self.updated_at)
    
    def get_probes_data(self):
        """Get probes data as Python dict"""
        return self.probes_data if isinstance(self.probes_data, dict) else json.loads(self.probes_data)
    
    def set_probes_data(self, data):
        """Set probes data from Python dict"""
        self.probes_data = data
        self.probe_count = len(data)
    
    def get_checked_probes(self):
        """Get checked probes as Python list"""
        if isinstance(self.checked_probes, list):
            return self.checked_probes
        elif isinstance(self.checked_probes, str):
            return json.loads(self.checked_probes)
        return []
    
    def set_checked_probes(self, probe_ids):
        """Set checked probes from Python list"""
        if isinstance(probe_ids, list):
            self.checked_probes = probe_ids
        else:
            self.checked_probes = list(probe_ids) if probe_ids else []
    
    def calculate_checked_probes_average(self):
        """Calculate average for checked probes and add to probes_data"""
        if not self.probes_data or not self.checked_probes:
            return None
        
        total_temp = 0
        total_humidity = 0
        valid_probes = 0
        
        for probe_id in self.checked_probes:
            probe_key = f"probe{probe_id}"
            if probe_key in self.probes_data:
                probe_data = self.probes_data[probe_key]
                if 'temperature' in probe_data and 'humidity' in probe_data:
                    total_temp += probe_data['temperature']
                    total_humidity += probe_data['humidity']
                    valid_probes += 1
        
        if valid_probes > 0:
            avg_temp = total_temp / valid_probes
            avg_humidity = total_humidity / valid_probes
            
            # Add average data to probes_data
            self.probes_data[f'avg{min(self.checked_probes)}-{max(self.checked_probes)}'] = {
                'temperature': round(avg_temp, 2),
                'humidity': round(avg_humidity, 2),
                'checked_probes': self.checked_probes,
                'formula': self.active_formula
            }
            
            return {
                'temperature': round(avg_temp, 2),
                'humidity': round(avg_humidity, 2),
                'checked_probes': self.checked_probes
            }
        
        return None

class ProbeData(models.Model):
    sensor = models.ForeignKey(Sensor, on_delete=models.CASCADE, related_name='probe_data', null=True, blank=True, help_text="Associated sensor")
    timestamp = models.DateTimeField(auto_now_add=True)  # Store formatted timestamp
    humidity = models.FloatField()
    temperature = models.FloatField()
    active_formula = models.TextField()
    probe_count = models.IntegerField()
    roll_number = models.IntegerField(null=True, blank=True, default=None)
    probes_data = models.JSONField()  # Store all probe data as JSON
    
    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['sensor', '-timestamp']),  # For sensor data queries
            models.Index(fields=['timestamp']),  # For time-based filtering
        ]
    
    def __str__(self):
        return f"ProbeData {self.timestamp} - {self.probe_count} probes"
    
    def save(self, *args, **kwargs):
        # Timestamp is automatically set by auto_now_add=True
        super().save(*args, **kwargs)
    
    def get_jalali_date(self):
        """Convert stored timestamp to Jalali format"""
        try:
            if self.timestamp:
                if self.timestamp.tzinfo is None:
                    dt = self.timestamp.replace(tzinfo=IRAN_TZ)
                else:
                    dt = self.timestamp.astimezone(IRAN_TZ)
                jalali_dt = jdatetime.datetime.fromgregorian(datetime=dt)
                return jalali_dt.strftime('%Y/%m/%d %H:%M:%S')
            return str(self.timestamp)
        except Exception:
            return str(self.timestamp)
    
    def get_probes_data(self):
        """Get probes data as Python dict"""
        return self.probes_data if isinstance(self.probes_data, dict) else json.loads(self.probes_data)
    
    def set_probes_data(self, data):
        """Set probes data from Python dict"""
        self.probes_data = data