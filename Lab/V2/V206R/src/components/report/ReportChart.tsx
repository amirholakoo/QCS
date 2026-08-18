import React, { useState, useEffect } from 'react';
import ReactApexChart from 'react-apexcharts';
import { reportAPI } from '../../utils/api';
import type { ChartSeries, ChartApiResponse } from '../../types';

export const ReportChart: React.FC = () => {
  const [chartData, setChartData] = useState<ChartSeries[]>([]);
  const [rollNumbers, setRollNumbers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchChartData();
  }, []);

  const fetchChartData = async () => {
    try {
      setLoading(true);
      setError(null);

      // First, process new data from paper and pulp models
      const processResult = await reportAPI.processChartData();
      console.log('Data processing result:', processResult);

      // Then fetch the chart data
      const chartResult: ChartApiResponse = await reportAPI.getChartData();
      
      if (chartResult.success && chartResult.series) {
        setChartData(chartResult.series);
        // Use roll_numbers from the API response which are already sorted numerically
        if (chartResult.roll_numbers) {
          setRollNumbers(chartResult.roll_numbers);
          console.log('Roll numbers from API:', chartResult.roll_numbers);
        } else {
          // Fallback: extract roll numbers from series data
          const extractedRollNumbers: string[] = [];
          for (const series of chartResult.series) {
            for (const data of series.data) {
              if (data.rollNumber && !extractedRollNumbers.includes(data.rollNumber)) {
                extractedRollNumbers.push(data.rollNumber);
              }
            }
          }
          // Sort numerically
          extractedRollNumbers.sort((a, b) => {
            const numA = parseInt(a);
            const numB = parseInt(b);
            if (!isNaN(numA) && !isNaN(numB)) {
              return numA - numB;
            }
            return a.localeCompare(b);
          });
          setRollNumbers(extractedRollNumbers);
          console.log('Extracted roll numbers:', extractedRollNumbers);
        }
      } else {
        // Fallback to test data if no real data available
        console.log('No real data available, using test data');
        //const testData = generateTestData();
        //setChartData(testData);
      }
    } catch (err) {
      console.error('Error fetching chart data:', err);
      setError('خطا در بارگذاری داده‌ها');
      // Fallback to test data on error
      //const testData = generateTestData();
      //setChartData(testData);
    } finally {
      setLoading(false);
    }
  };


  /*
  const processDataForChart = (paperData: Paper[], pulpData: Pulp[]): ChartSeries[] => {
    // This function is currently unused as we're getting data from the backend API
    // It's kept here for potential future use
    return [];
  };
  */

  const chartOptions = {
    chart: {
      fontFamily: 'IranYekan',
      type: 'line' as const,
      height: 700,
      zoom: {
        enabled: false
      },
      toolbar: {
        show: false
      },
      animations: {
        enabled: true,
        easing: 'easeinout',
        speed: 400
      },
      redrawOnWindowResize: true,
      redrawOnParentResize: true,
    },
    stroke: {
      curve: 'smooth' as const,
      connectNulls: true,
      width: 2,
      dashArray: [0, 0, 0, 0, 0, 0, 0, 0, 0] // Different dash patterns for different series
    },
    colors: ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#06B6D4', '#F97316', '#84CC16', '#EC4899'],
    xaxis: {
      type: 'category' as const,
      categories: rollNumbers,
      title: {
        text: 'شماره رول',
        style: {
          fontSize: '14px',
          fontWeight: 600
        }
      },
      labels: {
        rotate: -70,
        style: {
          fontSize: '12px'
        }
      }
    },
    yaxis: {
      min: 100,
      max: 400,
      tickAmount: 15, // This will create steps of 25 (350/25 = 14)
      labels: {
        formatter: function(value: number) {
          return value.toFixed(0);
        }
      },
      title: {
        text: 'مقدار',
        style: {
          fontSize: '14px',
          fontWeight: 600
        }
      }
    },
    tooltip: {
      enabled: true,
      shared: false,
      intersect: true,
      custom: function({ seriesIndex, dataPointIndex, w }: any) {
        const data = w.globals.initialSeries[seriesIndex].data[dataPointIndex];
        const seriesName = w.globals.seriesNames[seriesIndex];
        
        // Handle null values in tooltip
        if (data.y === null || data.y === undefined) {
          return `
            <div class="custom-tooltip" style="text-align: right;background: white; padding: 10px; border: 1px solid #ccc; border-radius: 5px;">
              <div style="font-weight: bold; margin-bottom: 5px;">${seriesName}</div>
              <div>شماره رول: ${data.rollNumber}</div>
              <div style="color: #999;">داده موجود نیست</div>
            </div>
          `;
        }
        
        return `
          <div class="custom-tooltip" style="text-align: right;background: white; padding: 10px; border: 1px solid #ccc; border-radius: 5px;">
            <div style="font-weight: bold; margin-bottom: 5px;">${seriesName}</div>
            <div>تاریخ: ${data.date || 'نامشخص'}</div>
            <div>مقدار: ${data.y}</div>
            <div>شماره رول: ${data.rollNumber}</div>
            <div>زمان نمونه‌گیری: ${data.samplingTime}</div>
          </div>
        `;
      }
    },
    legend: {
      position: 'top' as const,
      horizontalAlign: 'right' as const,
      labels: {
        colors: '#374151'
      }
    },
    grid: {
      borderColor: '#E5E7EB',
      strokeDashArray: 1,
      padding: {
        top: 10,
        right: 10,
        bottom: 10,
        left: 10
      }
    },
    markers: {
      size: 4,
      hover: {
        size: 6
      },
      fillOpacity: 1,
      strokeWidth: 2
    },
    dataLabels: {
      enabled: false
    },
    states: {
      hover: {
        filter: {
          type: 'lighten',
          value: 0.1
        }
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">در حال بارگذاری نمودار...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-600 mb-4">{error}</div>
        <button
          onClick={fetchChartData}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          تلاش مجدد
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">نمودار داده‌های تولید</h3>
        <button
          onClick={fetchChartData}
          className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          بروزرسانی
        </button>
      </div>
      
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <ReactApexChart 
          options={chartOptions}
          series={chartData}
          type="line"
          height={700}
        />
      </div>
    </div>
  );
};
