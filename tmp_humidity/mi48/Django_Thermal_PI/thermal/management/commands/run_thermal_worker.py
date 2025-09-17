from django.core.management.base import BaseCommand
from thermal.views import auto_save_probe_data
import time
import os
from django.conf import settings


class Command(BaseCommand):
    help = 'Run the thermal worker to continuously save probe data'

    def add_arguments(self, parser):
        parser.add_argument(
            '--interval',
            type=int,
            default=5,
            help='Interval in seconds between probe data saves (default: 5)'
        )

    def handle(self, *args, **options):
        interval = options['interval']
        self.stdout.write(
            self.style.SUCCESS(f'Starting thermal worker with {interval}s interval...')
        )
        
        try:
            while True:
                # Check if thermal map file exists
                thermal_map_path = os.path.join(settings.BASE_DIR, 'static', 'thermal_map.txt')
                if os.path.exists(thermal_map_path):
                    # Auto-save probe data
                    auto_save_probe_data()
                    self.stdout.write('Probe data auto-saved')
                else:
                    self.stdout.write('No thermal map file found, skipping...')
                
                # Wait for next interval
                time.sleep(interval)
                
        except KeyboardInterrupt:
            self.stdout.write(
                self.style.WARNING('\nThermal worker stopped by user')
            )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error in thermal worker: {e}')
            )
