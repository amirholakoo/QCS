from django.core.management.base import BaseCommand
from report.views import process_paper_data, process_pulp_data


class Command(BaseCommand):
    help = 'Process paper and pulp data into chart data'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing chart data before processing',
        )

    def handle(self, *args, **options):
        if options['clear']:
            from report.models import ChartData
            count = ChartData.objects.count()
            ChartData.objects.all().delete()
            self.stdout.write(
                self.style.SUCCESS(f'Cleared {count} existing chart data points')
            )

        self.stdout.write('Processing paper data...')
        paper_count = process_paper_data()
        self.stdout.write(
            self.style.SUCCESS(f'Processed {paper_count} paper data points')
        )

        self.stdout.write('Processing pulp data...')
        pulp_count = process_pulp_data()
        self.stdout.write(
            self.style.SUCCESS(f'Processed {pulp_count} pulp data points')
        )

        total_count = paper_count + pulp_count
        self.stdout.write(
            self.style.SUCCESS(f'Total: {total_count} chart data points created')
        )
