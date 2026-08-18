import React, { useState, useEffect, useMemo, useCallback } from 'react';
import ReactApexChart from 'react-apexcharts';
import { reportAPI } from '../../utils/api';
import type { ChartSeries, ChartApiResponse, ChartDataPoint } from '../../types';

// Memoized chart component for better performance
const MemoizedChart = React.memo(ReactApexChart);

// Performance optimization constants
const CHART_DATA_LIMIT = 10000; // Limit data points per chart for better performance

export const TechnicalReport: React.FC = () => {
  const [chartData, setChartData] = useState<ChartSeries[]>([]);
  const [topHeadboxData, setTopHeadboxData] = useState<ChartSeries[]>([]);
  const [bottomHeadboxData, setBottomHeadboxData] = useState<ChartSeries[]>([]);
  const [tensileData, setTensileData] = useState<ChartSeries[]>([]);
  const [consData, setConsData] = useState<ChartSeries[]>([]);
  const [paperRollNumbers, setPaperRollNumbers] = useState<string[]>([]);
  const [topHeadboxRollNumbers, setTopHeadboxRollNumbers] = useState<string[]>([]);
  const [bottomHeadboxRollNumbers, setBottomHeadboxRollNumbers] = useState<string[]>([]);
  const [tensileRollNumbers, setTensileRollNumbers] = useState<string[]>([]);
  const [consRollNumbers, setConsRollNumbers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  useEffect(() => {
    fetchTechnicalReportData();
  }, [timeFilter]);

  // Helper function to extract roll numbers with actual data
  const extractRollNumbersWithData = (seriesData: ChartSeries[]) => {
    const rollNumbersSet = new Set<string>();
    
    seriesData.forEach(series => {
      series.data.forEach(point => {
        if (point.rollNumber && (point.y !== null && point.y !== undefined)) {
          rollNumbersSet.add(point.rollNumber);
        }
      });
    });
    
    const rollNumbers = Array.from(rollNumbersSet);
    // Sort numerically
    rollNumbers.sort((a, b) => {
      const numA = parseInt(a);
      const numB = parseInt(b);
      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
      }
      return a.localeCompare(b);
    });
    
    return rollNumbers;
  };

  // Helper function to align series data to a unified roll number sequence
  // This ensures all series in a chart have data points at the same roll numbers
  const alignSeriesToRollNumbers = (seriesData: ChartSeries[], rollNumbers: string[]): ChartSeries[] => {
    // Create a map for quick lookup: rollNumber -> data point for each series
    const seriesMaps = seriesData.map(series => {
      const map = new Map<string, ChartDataPoint & { [key: string]: any }>();
      series.data.forEach(point => {
        if (point.rollNumber) {
          map.set(point.rollNumber, point as ChartDataPoint & { [key: string]: any });
        }
      });
      return { series, map };
    });

    // For each series, create aligned data array
    return seriesMaps.map(({ series, map }) => {
      const alignedData = rollNumbers.map(rollNumber => {
        const existingPoint = map.get(rollNumber);
        if (existingPoint) {
          return existingPoint;
        }
        // Create null data point for missing roll number
        // Preserve all optional properties that might be used in tooltips
        const samplePoint = series.data[0] || {};
        return {
          x: rollNumber,
          y: null,
          rollNumber: rollNumber,
          samplingTime: '',
          date: '',
          type: samplePoint.type || 'paper',
          // Include optional properties that might be in the data
          samplingStartTime: '',
          samplingEndTime: '',
          lowerSamplingTime: ''
        };
      });

      return {
        ...series,
        data: alignedData
      };
    });
  };

  // Helper function to create tooltip formatter for Paper chart
  const createPaperTooltipFormatter = () => {
    return function(val: number | number[], opts: any) {
      if (typeof val === 'undefined' || val === null) return '';
      
      const seriesIndex = opts.seriesIndex;
      const dataPointIndex = opts.dataPointIndex;
      const w = opts.w;
      const data = w.globals.initialSeries[seriesIndex].data[dataPointIndex];
      const seriesName = w.globals.seriesNames[seriesIndex];
      
      if (data.y === null || data.y === undefined) {
        return `<span class="font-bold font-size-14 bg-gray-100 text-center w-full block">${seriesName}</span><br>داده موجود نیست<br>شماره رول: ${data.rollNumber || ''}`;
      }
      
      const value = Array.isArray(val) ? val[0] : val;
      return `<span class="font-bold font-size-14 bg-gray-100 text-center w-full block">${seriesName}</span><br>مقدار: ${value.toFixed(2)}<br>تاریخ: ${data.date || 'نامشخص'}<br>زمان شروع نمونه‌گیری: ${data.samplingStartTime || 'نامشخص'}<br>زمان پایان نمونه‌گیری: ${data.samplingEndTime || 'نامشخص'}<br>شماره رول: ${data.rollNumber || ''}`;
    };
  };

  // Helper function to create tooltip formatter for Headbox charts
  const createHeadboxTooltipFormatter = () => {
    return function(val: number | number[], opts: any) {
      if (typeof val === 'undefined' || val === null) return '';
      
      const seriesIndex = opts.seriesIndex;
      const dataPointIndex = opts.dataPointIndex;
      const w = opts.w;
      const data = w.globals.initialSeries[seriesIndex].data[dataPointIndex];
      const seriesName = w.globals.seriesNames[seriesIndex];
      
      if (data.y === null || data.y === undefined) {
        return `<span class="font-bold font-size-14 bg-gray-100 text-center w-full block">${seriesName}</span><br>داده موجود نیست<br>شماره رول: ${data.rollNumber || ''}`;
      }
      
      const value = Array.isArray(val) ? val[0] : val;
      return `<span class="font-bold font-size-14 bg-gray-100 text-center w-full block">${seriesName}</span><br>مقدار: ${value.toFixed(2)}<br>تاریخ: ${data.date || 'نامشخص'}<br>شماره رول: ${data.rollNumber || ''}<br>زمان نمونه‌گیری پایین: ${data.lowerSamplingTime || 'نامشخص'}`;
    };
  };

  // Helper function to create tooltip formatter for Tensile chart
  const createTensileTooltipFormatter = () => {
    return function(val: number | number[], opts: any) {
      if (typeof val === 'undefined' || val === null) return '';
      
      const seriesIndex = opts.seriesIndex;
      const dataPointIndex = opts.dataPointIndex;
      const w = opts.w;
      const data = w.globals.initialSeries[seriesIndex].data[dataPointIndex];
      const seriesName = w.globals.seriesNames[seriesIndex];
      
      if (data.y === null || data.y === undefined) {
        return `<span class="font-bold font-size-14 bg-gray-100 text-center w-full block">${seriesName}</span><br>داده موجود نیست<br>شماره رول: ${data.rollNumber || ''}`;
      }
      
      const value = Array.isArray(val) ? val[0] : val;
      return `<span class="font-bold font-size-14 bg-gray-100 text-center w-full block">${seriesName}</span><br>مقدار: ${value.toFixed(2)}<br>تاریخ: ${data.date || 'نامشخص'}<br>شماره رول: ${data.rollNumber || ''}<br>زمان شروع نمونه‌گیری: ${data.samplingStartTime || 'نامشخص'}`;
    };
  };

  // Helper function to create tooltip formatter for Cons chart
  const createConsTooltipFormatter = () => {
    return function(val: number | number[], opts: any) {
      if (typeof val === 'undefined' || val === null) return '';
      
      const seriesIndex = opts.seriesIndex;
      const dataPointIndex = opts.dataPointIndex;
      const w = opts.w;
      const data = w.globals.initialSeries[seriesIndex].data[dataPointIndex];
      const seriesName = w.globals.seriesNames[seriesIndex];
      
      if (data.y === null || data.y === undefined) {
        return `<span class="font-bold font-size-14 bg-gray-100 text-center w-full block">${seriesName}</span><br>داده موجود نیست<br>شماره رول: ${data.rollNumber || ''}`;
      }
      
      const value = Array.isArray(val) ? val[0] : val;
      return `<span class="font-bold font-size-14 bg-gray-100 text-center w-full block">${seriesName}</span><br>مقدار: ${value.toFixed(2)}<br>تاریخ: ${data.date || 'نامشخص'}<br>شماره رول: ${data.rollNumber || ''}<br>زمان نمونه‌گیری پایین: ${data.lowerSamplingTime || 'نامشخص'}`;
    };
  };

  // Helper function to create optimized labels (show every nth label for better readability)
  const createOptimizedLabels = (rollNumbers: string[], customSkipCount?: number): { [key: string]: string } => {
    if (rollNumbers.length === 0) return {};
    
    // Calculate dynamic skip count based on data length for optimal readability
    let skipCount = customSkipCount || 4;
    
    if (rollNumbers.length > 50) {
      skipCount = Math.max(4, Math.floor(rollNumbers.length / 12)); // Show ~12 labels max
    } else if (rollNumbers.length > 20) {
      skipCount = 3;
    } else if (rollNumbers.length > 10) {
      skipCount = 2;
    } else {
      skipCount = 1; // Show all labels for small datasets
    }
    
    // Create a map of all roll numbers to their optimized labels
    const labelMap: { [key: string]: string } = {};
    
    rollNumbers.forEach((rollNumber, index) => {
      // Show label every 'skipCount' items, or if it's the first/last item
      if (index % skipCount === 0 || index === 0 || index === rollNumbers.length - 1) {
        labelMap[rollNumber] = rollNumber;
      } else {
        labelMap[rollNumber] = ''; // Empty string for hidden labels
      }
    });
    
    return labelMap;
  };

  // Helper function to filter series data to only include points with actual data
  const filterSeriesData = useCallback((seriesData: ChartSeries[], allowedRollNumbers: string[]) => {
    return seriesData.map(series => ({
      ...series,
      data: series.data.filter(point => 
        point.rollNumber && 
        allowedRollNumbers.includes(point.rollNumber) &&
        point.y !== null && 
        point.y !== undefined
      ).slice(0, CHART_DATA_LIMIT) // Limit data points for performance
    })).filter(series => series.data.length > 0);
  }, []);

  // Helper function to paginate data for better performance
  const paginateData = useCallback((data: ChartSeries[], limit: number = CHART_DATA_LIMIT) => {
    return data.map(series => ({
      ...series,
      data: series.data.slice(0, limit)
    }));
  }, []);

  const fetchTechnicalReportData = useCallback(async () => {
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
        
        // For monthly reports, use all roll numbers with pagination
        // For weekly/daily reports, extract roll numbers with actual data for each chart separately
        if (timeFilter === 'monthly' && chartResult.roll_numbers) {
          setPaperRollNumbers(chartResult.roll_numbers);
          setTopHeadboxRollNumbers(chartResult.roll_numbers);
          setBottomHeadboxRollNumbers(chartResult.roll_numbers);
          setTensileRollNumbers(chartResult.roll_numbers);
          setConsRollNumbers(chartResult.roll_numbers);
          
          // Apply pagination to monthly data for better performance
          setChartData(paginateData(paperData));
          setTopHeadboxData(paginateData(topHeadboxData));
          setBottomHeadboxData(paginateData(bottomHeadboxData));
          setTensileData(paginateData(tensileData));
          setConsData(paginateData(consData));
        } else {
          // For daily/weekly reports: Extract all roll numbers and align all series to unified sequence
          // Extract roll numbers with actual data for each chart separately
          const paperRolls = extractRollNumbersWithData(paperData);
          const topHeadboxRolls = extractRollNumbersWithData(topHeadboxData);
          const bottomHeadboxRolls = extractRollNumbersWithData(bottomHeadboxData);
          const tensileRolls = extractRollNumbersWithData(tensileData);
          const consRolls = extractRollNumbersWithData(consData);
          
          setPaperRollNumbers(paperRolls);
          setTopHeadboxRollNumbers(topHeadboxRolls);
          setBottomHeadboxRollNumbers(bottomHeadboxRolls);
          setTensileRollNumbers(tensileRolls);
          setConsRollNumbers(consRolls);
          
          // Align all series to unified roll number sequence (fills gaps with null values)
          setChartData(alignSeriesToRollNumbers(paperData, paperRolls));
          setTopHeadboxData(alignSeriesToRollNumbers(topHeadboxData, topHeadboxRolls));
          setBottomHeadboxData(alignSeriesToRollNumbers(bottomHeadboxData, bottomHeadboxRolls));
          setTensileData(alignSeriesToRollNumbers(tensileData, tensileRolls));
          setConsData(alignSeriesToRollNumbers(consData, consRolls));
        }
      }
    } catch (err) {
      console.error('Error fetching technical report data:', err);
      setError('خطا در بارگذاری داده‌های گزارش فنی');
    } finally {
      setLoading(false);
    }
  }, [timeFilter, filterSeriesData, paginateData]);

  // Debounced refresh function to prevent excessive API calls
  const debouncedRefresh = useCallback(() => {
    const timeoutId = setTimeout(() => {
      fetchTechnicalReportData();
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [fetchTechnicalReportData]);


  // Memoized chart options for Paper Data chart with performance optimizations
  const chartOptions = useMemo(() => ({
    chart: {
      fontFamily: 'IranYekan',
      type: 'area' as const,
      height: 600,
      zoom: {
        enabled: false
      },
      toolbar: {
        show: false
      },
      animations: {
        enabled: false, // Disabled for faster rendering
        easing: 'easeinout',
        speed: 400
      },
      redrawOnWindowResize: false, // Disabled for better performance
      redrawOnParentResize: false,
    },
    stroke: {
      curve: 'smooth' as const,
      connectNulls: true,
      width: 2, // Reduced for better performance
      dashArray: [0, 0, 0] // Different dash patterns for different series
    },
    fill: {
      type: 'gradient',
      gradient: {
        shade: 'light',
        type: 'vertical',
        shadeIntensity: 0.2,
        gradientToColors: ['#93C5FD', '#FCA5A5', '#6EE7B7'], // Lighter versions of colors
        inverseColors: false,
        opacityFrom: 0.3,
        opacityTo: 0.0,
        stops: [0, 90, 100]
      }
    },
    colors: ['#3B82F6', '#EF4444', '#10B981'], // Blue for burst, Red for GSM, Green for humidity
    xaxis: {
      type: 'category' as const,
      categories: paperRollNumbers,
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
        },
        formatter: function(value: string) {
          // Use optimized labels - dynamically show labels for better readability
          const labelMap = createOptimizedLabels(paperRollNumbers);
          return labelMap[value] || '';
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
      shared: true,
      intersect: false,
      y: {
        formatter: createPaperTooltipFormatter()
      },
      style: {
        fontSize: '14px',
        fontFamily: 'IranYekan',
        color: '#000',
      },
      marker: {
        show: true,
      },
      theme: 'light',
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
      size: 3,
      strokeWidth: 1,
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
  }), [paperRollNumbers]);

  // Memoized chart options for Top Headbox chart with performance optimizations
  const topHeadboxChartOptions = useMemo(() => ({
    chart: {
      fontFamily: 'IranYekan',
      type: 'area' as const,
      height: 600,
      zoom: {
        enabled: false
      },
      toolbar: {
        show: false
      },
      animations: {
        enabled: false, // Disabled for faster rendering
        easing: 'easeinout',
        speed: 400
      },
      redrawOnWindowResize: false, // Disabled for better performance
      redrawOnParentResize: false,
    },
    stroke: {
      curve: 'smooth' as const,
      connectNulls: true,
      width: 2, // Reduced for better performance
      dashArray: [0, 0, 0, 0] // Different dash patterns for different series
    },
    fill: {
      type: 'gradient',
      gradient: {
        shade: 'light',
        type: 'vertical',
        shadeIntensity: 0.2,
        gradientToColors: ['#C4B5FD', '#FCD34D', '#67E8F9', '#FDBA74'], // Lighter versions of colors
        inverseColors: false,
        opacityFrom: 0.3,
        opacityTo: 0.0,
        stops: [0, 90, 100]
      }
    },
    colors: ['#8B5CF6', '#F59E0B', '#06B6D4', '#F97316'], // Purple, Orange, Cyan, Orange-Red
    xaxis: {
      type: 'category' as const,
      categories: topHeadboxRollNumbers,
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
        },
        formatter: function(value: string) {
          // Use optimized labels - dynamically show labels for better readability
          const labelMap = createOptimizedLabels(topHeadboxRollNumbers);
          return labelMap[value] || '';
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
      shared: true,
      intersect: false,
      y: {
        formatter: createHeadboxTooltipFormatter()
      },
      style: {
        fontSize: '14px',
        fontFamily: 'IranYekan',
        color: '#000',
      },
      marker: {
        show: true,
      },
      theme: 'light',
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
      size: 3,
      strokeWidth: 1,
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
  }), [topHeadboxRollNumbers]);

  const bottomHeadboxChartOptions = {
    chart: {
      fontFamily: 'IranYekan',
      type: 'area' as const,
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
      width: 2,
      dashArray: [0, 0, 0, 0] // Different dash patterns for different series
    },
    fill: {
      type: 'gradient',
      gradient: {
        shade: 'light',
        type: 'vertical',
        shadeIntensity: 0.2,
        gradientToColors: ['#BEF264', '#F9A8D4', '#FCD34D', '#C4B5FD'], // Lighter versions of colors
        inverseColors: false,
        opacityFrom: 0.3,
        opacityTo: 0.0,
        stops: [0, 90, 100]
      }
    },
    colors: ['#84CC16', '#EC4899', '#F59E0B', '#8B5CF6'], // Green, Pink, Orange, Purple
    xaxis: {
      type: 'category' as const,
      categories: bottomHeadboxRollNumbers,
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
        },
        formatter: function(value: string) {
          // Use optimized labels - dynamically show labels for better readability
          const labelMap = createOptimizedLabels(bottomHeadboxRollNumbers);
          return labelMap[value] || '';
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
      shared: true,
      intersect: false,
      y: {
        formatter: createHeadboxTooltipFormatter()
      },
      style: {
        fontSize: '14px',
        fontFamily: 'IranYekan',
        color: '#000',
      },
      marker: {
        show: true,
      },
      theme: 'light',
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
      size: 3,
      strokeWidth: 1,
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
      type: 'area' as const,
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
      width: 2,
      dashArray: [0, 0, 0, 0, 0] // Different dash patterns for different series
    },
    fill: {
      type: 'gradient',
      gradient: {
        shade: 'light',
        type: 'vertical',
        shadeIntensity: 0.2,
        gradientToColors: ['#93C5FD', '#FFB74D', '#C4B5FD', '#BEF264', '#FCD34D'], // Lighter versions of colors
        inverseColors: false,
        opacityFrom: 0.3,
        opacityTo: 0.0,
        stops: [0, 90, 100]
      }
    },
    colors: ['#3B82F6', '#FF9800', '#8B5CF6', '#84CC16', '#F59E0B'], // Blue, Red, Purple, Green, Orange
    xaxis: {
      type: 'category' as const,
      categories: tensileRollNumbers,
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
        },
        formatter: function(value: string) {
          // Use optimized labels - dynamically show labels for better readability
          const labelMap = createOptimizedLabels(tensileRollNumbers);
          return labelMap[value] || '';
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
      shared: true,
      intersect: false,
      y: {
        formatter: createTensileTooltipFormatter()
      },
      style: {
        fontSize: '14px',
        fontFamily: 'IranYekan',
        color: '#000',
      },
      marker: {
        show: true,
      },
      theme: 'light',
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
      size: 3,
      strokeWidth: 1,
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
      type: 'area' as const,
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
      width: 2,
      dashArray: [0, 0, 0] // Different dash patterns for different series
    },
    fill: {
      type: 'gradient',
      gradient: {
        shade: 'light',
        type: 'vertical',
        shadeIntensity: 0.2,
        gradientToColors: ['#FDBA74', '#F9A8D4', '#67E8F9'], // Lighter versions of colors
        inverseColors: false,
        opacityFrom: 0.3,
        opacityTo: 0.0,
        stops: [0, 90, 100]
      }
    },
    colors: ['#F97316', '#EC4899', '#06B6D4'], // Orange, Pink, Cyan
    xaxis: {
      type: 'category' as const,
      categories: consRollNumbers,
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
        },
        formatter: function(value: string) {
          // Use optimized labels - dynamically show labels for better readability
          const labelMap = createOptimizedLabels(consRollNumbers);
          return labelMap[value] || '';
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
      shared: true,
      intersect: false,
      y: {
        formatter: createConsTooltipFormatter()
      },
      style: {
        fontSize: '14px',
        fontFamily: 'IranYekan',
        color: '#000',
      },
      marker: {
        show: true,
      },
      theme: 'light',
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
      size: 3,
      strokeWidth: 1,
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
            onClick={debouncedRefresh}
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
          <MemoizedChart 
            options={chartOptions}
            series={chartData}
            type="area"
            height={600}
          />
        </div>
      </div>

      {/* Second Chart - Top Headbox Data */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Top Headbox</h3>
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <MemoizedChart 
            options={topHeadboxChartOptions}
            series={topHeadboxData}
            type="area"
            height={600}
          />
        </div>
      </div>

      {/* Third Chart - Bottom Headbox Data */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Bottom Headbox</h3>
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <MemoizedChart 
            options={bottomHeadboxChartOptions}
            series={bottomHeadboxData}
            type="area"
            height={600}
          />
        </div>
      </div>

      {/* Fourth Chart - Tensile Data */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Tensile</h3>
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <MemoizedChart 
            options={tensileChartOptions}
            series={tensileData}
            type="area"
            height={600}
          />
        </div>
      </div>

      {/* Fifth Chart - Consistency Data */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Cons</h3>
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <MemoizedChart 
            options={consChartOptions}
            series={consData}
            type="area"
            height={600}
          />
        </div>
      </div>
    </div>
  );
};
