import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronLeft, CheckCircle, User, Package, FileText, Printer, ArrowLeft, Search } from 'lucide-react';
import type { Paper, Customer, Loading, QCRecord, PaperField } from '../../types';
import { qcAPI } from '../../utils/api';
import { CustomerList } from './CustomerList';
import { CustomerForm } from './CustomerForm';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { getProductionLineColors } from '../../utils/productionLineColors';

interface QCWorkflowProps {
  onComplete?: (qcRecord: QCRecord) => void;
  onCancel?: () => void;
  onPrint?: (qcRecordId: string) => void;
  editingRecord?: QCRecord;
}

interface WorkflowStep {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  completed: boolean;
}

interface WorkflowData {
  selectedPapers: Paper[];
  customer: Partial<Customer>;
  loading: Partial<Loading>;
  customFields: string[];
  printCount: number;
}

type CustomerStep = 'list' | 'form';
interface CustomerState {
  step: CustomerStep;
  selectedCustomer?: Customer;
  editingCustomer?: Customer;
}

export const QCWorkflow: React.FC<QCWorkflowProps> = ({ onComplete, onCancel, onPrint, editingRecord }) => {
  console.log('DEBUG - QCWorkflow rendered with editingRecord:', editingRecord);
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [availablePapers, setAvailablePapers] = useState<Paper[]>([]);
  const [availableFields, setAvailableFields] = useState<PaperField[]>([]);
  const [hoursRange, setHoursRange] = useState(24);
  const [rollNumberSearch, setRollNumberSearch] = useState('');
  
  // Customer management state
  const [customerState, setCustomerState] = useState<CustomerState>({
    step: 'list'
  });
  
  const [workflowData, setWorkflowData] = useState<WorkflowData>({
    selectedPapers: [],
    customer: {},
    loading: {
      grammage: 0,
      width: 0,
      humidity: 0,
      burst: 0,
      cub: 0,
      md: 0,
      cd: 0,
      ash: 0,
      custom: false
    },
    customFields: [],
    printCount: 3
  });

  // State for tracking "other" option selection for each field
  const [otherSelected, setOtherSelected] = useState({
    grammage: false,
    width: false,
    humidity: false,
    burst: false,
    cub: false,
    md: false,
    cd: false
  });

  const steps: WorkflowStep[] = [
    {
      id: 1,
      title: 'انتخاب رکوردهای کاغذ',
      description: 'انتخاب رکوردهای کاغذ از 24 ساعت گذشته',
      icon: <FileText className="w-5 h-5" />,
      completed: workflowData.selectedPapers.length > 0
    },
    {
      id: 2,
      title: 'بررسی داده‌های انتخاب شده',
      description: 'مشاهده خلاصه داده‌های انتخاب شده',
      icon: <CheckCircle className="w-5 h-5" />,
      completed: currentStep > 2
    },
    {
      id: 3,
      title: 'ایجاد/انتخاب مشتری',
      description: 'اضافه کردن اطلاعات مشتری',
      icon: <User className="w-5 h-5" />,
      completed: !!customerState.selectedCustomer
    },
    {
      id: 4,
      title: 'مشخصات عمومی',
      description: 'تکمیل مشخصات بارگیری',
      icon: <Package className="w-5 h-5" />,
      completed: workflowData.loading.grammage! > 0
    },
    {
      id: 5,
      title: 'انتخاب فیلدهای سفارشی',
      description: 'انتخاب فیلدهای کاغذ برای چاپ',
      icon: <CheckCircle className="w-5 h-5" />,
      completed: workflowData.customFields.length > 0
    },
    {
      id: 6,
      title: 'ذخیره و چاپ',
      description: 'ذخیره اطلاعات و انتقال به صفحه چاپ',
      icon: <Printer className="w-5 h-5" />,
      completed: currentStep > 6
    }
  ];

  // Load initial data
  useEffect(() => {
    loadRecentPapers();
    loadAvailableFields();
  }, [hoursRange]);

  // Load existing QC record data when editing
  useEffect(() => {
    //console.log('DEBUG - useEffect for editingRecord triggered, editingRecord:', editingRecord);
    if (editingRecord) {
      //console.log('DEBUG - Calling loadExistingQCData for record:', editingRecord.id);
      loadExistingQCData();
    }
  }, [editingRecord]);

  // Match selected papers when availablePapers changes during edit mode
  useEffect(() => {
    // console.log('DEBUG - useEffect for paper matching triggered');
    // console.log('DEBUG - editingRecord:', !!editingRecord);
    // console.log('DEBUG - availablePapers.length:', availablePapers.length);
    // console.log('DEBUG - workflowData.selectedPapers.length:', workflowData.selectedPapers.length);
    
    if (editingRecord && availablePapers.length > 0 && workflowData.selectedPapers.length === 0) {
      // console.log('DEBUG - Conditions met, calling matchSelectedPapersFromRecord');
      matchSelectedPapersFromRecord();
    }
  }, [availablePapers, editingRecord, workflowData.selectedPapers.length]);

  const matchSelectedPapersFromRecord = async () => {
    if (!editingRecord) return;
    
    try {
      const response = await qcAPI.getRecord(editingRecord.id);
      console.log(response,"________response")
      // Get roll numbers from the record
      let selectedRollNumbers: string[] = [];
      
      if (response.rollnumbers_detail && response.rollnumbers_detail.length > 0) {
        selectedRollNumbers = response.rollnumbers_detail.map((p: Paper) => p.roll_number);
        console.log(selectedRollNumbers,"________selectedRollNumbers")
      } else if (response.roll_numbers_list && response.roll_numbers_list.length > 0) {
        selectedRollNumbers = response.roll_numbers_list;
      }
      
      // console.log('DEBUG - Matching papers with roll numbers:', selectedRollNumbers);
      // console.log('DEBUG - Available papers for matching:', availablePapers.length);
      console.log(availablePapers ,"________paper")
      const matchedSelectedPapers = availablePapers.filter(paper => 
        {
          const isMatch = selectedRollNumbers.includes(paper.roll_number);
          console.log("checking:", paper.roll_number, "match:", isMatch);
          return isMatch;
        }
      );
      
      
      console.log(matchedSelectedPapers,"matchedSelectedPapers________matchedSelectedPapers")
      //console.log('DEBUG - Final matched papers:', matchedSelectedPapers.map(p => `${p.roll_number} (ID: ${p.id})`));
      
      if (matchedSelectedPapers.length > 0) {
        setWorkflowData(prev => ({
          ...prev,
          selectedPapers: matchedSelectedPapers
        }));
      }
    } catch (error) {
      //console.error('Failed to match selected papers:', error);
    }
  };

  const loadExistingQCData = async () => {
    if (!editingRecord) return;
    
    try {
      setIsLoading(true);
      // Get the full QC record data
      const response = await qcAPI.getRecord(editingRecord.id);
      
      
      // Check if the QC record has any associated papers
      if (!response.rollnumbers || response.rollnumbers.length === 0) {
        //console.error('DEBUG - QC record has no associated paper IDs!');
      }
      if (!response.rollnumbers_detail || response.rollnumbers_detail.length === 0) {
        //console.error('DEBUG - QC record has no detailed paper objects!');
      }
      if (!response.roll_numbers_list || response.roll_numbers_list.length === 0) {
        //console.error('DEBUG - QC record has no roll numbers list!');
      }
      
      // Set customer state using the detailed customer object
      if (response.customer_detail) {
        setCustomerState({
          step: 'list',
          selectedCustomer: response.customer_detail
        });
      }

      // Set workflow data (papers will be matched by the useEffect when availablePapers loads)
      const newWorkflowData = {
        selectedPapers: [], // Will be populated by useEffect when availablePapers is ready
        customer: response.customer_detail || {},
        loading: response.loading_detail || {},
        customFields: response.custom_items || [],
        printCount: response.print_count || 1
      };
      
      setWorkflowData(prev => ({
        ...prev,
        ...newWorkflowData
      }));

      // Check if existing values match predefined options, otherwise set "other" selected
      const loadingData = response.loading_detail || {};
      const newOtherSelected = {
        grammage: loadingData.grammage && loadingData.grammage !== 125,
        width: loadingData.width && ![120, 130, 140, 200, 210, 220, 230, 240].includes(loadingData.width),
        humidity: loadingData.humidity && ![6, 7].includes(loadingData.humidity),
        burst: loadingData.burst && loadingData.burst !== 300,
        cub: loadingData.cub && loadingData.cub !== 30,
        md: loadingData.md && loadingData.md !== 100,
        cd: loadingData.cd && loadingData.cd !== 45
      };
      
      setOtherSelected(newOtherSelected);

      // Load recent papers to populate the available papers list
      // The useEffect will handle matching when papers are loaded
      setHoursRange(8760); // Expand to 1 year to ensure we get the existing papers
      await loadRecentPapers();

      // Start from step 1 to allow editing all data
      setCurrentStep(1);
      
    } catch (error) {
      //console.error('Failed to load existing QC record:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadRecentPapers = async (searchQuery: string = '') => {
    try {
      setIsLoading(true);
      // Pass the QC record ID when editing to exclude it from the "used papers" filter
      const response = editingRecord?.id 
        ? await qcAPI.getRecentPapers(hoursRange, editingRecord.id, searchQuery)
        : await qcAPI.getRecentPapers(hoursRange, undefined, searchQuery);
      setAvailablePapers(response.papers || []);
    } catch (error) {
      console.error('Failed to load recent papers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    await loadRecentPapers(rollNumberSearch);
  };

  const loadAvailableFields = async () => {
    try {
      const response = await qcAPI.getPaperFields();
      setAvailableFields(response.fields || []);
    } catch (error) {
      //console.error('Failed to load paper fields:', error);
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handlePaperSelection = (paper: Paper, selected: boolean) => {
    setWorkflowData(prev => {
      if (selected) {
        // Remove any existing paper with the same roll_number and add the new one
        const filteredPapers = prev.selectedPapers.filter(p => p.roll_number !== paper.roll_number);
        return {
          ...prev,
          selectedPapers: [...filteredPapers, paper]
        };
      } else {
        // Remove paper with matching roll_number
        return {
          ...prev,
          selectedPapers: prev.selectedPapers.filter(p => p.roll_number !== paper.roll_number)
        };
      }
    });
  };


  const handleLoadingChange = (field: keyof Loading, value: number | boolean) => {
    setWorkflowData(prev => ({
      ...prev,
      loading: { ...prev.loading, [field]: value }
    }));
  };

  // Handler for dropdown selection changes
  const handleDropdownChange = (field: keyof typeof otherSelected, value: string) => {
    if (value === 'other') {
      setOtherSelected(prev => ({ ...prev, [field]: true }));
    } else {
      setOtherSelected(prev => ({ ...prev, [field]: false }));
      // Convert value to number for numeric fields
      const numValue = parseFloat(value);
      handleLoadingChange(field as keyof Loading, numValue);
    }
  };

  const handleFieldSelection = (fieldName: string, selected: boolean) => {
    setWorkflowData(prev => ({
      ...prev,
      customFields: selected
        ? [...prev.customFields, fieldName]
        : prev.customFields.filter(f => f !== fieldName)
    }));
  };

  // Customer management handlers
  const handleSelectCustomer = (customer: Customer) => {
    setWorkflowData(prev => ({ ...prev, customer }));
    setCustomerState({ step: 'list', selectedCustomer: customer });
  };

  const handleCreateNewCustomer = () => {
    setCustomerState({ step: 'form', editingCustomer: undefined });
  };

  const handleEditCustomer = (customer: Customer) => {
    setCustomerState({ step: 'form', editingCustomer: customer });
  };

  const handleSaveCustomer = (customer: Customer) => {
    setWorkflowData(prev => ({ ...prev, customer }));
    setCustomerState({ step: 'list', selectedCustomer: customer });
  };

  const handleCancelCustomerForm = () => {
    setCustomerState(prev => ({ ...prev, step: 'list' }));
  };

  const handleCancel = () => {
    // Check if user has made any changes
    const hasChanges = workflowData.selectedPapers.length > 0 || 
                      customerState.selectedCustomer || 
                      workflowData.loading.grammage! > 0 ||
                      workflowData.customFields.length > 0;
    
    if (hasChanges && currentStep > 1) {
      if (confirm('آیا مطمئن هستید؟ تغییرات ذخیره نشده از بین خواهد رفت.')) {
        onCancel?.();
      }
    } else {
      onCancel?.();
    }
  };

  const handleSaveAndComplete = async () => {
    try {
      setIsLoading(true);
      
      let savedRecord;
      
      if (editingRecord) {
        // Update existing QC record
        const paperIds = workflowData.selectedPapers.map(paper => paper.id);
        
        const updateData = {
          rollnumbers: paperIds, // Include selected paper IDs
          customer_id: customerState.selectedCustomer?.id,
          loading_id: workflowData.loading.id || workflowData.loading, // Use ID if it's an object
          custom_items: workflowData.customFields,
          print_count: workflowData.printCount,
          status: 'completed'
        };
        
        //console.log('DEBUG - Update data being sent:', updateData);
        
        savedRecord = await qcAPI.updateRecord(editingRecord.id, updateData);
      } else {
        // Create a new QC record
        const paperIds = workflowData.selectedPapers.map(paper => paper.id);
        
        const qcData = {
          rollnumbers_ids: paperIds, // Send array of paper IDs
          customer: customerState.selectedCustomer,
          loading: workflowData.loading,
          custom_items: workflowData.customFields,
          print_count: workflowData.printCount
        };
          
        const response = await qcAPI.bulkCreate(qcData);
        
        if (response.success) {
          savedRecord = response.qc_record;
        }
      }
      
      if (savedRecord) {
        // Redirect to print page instead of completing workflow
        if (onPrint) {
          onPrint(savedRecord.id);
        } else if (onComplete) {
          onComplete(savedRecord);
        }
      }
      
    } catch (error) {
      //console.error('Failed to save QC records:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        //console.log('DEBUG - Step 1 available papers:', availablePapers.length);
        //console.log('DEBUG - Step 1 selected papers:', workflowData.selectedPapers.length);
        //console.log('DEBUG - Step 1 selected paper IDs:', workflowData.selectedPapers.map(p => p.id));
        const choosedcount = workflowData.selectedPapers.length;
        
        // Sort papers: selected ones first, then unselected ones
        const sortedPapers = [...availablePapers].sort((a, b) => {
          const aSelected = workflowData.selectedPapers.some(p => p.roll_number === a.roll_number);
          const bSelected = workflowData.selectedPapers.some(p => p.roll_number === b.roll_number);
          
          if (aSelected && !bSelected) return -1; // a comes first
          if (!aSelected && bSelected) return 1;  // b comes first
          return 0; // maintain original order for same selection state
        });
        
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-4 mb-4 flex-wrap">
              <label className="text-sm font-medium text-gray-700">
                بازه زمانی (ساعت):
              </label>
              <input
                type="number"
                value={hoursRange}
                onChange={(e) => setHoursRange(Number(e.target.value))}
                className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                min="1"
                max="168"
              />
              <button
                onClick={() => loadRecentPapers()}
                disabled={isLoading}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                بارگذاری مجدد
              </button>
              
              <div className="flex-1 min-w-[200px] flex gap-2">
                <form onSubmit={handleSearchSubmit} className="flex gap-2 flex-1">
                  <input
                    type="text"
                    placeholder="جستجوی شماره رول..."
                    value={rollNumberSearch}
                    onChange={(e) => setRollNumberSearch(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    <Search className="w-4 h-4" />
                    جستجو
                  </button>
                </form>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div>{choosedcount} رکورد انتخاب شده</div>
              <div className="text-sm text-gray-600">
                {availablePapers.length} رکورد یافت شد
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 xl:grid-cols-12 gap-1 max-h-96 overflow-y-auto">
              {sortedPapers.map((paper) => {
                // Match by roll_number instead of ID since IDs might be different
                const isSelected = workflowData.selectedPapers.some(p => p.roll_number === paper.roll_number);
                //console.log(`DEBUG - Paper ${paper.roll_number} (ID: ${paper.id}) selected:`, isSelected);
                //console.log(`DEBUG - Selected roll numbers:`, workflowData.selectedPapers.map(p => p.roll_number));
                return (
                  <div
                    key={paper.id}
                    className={`flex items-center gap-3 p-4 border-2 rounded-lg transition-all ${
                      isSelected 
                        ? 'border-success-600 bg-success-50'
                        : 'border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      id={`paper-${paper.id}`}
                      checked={isSelected}
                      onChange={(e) => handlePaperSelection(paper, e.target.checked)}
                      className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500 hidden"
                    />
                    <label htmlFor={`paper-${paper.id}`} className="flex-1 cursor-pointer">
                      <div className="font-medium text-gray-900 ">
                      {paper.roll_number} - {(() => {
                        const colors = getProductionLineColors(paper.ProductionLine);
                        return (
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${colors.bg} ${colors.text}`}>
                            {colors.label}
                          </span>
                        );
                      })()}
                      </div>
                      <div className="text-sm text-gray-500">
                        {paper.date}
                      </div>
                      {/* <div className="text-sm text-gray-500 mb-1">
                       | مسئول: {paper.responsible_person_name}
                        زمان نمونه‌گیری: {paper.sampling_start_time} - {paper.sampling_end_time}
                      </div> */}
                      
                      {/* Physical Properties */}
                      {/* <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600 mt-2">
                        {paper.real_grammage && (
                          <div>گراماژ: {paper.real_grammage}</div>
                        )}
                        {paper.humidity && (
                          <div>رطوبت: {paper.humidity}%</div>
                        )}
                        {paper.paper_size && (
                          <div>عرض: {paper.paper_size}</div>
                        )}
                        {paper.cub && (
                          <div>کاب: {paper.cub}</div>
                        )}
                        {paper.ash_percentage && (
                          <div>خاکستر: {paper.ash_percentage}%</div>
                        )}
                        {paper.tensile_strength_md && (
                          <div>MD: {paper.tensile_strength_md}</div>
                        )}
                        {paper.tensile_strength_cd && (
                          <div>CD: {paper.tensile_strength_cd}</div>
                        )}
                        {paper.NumberOfTears && (
                          <div>Break: {paper.NumberOfTears}</div>
                        )}
                        {paper.profile && (
                          <div>Profile: {paper.profile}</div>
                        )}
                        {paper.burst_test && (
                          <div>Burst: {paper.burst_test}</div>
                        )}
                      </div> */}
                    </label>
                  </div>
                );
              })}
            </div>
            
            {availablePapers.length === 0 && !isLoading && (
              <div className="text-center py-8 text-gray-500">
                {rollNumberSearch 
                  ? `هیچ رکوردی با شماره رول "${rollNumberSearch}" یافت نشد` 
                  : 'هیچ رکورد کاغذی در بازه زمانی انتخاب شده یافت نشد'
                }
              </div>
            )}
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">
              داده‌های انتخاب شده ({workflowData.selectedPapers.length} رکورد)
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 xl:grid-cols-12 gap-1 max-h-96 overflow-y-auto">
              {workflowData.selectedPapers.map((paper) => (
                <div key={paper.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                  <div className="font-medium text-gray-900 mb-2">
                    {paper.roll_number} - {(() => {
                      const colors = getProductionLineColors(paper.ProductionLine);
                      return (
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${colors.bg} ${colors.text}`}>
                          {colors.label}
                        </span>
                      );
                    })()}
                  </div>
                  <div className="text-sm text-gray-600 mb-2">
                    {paper.date}
                  </div>
                  {/* <div className="text-sm text-gray-600 mb-3">
                    مسئول: {paper.responsible_person_name}
                    {paper.shift && <span className="ml-2">| شیفت: {paper.shift === 'day' ? 'روز' : 'شب'}</span>}
                    {paper.paper_type && <span className="ml-2">| نوع: {paper.paper_type}</span>}
                  </div> */}
                  
                  {/* Detailed Properties Grid */}
                  {/* <div className="grid grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-2 text-sm text-gray-700 bg-white p-3 rounded">
                    {paper.real_grammage && (
                      <div>
                        <span className="font-medium text-gray-600">گراماژ:</span>
                        <span className="ml-1">{paper.real_grammage}</span>
                      </div>
                    )}
                    {paper.humidity && (
                      <div>
                        <span className="font-medium text-gray-600">رطوبت:</span>
                        <span className="ml-1">{paper.humidity}%</span>
                      </div>
                    )}
                    {paper.paper_size && (
                      <div>
                        <span className="font-medium text-gray-600">عرض:</span>
                        <span className="ml-1">{paper.paper_size}</span>
                      </div>
                    )}
                    {paper.cub && (
                      <div>
                        <span className="font-medium text-gray-600">کاب:</span>
                        <span className="ml-1">{paper.cub}</span>
                      </div>
                    )}
                    {paper.ash_percentage && (
                      <div>
                        <span className="font-medium text-gray-600">خاکستر:</span>
                        <span className="ml-1">{paper.ash_percentage}%</span>
                      </div>
                    )}
                    {paper.tensile_strength_md && (
                      <div>
                        <span className="font-medium text-gray-600">MD:</span>
                        <span className="ml-1">{paper.tensile_strength_md}</span>
                      </div>
                    )}
                    {paper.tensile_strength_cd && (
                      <div>
                        <span className="font-medium text-gray-600">CD:</span>
                        <span className="ml-1">{paper.tensile_strength_cd}</span>
                      </div>
                    )}
                    {paper.NumberOfTears && (
                      <div>
                        <span className="font-medium text-gray-600">Break:</span>
                        <span className="ml-1">{paper.NumberOfTears}</span>
                      </div>
                    )}
                    {paper.profile && (
                      <div>
                        <span className="font-medium text-gray-600">Profile:</span>
                        <span className="ml-1">{paper.profile}</span>
                      </div>
                    )}
                    {paper.burst_test && (
                      <div>
                        <span className="font-medium text-gray-600">Burst:</span>
                        <span className="ml-1">{paper.burst_test}</span>
                      </div>
                    )}
                    {paper.machine_speed && (
                      <div>
                        <span className="font-medium text-gray-600">سرعت:</span>
                        <span className="ml-1">{paper.machine_speed}</span>
                      </div>
                    )}
                    {paper.tearing_time && (
                      <div>
                        <span className="font-medium text-gray-600">زمان پارگی:</span>
                        <span className="ml-1">{paper.tearing_time}</span>
                      </div>
                    )}
                  </div> */}

                  {/* RCT/CCT Values if present */}
                  {/* {(paper.rct1 || paper.rct2 || paper.rct3 || paper.rct4 || paper.rct5) && (
                    <div className="mt-3 p-2 bg-blue-50 rounded">
                      <div className="text-xs font-medium text-blue-800 mb-1">RCT Values:</div>
                      <div className="text-xs text-blue-700 flex gap-3">
                        {paper.rct1 && <span>RCT1: {paper.rct1}</span>}
                        {paper.rct2 && <span>RCT2: {paper.rct2}</span>}
                        {paper.rct3 && <span>RCT3: {paper.rct3}</span>}
                        {paper.rct4 && <span>RCT4: {paper.rct4}</span>}
                        {paper.rct5 && <span>RCT5: {paper.rct5}</span>}
                      </div>
                    </div>
                  )} */}

                  {/* {(paper.cct1 || paper.cct2 || paper.cct3 || paper.cct4 || paper.cct5) && (
                    <div className="mt-2 p-2 bg-green-50 rounded">
                      <div className="text-xs font-medium text-green-800 mb-1">CCT Values:</div>
                      <div className="text-xs text-green-700 flex gap-3">
                        {paper.cct1 && <span>CCT1: {paper.cct1}</span>}
                        {paper.cct2 && <span>CCT2: {paper.cct2}</span>}
                        {paper.cct3 && <span>CCT3: {paper.cct3}</span>}
                        {paper.cct4 && <span>CCT4: {paper.cct4}</span>}
                        {paper.cct5 && <span>CCT5: {paper.cct5}</span>}
                      </div>
                    </div>
                  )} */}
                </div>
              ))}
            </div>
          </div>
        );

      case 3:
        //console.log('DEBUG - Step 3 customer state:', customerState);
        //console.log('DEBUG - Step 3 workflow customer:', workflowData.customer);
        return (
          <div className="space-y-6">
            <ErrorBoundary>
              {customerState.step === 'list' ? (
                <CustomerList
                  onSelect={handleSelectCustomer}
                  onCreateNew={handleCreateNewCustomer}
                  selectedCustomer={customerState.selectedCustomer}
                />
              ) : (
                <CustomerForm
                  onSave={handleSaveCustomer}
                  onCancel={handleCancelCustomerForm}
                  customer={customerState.editingCustomer}
                />
              )}
            </ErrorBoundary>
            
            {/* Show selected customer info */}
            {customerState.selectedCustomer && customerState.step === 'list' && (
              <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-green-900">مشتری انتخاب شده:</h4>
                    <p className="text-green-700">{customerState.selectedCustomer.name_family}</p>
                    <p className="text-sm text-green-600">
                      {customerState.selectedCustomer.phone_number} | {customerState.selectedCustomer.national_code}
                    </p>
                  </div>
                  <button
                    onClick={() => handleEditCustomer(customerState.selectedCustomer!)}
                    className="px-3 py-1 text-sm text-green-700 hover:text-green-900 hover:bg-green-100 rounded transition-colors"
                  >
                    ویرایش
                  </button>
                </div>
              </div>
            )}
          </div>
        );

      case 4:
        console.log('DEBUG - Step 4 loading data:', workflowData.loading);
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">مشخصات عمومی بارگیری</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* GMS */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  GMS *
                </label>
                <select
                  value={otherSelected.grammage ? 'other' : workflowData.loading.grammage || ''}
                  onChange={(e) => handleDropdownChange('grammage', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                >
                  <option value="">انتخاب کنید</option>
                  <option value="125">125</option>
                  <option value="other">سایر</option>
                </select>
                {otherSelected.grammage && (
                  <input
                    type="number"
                    step="0.01"
                    value={workflowData.loading.grammage || ''}
                    onChange={(e) => handleLoadingChange('grammage', Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 mt-2"
                    placeholder="مقدار دلخواه را وارد کنید"
                    required
                  />
                )}
              </div>
              
              {/* Width */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Width *
                </label>
                <select
                  value={otherSelected.width ? 'other' : workflowData.loading.width || ''}
                  onChange={(e) => handleDropdownChange('width', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                >
                  <option value="">انتخاب کنید</option>
                  <option value="120">120</option>
                  <option value="130">130</option>
                  <option value="140">140</option>
                  <option value="200">200</option>
                  <option value="210">210</option>
                  <option value="220">220</option>
                  <option value="230">230</option>
                  <option value="240">240</option>
                  <option value="other">سایر</option>
                </select>
                {otherSelected.width && (
                  <input
                    type="number"
                    step="0.01"
                    value={workflowData.loading.width || ''}
                    onChange={(e) => handleLoadingChange('width', Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 mt-2"
                    placeholder="مقدار دلخواه را وارد کنید"
                    required
                  />
                )}
              </div>
              
              {/* Moisture */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Moisture *
                </label>
                <select
                  value={otherSelected.humidity ? 'other' : workflowData.loading.humidity || ''}
                  onChange={(e) => handleDropdownChange('humidity', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                >
                  <option value="">انتخاب کنید</option>
                  <option value="6">6</option>
                  <option value="7">7</option>
                  <option value="other">سایر</option>
                </select>
                {otherSelected.humidity && (
                  <input
                    type="number"
                    step="0.01"
                    value={workflowData.loading.humidity || ''}
                    onChange={(e) => handleLoadingChange('humidity', Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 mt-2"
                    placeholder="مقدار دلخواه را وارد کنید"
                    required
                  />
                )}
              </div>
              
              {/* Burst */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Burst
                </label>
                <select
                  value={otherSelected.burst ? 'other' : (workflowData.loading.burst ? String(workflowData.loading.burst) : '')}
                  onChange={(e) => handleDropdownChange('burst', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">انتخاب کنید</option>
                  <option value="300">300 +</option>
                  <option value="other">سایر</option>
                </select>
                {otherSelected.burst && (
                  <input
                    type="number"
                    step="0.01"
                    value={workflowData.loading.burst || ''}
                    onChange={(e) => handleLoadingChange('burst', Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 mt-2"
                    placeholder="مقدار دلخواه را وارد کنید"
                  />
                )}
              </div>
              
              {/* CUB */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  CUB
                </label>
                <select
                  value={otherSelected.cub ? 'other' : (workflowData.loading.cub ? String(workflowData.loading.cub) : '')}
                  onChange={(e) => handleDropdownChange('cub', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">انتخاب کنید</option>
                  <option value="30">25 - 35</option>
                  <option value="other">سایر</option>
                </select>
                {otherSelected.cub && (
                  <input
                    type="number"
                    step="0.01"
                    value={workflowData.loading.cub || ''}
                    onChange={(e) => handleLoadingChange('cub', Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 mt-2"
                    placeholder="مقدار دلخواه را وارد کنید"
                  />
                )}
              </div>
              
              {/* MD */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  MD
                </label>
                <select
                  value={otherSelected.md ? 'other' : (workflowData.loading.md ? String(workflowData.loading.md) : '')}
                  onChange={(e) => handleDropdownChange('md', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">انتخاب کنید</option>
                  <option value="100">100 +</option>
                  <option value="other">سایر</option>
                </select>
                {otherSelected.md && (
                  <input
                    type="number"
                    step="0.01"
                    value={workflowData.loading.md || ''}
                    onChange={(e) => handleLoadingChange('md', Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 mt-2"
                    placeholder="مقدار دلخواه را وارد کنید"
                  />
                )}
              </div>
              
              {/* CD */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  CD
                </label>
                <select
                  value={otherSelected.cd ? 'other' : (workflowData.loading.cd ? String(workflowData.loading.cd) : '')}
                  onChange={(e) => handleDropdownChange('cd', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">انتخاب کنید</option>
                  <option value="45">45 +</option>
                  <option value="other">سایر</option>
                </select>
                {otherSelected.cd && (
                  <input
                    type="number"
                    step="0.01"
                    value={workflowData.loading.cd || ''}
                    onChange={(e) => handleLoadingChange('cd', Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 mt-2"
                    placeholder="مقدار دلخواه را وارد کنید"
                  />
                )}
              </div>
              
              {/* Ash - keeping as regular input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  خاکستر (Ash)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={workflowData.loading.ash || ''}
                  onChange={(e) => handleLoadingChange('ash', Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">
              انتخاب فیلدهای کاغذ برای چاپ
            </h3>
            <p className="text-sm text-gray-600">
              فیلدهایی که می‌خواهید در نسخه چاپی نمایش داده شوند را انتخاب کنید:
            </p>
            
            {/* Custom checkbox */}
            <div className="bg-warning-50 border border-warning-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={workflowData.loading.custom || false}
                  onChange={(e) => handleLoadingChange('custom', e.target.checked)}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <div>
                  <label className="text-sm font-medium text-gray-900">
                    استفاده از مشخصات کلی
                  </label>
                  <p className="text-sm text-gray-600 mt-1">
                      در صورت انتخاب، مقادیر اطلاعات عمومی جایگزین مقادیر فیلد های انتخاب شده در چاپ خواهد شد.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
              {availableFields.map((field) => (
                <div
                  key={field.field_name}
                  className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={workflowData.customFields.includes(field.field_name)}
                    onChange={(e) => handleFieldSelection(field.field_name, e.target.checked)}
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 text-sm">
                      {field.display_name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {field.field_type}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {workflowData.customFields.length > 0 && (
              <div className="mt-4 p-4 bg-primary-50 rounded-lg">
                <div className="text-sm font-medium text-primary-900 mb-2">
                  فیلدهای انتخاب شده ({workflowData.customFields.length}):
                </div>
                <div className="flex flex-wrap gap-2">
                  {workflowData.customFields.map((fieldName) => {
                    const field = availableFields.find(f => f.field_name === fieldName);
                    return (
                      <span
                        key={fieldName}
                        className="px-2 py-1 bg-primary-100 text-primary-800 text-xs rounded-md"
                      >
                        {field?.display_name || fieldName}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );

      case 6:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">ذخیره و چاپ</h3>
            <p className="text-gray-600">
              آماده ذخیره اطلاعات و انتقال به صفحه چاپ هستید؟
            </p>
            
            <div className="bg-gray-50 p-6 rounded-lg space-y-4">
              <div>
                <strong>رکوردهای انتخاب شده:</strong> {workflowData.selectedPapers.length} رکورد
              </div>
              <div>
                <strong>مشتری:</strong> {workflowData.customer.name_family}
              </div>
              <div>
                <strong>فیلدهای انتخاب شده:</strong> {workflowData.customFields.length} فیلد
              </div>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="text-lg font-medium text-gray-900 mb-3">تنظیمات چاپ</h4>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  تعداد نسخه‌های چاپی
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={workflowData.printCount}
                  onChange={(e) => setWorkflowData(prev => ({ ...prev, printCount: Number(e.target.value) }))}
                  className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
            
            <button
              onClick={handleSaveAndComplete}
              disabled={isLoading}
              className="w-full px-6 py-3 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  در حال ذخیره...
                </>
              ) : (
                <>
                  <Printer className="w-4 h-4" />
                  ذخیره و چاپ {workflowData.printCount} نسخه
                </>
              )}
            </button>
          </div>
        );

      default:
        return (
          <div className="text-center py-12">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">
              فرآیند کنترل کیفی با موفقیت تکمیل شد!
            </h3>
            <p className="text-gray-600">
              {workflowData.selectedPapers.length} رکورد کنترل کیفی ایجاد شد.
            </p>
          </div>
        );
    }
  };

  return (
    <div className="mx-auto p-6">
      {/* Header with Back Button */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={handleCancel}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white font-bold hover:bg-red-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            بازگشت به لیست
          </button>
          <div className="h-6 w-px bg-gray-300"></div>
          <h1 className="text-2xl font-bold text-gray-900">
            {editingRecord ? `ویرایش رکورد کنترل کیفی - QC-${editingRecord.id}` : 'ایجاد رکورد کنترل کیفی جدید'}
          </h1>
        </div>
        
        {currentStep <= steps.length && (
          <div className="text-sm text-gray-500">
            مرحله {currentStep} از {steps.length}
          </div>
        )}
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          {steps.map((step, index) => (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                    step.completed
                      ? 'bg-green-500 text-white'
                      : currentStep === step.id
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {step.completed ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    step.icon
                  )}
                </div>
                <div className="mt-2 text-xs text-center max-w-20">
                  <div className="font-medium">{step.title}</div>
                </div>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`flex-1 h-1 mx-2 ${
                    step.completed ? 'bg-green-500' : 'bg-gray-200'
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {steps[currentStep - 1]?.title || 'تکمیل شد'}
          </h2>
          <p className="text-gray-600">
            {steps[currentStep - 1]?.description || 'فرآیند کنترل کیفی تکمیل شد'}
          </p>
        </div>

        {renderStepContent()}
      </div>

      {/* Navigation Buttons */}
      {currentStep <= steps.length && (
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
              قبلی
            </button>
            
            <button
              onClick={handleCancel}
              className="px-4 py-2 bg-red-600 text-white font-bold hover:bg-red-700 rounded-md transition-colors inline-flex items-center"
            >
              انصراف
            </button>
          </div>

          <button
            onClick={handleNext}
            disabled={
              currentStep === steps.length ||
              (currentStep === 1 && workflowData.selectedPapers.length === 0) ||
              (currentStep === 3 && !customerState.selectedCustomer) ||
              (currentStep === 4 && !workflowData.loading.grammage) ||
              (currentStep === 5 && workflowData.customFields.length === 0)
            }
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            بعدی
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
