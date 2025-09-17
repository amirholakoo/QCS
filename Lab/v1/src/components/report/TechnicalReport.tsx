import React, { useState, useEffect } from 'react';
import ReactApexChart from 'react-apexcharts';
import { reportAPI } from '../../utils/api';
import type { ChartSeries, ChartApiResponse } from '../../types';

export const TechnicalReport: React.FC = () => {
  const [chartData, setChartData] = useState<ChartSeries[]>([]);
  const [topHeadboxData, setTopHeadboxData] = useState<ChartSeries[]>([]);
  const [bottomHeadboxData, setBottomHeadboxData] = useState<ChartSeries[]>([]);
  const [tensileData, setTensileData] = useState<ChartSeries[]>([]);
  const [consData, setConsData] = useState<ChartSeries[]>([]);
  const [rollNumbers, setRollNumbers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  useEffect(() => {
    fetchTechnicalReportData();
  }, [timeFilter]);

  const fetchTechnicalReportData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch the technical report data
      const chartResult: ChartApiResponse = await reportAPI.getTechnicalReportData(timeFilter);
      
      if (chartResult.success && chartResult.series) {
        // Separate data into five charts
        const paperData = chartResult.series.filter(series => 
          ['تست برست', 'گراماژ', 'رطوبت'].includes(series.name)
        );
        const topHeadboxData = chartResult.series.filter(series => 
          ['غلظت هدباکس بالا', 'فیلتر آب بالا', 'pH بالا', 'دمای خمیر بالا'].includes(series.name)
        );
        const bottomHeadboxData = chartResult.series.filter(series => 
          ['کانس خمیر پایین', 'فیلتر آب پایین', 'pH پایین', 'دمای خمیر پایین'].includes(series.name)
        );
        const tensileData = chartResult.series.filter(series => 
          ['گراماژ', 'MD', 'CD', 'غلظت هدباکس بالا × 100', 'کانس خمیر پایین × 100'].includes(series.name)
        );
        const consData = chartResult.series.filter(series => 
          ['کانس حوض ۸', 'کردان', 'تیکنر'].includes(series.name)
        );
        
        setChartData(paperData);
        setTopHeadboxData(topHeadboxData);
        setBottomHeadboxData(bottomHeadboxData);
        setTensileData(tensileData);
        setConsData(consData);
        
        if (chartResult.roll_numbers) {
          setRollNumbers(chartResult.roll_numbers);
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
        }
      }
    } catch (err) {
      console.error('Error fetching technical report data:', err);
      setError('خطا در بارگذاری داده‌های گزارش فنی');
    } finally {
      setLoading(false);
    }
  };

  const chartOptions = {
    chart: {
      fontFamily: 'IranYekan',
      type: 'line' as const,
      height: 600,
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
      width: 3,
      dashArray: [0, 0, 0] // Different dash patterns for different series
    },
    colors: ['#3B82F6', '#EF4444', '#10B981'], // Blue for burst, Red for GSM, Green for humidity
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
      min: 0,
      max: 500,
      tickAmount: 20,
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
            <div class="custom-tooltip" style="text-align: right;background: white; padding: 12px; border: 1px solid #ccc; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <div style="font-weight: bold; margin-bottom: 8px; color: #374151;">${seriesName}</div>
              <div style="color: #6B7280;">شماره رول: ${data.rollNumber}</div>
              <div style="color: #999; font-style: italic;">داده موجود نیست</div>
            </div>
          `;
        }
        
        return `
          <div class="custom-tooltip" style="text-align: right;background: white; padding: 12px; border: 1px solid #ccc; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <div style="font-weight: bold; margin-bottom: 8px; color: #374151;">${seriesName}</div>
            <div style="margin-bottom: 4px; color: #6B7280;">مقدار: <span style="font-weight: 600; color: #111827;">${data.y}</span></div>
            <div style="margin-bottom: 4px; color: #6B7280;">تاریخ: <span style="font-weight: 600; color: #111827;">${data.date || 'نامشخص'}</span></div>
            <div style="margin-bottom: 4px; color: #6B7280;">شماره رول: <span style="font-weight: 600; color: #111827;">${data.rollNumber}</span></div>
            <div style="margin-bottom: 4px; color: #6B7280;">زمان شروع نمونه‌گیری: <span style="font-weight: 600; color: #111827;">${data.samplingStartTime || 'نامشخص'}</span></div>
            <div style="color: #6B7280;">زمان پایان نمونه‌گیری: <span style="font-weight: 600; color: #111827;">${data.samplingEndTime || 'نامشخص'}</span></div>
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
      size: 5,
      hover: {
        size: 7
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

  const topHeadboxChartOptions = {
    chart: {
      fontFamily: 'IranYekan',
      type: 'line' as const,
      height: 600,
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
      width: 3,
      dashArray: [0, 0, 0, 0] // Different dash patterns for different series
    },
    colors: ['#8B5CF6', '#F59E0B', '#06B6D4', '#F97316'], // Purple, Orange, Cyan, Orange-Red
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
      min: 0,
      max: 100,
      tickAmount: 20,
      labels: {
        formatter: function(value: number) {
          return value.toFixed(1);
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
            <div class="custom-tooltip" style="text-align: right;background: white; padding: 12px; border: 1px solid #ccc; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <div style="font-weight: bold; margin-bottom: 8px; color: #374151;">${seriesName}</div>
              <div style="color: #6B7280;">شماره رول: ${data.rollNumber}</div>
              <div style="color: #999; font-style: italic;">داده موجود نیست</div>
            </div>
          `;
        }
        
        return `
          <div class="custom-tooltip" style="text-align: right;background: white; padding: 12px; border: 1px solid #ccc; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <div style="font-weight: bold; margin-bottom: 8px; color: #374151;">${seriesName}</div>
            <div style="margin-bottom: 4px; color: #6B7280;">مقدار: <span style="font-weight: 600; color: #111827;">${data.y}</span></div>
            <div style="margin-bottom: 4px; color: #6B7280;">تاریخ: <span style="font-weight: 600; color: #111827;">${data.date || 'نامشخص'}</span></div>
            <div style="margin-bottom: 4px; color: #6B7280;">شماره رول: <span style="font-weight: 600; color: #111827;">${data.rollNumber}</span></div>
            <div style="color: #6B7280;">زمان نمونه‌گیری پایین: <span style="font-weight: 600; color: #111827;">${data.lowerSamplingTime || 'نامشخص'}</span></div>
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
      size: 5,
      hover: {
        size: 7
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

  const bottomHeadboxChartOptions = {
    chart: {
      fontFamily: 'IranYekan',
      type: 'line' as const,
      height: 600,
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
      width: 3,
      dashArray: [0, 0, 0, 0] // Different dash patterns for different series
    },
    colors: ['#84CC16', '#EC4899', '#F59E0B', '#8B5CF6'], // Green, Pink, Orange, Purple
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
      min: 0,
      max: 100,
      tickAmount: 20,
      labels: {
        formatter: function(value: number) {
          return value.toFixed(1);
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
            <div class="custom-tooltip" style="text-align: right;background: white; padding: 12px; border: 1px solid #ccc; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <div style="font-weight: bold; margin-bottom: 8px; color: #374151;">${seriesName}</div>
              <div style="color: #6B7280;">شماره رول: ${data.rollNumber}</div>
              <div style="color: #999; font-style: italic;">داده موجود نیست</div>
            </div>
          `;
        }
        
        return `
          <div class="custom-tooltip" style="text-align: right;background: white; padding: 12px; border: 1px solid #ccc; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <div style="font-weight: bold; margin-bottom: 8px; color: #374151;">${seriesName}</div>
            <div style="margin-bottom: 4px; color: #6B7280;">مقدار: <span style="font-weight: 600; color: #111827;">${data.y}</span></div>
            <div style="margin-bottom: 4px; color: #6B7280;">تاریخ: <span style="font-weight: 600; color: #111827;">${data.date || 'نامشخص'}</span></div>
            <div style="margin-bottom: 4px; color: #6B7280;">شماره رول: <span style="font-weight: 600; color: #111827;">${data.rollNumber}</span></div>
            <div style="color: #6B7280;">زمان نمونه‌گیری پایین: <span style="font-weight: 600; color: #111827;">${data.lowerSamplingTime || 'نامشخص'}</span></div>
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
      size: 5,
      hover: {
        size: 7
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

  const tensileChartOptions = {
    chart: {
      fontFamily: 'IranYekan',
      type: 'line' as const,
      height: 600,
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
      width: 3,
      dashArray: [0, 0, 0, 0, 0] // Different dash patterns for different series
    },
    colors: ['#3B82F6', '#FF9800', '#8B5CF6', '#84CC16', '#F59E0B'], // Blue, Red, Purple, Green, Orange
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
      min: 0,
      max: 150,
      tickAmount: 20,
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
            <div class="custom-tooltip" style="text-align: right;background: white; padding: 12px; border: 1px solid #ccc; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <div style="font-weight: bold; margin-bottom: 8px; color: #374151;">${seriesName}</div>
              <div style="color: #6B7280;">شماره رول: ${data.rollNumber}</div>
              <div style="color: #999; font-style: italic;">داده موجود نیست</div>
            </div>
          `;
        }
        
        return `
          <div class="custom-tooltip" style="text-align: right;background: white; padding: 12px; border: 1px solid #ccc; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <div style="font-weight: bold; margin-bottom: 8px; color: #374151;">${seriesName}</div>
            <div style="margin-bottom: 4px; color: #6B7280;">مقدار: <span style="font-weight: 600; color: #111827;">${data.y}</span></div>
            <div style="margin-bottom: 4px; color: #6B7280;">تاریخ: <span style="font-weight: 600; color: #111827;">${data.date || 'نامشخص'}</span></div>
            <div style="margin-bottom: 4px; color: #6B7280;">شماره رول: <span style="font-weight: 600; color: #111827;">${data.rollNumber}</span></div>
            <div style="color: #6B7280;">زمان شروع نمونه‌گیری: <span style="font-weight: 600; color: #111827;">${data.samplingStartTime || 'نامشخص'}</span></div>
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
      size: 5,
      hover: {
        size: 7
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

  const consChartOptions = {
    chart: {
      fontFamily: 'IranYekan',
      type: 'line' as const,
      height: 600,
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
      width: 3,
      dashArray: [0, 0, 0] // Different dash patterns for different series
    },
    colors: ['#F97316', '#EC4899', '#06B6D4'], // Orange, Pink, Cyan
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
      min: 3,
      max: 4.5,
      tickAmount: 20,
      labels: {
        formatter: function(value: number) {
          return value.toFixed(1);
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
            <div class="custom-tooltip" style="text-align: right;background: white; padding: 12px; border: 1px solid #ccc; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <div style="font-weight: bold; margin-bottom: 8px; color: #374151;">${seriesName}</div>
              <div style="color: #6B7280;">شماره رول: ${data.rollNumber}</div>
              <div style="color: #999; font-style: italic;">داده موجود نیست</div>
            </div>
          `;
        }
        
        return `
          <div class="custom-tooltip" style="text-align: right;background: white; padding: 12px; border: 1px solid #ccc; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <div style="font-weight: bold; margin-bottom: 8px; color: #374151;">${seriesName}</div>
            <div style="margin-bottom: 4px; color: #6B7280;">مقدار: <span style="font-weight: 600; color: #111827;">${data.y}</span></div>
            <div style="margin-bottom: 4px; color: #6B7280;">تاریخ: <span style="font-weight: 600; color: #111827;">${data.date || 'نامشخص'}</span></div>
            <div style="margin-bottom: 4px; color: #6B7280;">شماره رول: <span style="font-weight: 600; color: #111827;">${data.rollNumber}</span></div>
            <div style="color: #6B7280;">زمان نمونه‌گیری پایین: <span style="font-weight: 600; color: #111827;">${data.lowerSamplingTime || 'نامشخص'}</span></div>
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
      size: 5,
      hover: {
        size: 7
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
          <p className="text-gray-600">در حال بارگذاری گزارش فنی...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-600 mb-4">{error}</div>
        <button
          onClick={fetchTechnicalReportData}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          تلاش مجدد
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">گزارش فنی</h2>
          <p className="text-gray-600 mt-1">نمودارهای تحلیلی داده‌های تولید کاغذ و خمیر</p>
        </div>
        <div className="flex items-center gap-4">
          {/* Time Filter Controls */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">فیلتر زمانی:</span>
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setTimeFilter('daily')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  timeFilter === 'daily'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                روزانه
              </button>
              <button
                onClick={() => setTimeFilter('weekly')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  timeFilter === 'weekly'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                هفتگی
              </button>
              <button
                onClick={() => setTimeFilter('monthly')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  timeFilter === 'monthly'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                ماهانه
              </button>
            </div>
          </div>
          <button
            onClick={fetchTechnicalReportData}
            className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            بروزرسانی
          </button>
        </div>
      </div>
      
      {/* First Chart - Paper Data */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">داده‌های کاغذ</h3>
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <ReactApexChart 
            options={chartOptions}
            series={chartData}
            type="line"
            height={600}
          />
        </div>
      </div>

      {/* Second Chart - Top Headbox Data */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Top Headbox</h3>
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <ReactApexChart 
            options={topHeadboxChartOptions}
            series={topHeadboxData}
            type="line"
            height={600}
          />
        </div>
      </div>

      {/* Third Chart - Bottom Headbox Data */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Bottom Headbox</h3>
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <ReactApexChart 
            options={bottomHeadboxChartOptions}
            series={bottomHeadboxData}
            type="line"
            height={600}
          />
        </div>
      </div>

      {/* Fourth Chart - Tensile Data */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Tensile</h3>
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <ReactApexChart 
            options={tensileChartOptions}
            series={tensileData}
            type="line"
            height={600}
          />
        </div>
      </div>

      {/* Fifth Chart - Consistency Data */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Cons</h3>
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <ReactApexChart 
            options={consChartOptions}
            series={consData}
            type="line"
            height={600}
          />
        </div>
      </div>
    </div>
  );
};
