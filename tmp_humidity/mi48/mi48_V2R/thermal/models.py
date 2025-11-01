from django.db import models
import json
import jdatetime
from datetime import datetime
from zoneinfo import ZoneInfo

IRAN_TZ = ZoneInfo("Asia/Tehran")

class ProbeConfiguration(models.Model):
    """Model to store probe configuration (positions and active formula)"""
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    active_formula = models.TextField()
    probe_count = models.IntegerField(default=0)
    probes_data = models.JSONField(default=dict)  # Store probe positions and metadata
    checked_probes = models.JSONField(default=list)  # Store list of checked probe IDs like [1,2,3,4,5]
    
    class Meta:
        ordering = ['-updated_at']
    
    def __str__(self):
        return f"ProbeConfig {self.updated_at} - {self.probe_count} probes"
    
    def save(self, *args, **kwargs):
        # Timestamps are automatically set by auto_now_add and auto_now
        super().save(*args, **kwargs)
    
    def get_created_at_jalali(self):
        """Convert stored timestamp to Jalali format"""
        try:
            # Convert Django timezone-aware datetime to Jalali
            if self.created_at:
                # Convert to Iran timezone if needed
                if self.created_at.tzinfo is None:
                    # If naive, assume it's in Iran timezone
                    dt = IRAN_TZ.localize(self.created_at)
                else:
                    # If timezone-aware, convert to Iran timezone
                    dt = self.created_at.astimezone(IRAN_TZ)
                
                # Convert to Jalali
                jalali_dt = jdatetime.datetime.fromgregorian(datetime=dt)
                return jalali_dt.strftime('%Y/%m/%d %H:%M:%S')
            return str(self.created_at)
        except Exception as e:
            return str(self.created_at)
    
    def get_updated_at_jalali(self):
        """Convert stored timestamp to Jalali format"""
        try:
            # Convert Django timezone-aware datetime to Jalali
            if self.updated_at:
                # Convert to Iran timezone if needed
                if self.updated_at.tzinfo is None:
                    # If naive, assume it's in Iran timezone
                    dt = self.updated_at.astimezone(IRAN_TZ)
                else:
                    # If timezone-aware, convert to Iran timezone
                    dt = self.updated_at.astimezone(IRAN_TZ)
                
                # Convert to Jalali
                jalali_dt = jdatetime.datetime.fromgregorian(datetime=dt)
                return jalali_dt.strftime('%Y/%m/%d %H:%M:%S')
            return str(self.updated_at)
        except Exception as e:
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
    timestamp = models.DateTimeField(auto_now_add=True)  # Store formatted timestamp
    humidity = models.FloatField()
    temperature = models.FloatField()
    active_formula = models.TextField()
    probe_count = models.IntegerField()
    probes_data = models.JSONField()  # Store all probe data as JSON
    
    class Meta:
        ordering = ['-timestamp']
    
    def __str__(self):
        return f"ProbeData {self.timestamp} - {self.probe_count} probes"
    
    def save(self, *args, **kwargs):
        # Timestamp is automatically set by auto_now_add=True
        super().save(*args, **kwargs)
    
    def get_jalali_date(self):
        """Convert stored timestamp to Jalali format"""
        try:
            # Convert Django timezone-aware datetime to Jalali
            if self.timestamp:
                # Convert to Iran timezone if needed
                if self.timestamp.tzinfo is None:
                    # If naive, assume it's in Iran timezone
                    dt = IRAN_TZ.localize(self.timestamp)
                else:
                    # If timezone-aware, convert to Iran timezone
                    dt = self.timestamp.astimezone(IRAN_TZ)
                
                # Convert to Jalali
                jalali_dt = jdatetime.datetime.fromgregorian(datetime=dt)
                return jalali_dt.strftime('%Y/%m/%d %H:%M:%S')
            return str(self.timestamp)
        except Exception as e:
            return str(self.timestamp)
    
    def get_probes_data(self):
        """Get probes data as Python dict"""
        return self.probes_data if isinstance(self.probes_data, dict) else json.loads(self.probes_data)
    
    def set_probes_data(self, data):
        """Set probes data from Python dict"""
        self.probes_data = data