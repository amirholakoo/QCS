import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ChevronRight, ChevronLeft, CheckCircle, User, Package, FileText, Printer, ArrowLeft, Search, Eye, X } from 'lucide-react';
import type { Paper, Customer, Loading, QCRecord, PaperField } from '../../types';
import { qcAPI } from '../../utils/api';
import { CustomerList } from './CustomerList';
import { CustomerForm } from './CustomerForm';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { getProductionLineColors } from '../../utils/productionLineColors';
import { QCPrintContent, PrintPageData } from './QCPrintPage';

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

interface WarehouseRollSummary {
  external_roll_numbers_count: number;
  missing_roll_count: number;
  missing_roll_numbers: string[];
}

export const QCWorkflow: React.FC<QCWorkflowProps> = ({ onComplete, onCancel, onPrint, editingRecord }) => {
  //console.log('DEBUG - QCWorkflow rendered with editingRecord:', editingRecord);
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [availablePapers, setAvailablePapers] = useState<Paper[]>([]);
  const [availableFields, setAvailableFields] = useState<PaperField[]>([]);
  const [warehouses, setWarehouses] = useState<string[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [warehouseWidths, setWarehouseWidths] = useState<number[]>([]);
  const [selectedWidth, setSelectedWidth] = useState<number | null>(null);
  const [rollNumberSearch, setRollNumberSearch] = useState('');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const onlyUnused = false;
  const [usedPapersInfo, setUsedPapersInfo] = useState<{roll_number: string, paper_id: number, used_in_qc_ids: number[]}[]>([]);
  const [draftRecordId, setDraftRecordId] = useState<string | null>(editingRecord?.id || null);
  const [draftLoadingId, setDraftLoadingId] = useState<string | null>(editingRecord?.loading_id || null);
  const [warehouseRollSummary, setWarehouseRollSummary] = useState<WarehouseRollSummary>({
    external_roll_numbers_count: 0,
    missing_roll_count: 0,
    missing_roll_numbers: [],
  });
  const [showMissingRollDetails, setShowMissingRollDetails] = useState(false);
  const lockRef = useRef<string | null>(editingRecord?.id || null);
  
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

  const selectedPreviewFields = useMemo(
    () => availableFields.filter(field => workflowData.customFields.includes(field.field_name)),
    [availableFields, workflowData.customFields]
  );

  const selectedCustomer = customerState.selectedCustomer || (workflowData.customer as Customer | undefined);

  const previewPrintData = useMemo<PrintPageData | null>(() => {
    if (workflowData.selectedPapers.length === 0) {
      return null;
    }

    const customFieldsInfo = selectedPreviewFields.map(field => ({
      field_name: field.field_name,
      display_name: field.display_name,
    }));

    const rollNumbers = workflowData.selectedPapers.map(paper => paper.roll_number);

    // Field mapping from models.py - maps paper fields to loading_specs fields
    const loadingFieldMapping: Record<string, keyof typeof workflowData.loading> = {
      'real_grammage': 'grammage',      // GMS <- grammage
      'humidity': 'humidity',            // moisture <- humidity
      'paper_size': 'width',             // width <- width
      'cub': 'cub',                      // cub <- cub
      'burst_test': 'burst',             // burst <- burst
      'tensile_strength_md': 'md',       // MD <- md
      'tensile_strength_cd': 'cd',       // CD <- cd
      'ash_percentage': 'ash',           // ash <- ash
    };

    const rollData = workflowData.selectedPapers.map((paper) => {
      const paperData = paper as Record<string, any>;
      const customFields: Record<string, any> = {};

      selectedPreviewFields.forEach(field => {
        const fieldName = field.field_name;
        
        // If custom mode is enabled
        if (workflowData.loading.custom) {
          if (fieldName in loadingFieldMapping) {
            // Replace with loading_specs values based on mapping
            const loadingFieldKey = loadingFieldMapping[fieldName];
            const loadingValue = workflowData.loading[loadingFieldKey];
            
            // Handle numeric fields
            if (loadingValue !== undefined && loadingValue !== null) {
              customFields[fieldName] = typeof loadingValue === 'number' ? loadingValue : Number(loadingValue);
            } else {
              customFields[fieldName] = null;
            }
          } else {
            // Field not in mapping: replace with "-"
            customFields[fieldName] = '-';
          }
        } else {
          // Normal mode: use paper field values
          customFields[fieldName] = paperData[fieldName] ?? null;
        }
      });

      return {
        roll_number: paper.roll_number,
        custom_fields: customFields,
      };
    });

    const customerSource = selectedCustomer || (workflowData.customer as Customer | undefined);

    const customerData = {
      name_family: customerSource?.name_family || '',
      phone_number: customerSource?.phone_number || '',
      national_code: customerSource?.national_code || '',
      address: customerSource?.address || '',
      postal_code: customerSource?.postal_code || '',
    };

    const loadingSpecs = {
      grammage: Number(workflowData.loading.grammage) || 0,
      width: Number(workflowData.loading.width) || 0,
      humidity: Number(workflowData.loading.humidity) || 0,
      burst: Number(workflowData.loading.burst) || 0,
      cub: Number(workflowData.loading.cub) || 0,
      md: Number(workflowData.loading.md) || 0,
      cd: Number(workflowData.loading.cd) || 0,
      ash:
        workflowData.loading.ash !== undefined && workflowData.loading.ash !== null
          ? Number(workflowData.loading.ash)
          : undefined,
      custom: Boolean(workflowData.loading.custom),
    };

    return {
      qc_record: {
        id: editingRecord?.id || 'پیش‌نویس',
        customer: customerData,
        loading_specs: loadingSpecs,
        create_time: editingRecord?.create_time || new Date().toISOString(),
        print_count: workflowData.printCount,
        status: editingRecord?.status || 'draft',
      },
      qr_code: '',
      roll_numbers: rollNumbers,
      roll_data: rollData,
      custom_fields_info: customFieldsInfo,
    };
  }, [
    editingRecord?.create_time,
    editingRecord?.id,
    editingRecord?.status,
    selectedCustomer,
    selectedPreviewFields,
    workflowData.customFields,
    workflowData.customer,
    workflowData.loading.ash,
    workflowData.loading.burst,
    workflowData.loading.cd,
    workflowData.loading.cub,
    workflowData.loading.custom,
    workflowData.loading.grammage,
    workflowData.loading.humidity,
    workflowData.loading.md,
    workflowData.loading.width,
    workflowData.printCount,
    workflowData.selectedPapers,
  ]);

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
      title: 'انتخاب رول',
      description: 'انتخاب رکوردهای کاغذ بر اساس انبار و عرض',
      icon: <FileText className="w-5 h-5" />,
      completed: workflowData.selectedPapers.length > 0
    },
    {
      id: 2,
      title: 'بررسی دوباره',
      description: 'مشاهده دوباره اطلاعات انتخاب شده',
      icon: <CheckCircle className="w-5 h-5" />,
      completed: currentStep > 2
    },
    {
      id: 3,
      title: 'انتخاب مشتری',
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
      title: 'انتخاب مشخصه',
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
    loadWarehouses();
    loadAvailableFields();
  }, []);

  // Load existing QC record data when editing
  useEffect(() => {
    //console.log('DEBUG - useEffect for editingRecord triggered, editingRecord:', editingRecord);
    if (editingRecord) {
      setDraftRecordId(editingRecord.id);
      setDraftLoadingId(editingRecord.loading_id);
      qcAPI.acquireEditLock(editingRecord.id).catch((error: any) => {
        alert(error?.message || 'کاربر دیگری در حال ویرایش این فرم است. لطفا بعدا تلاش کنید.');
        onCancel?.();
      });
      //console.log('DEBUG - Calling loadExistingQCData for record:', editingRecord.id);
      loadExistingQCData();
    }
  }, [editingRecord]);

  useEffect(() => {
    lockRef.current = draftRecordId || editingRecord?.id || null;
  }, [draftRecordId, editingRecord?.id]);

  useEffect(() => {
    return () => {
      if (lockRef.current) {
        qcAPI.releaseEditLock(lockRef.current).catch(() => {});
      }
    };
  }, []);

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

  // Prefill step 4 loading width from the width selected in step 1
  useEffect(() => {
    if (currentStep !== 4 || selectedWidth === null || workflowData.loading.width) {
      return;
    }

    setWorkflowData(prev => ({
      ...prev,
      loading: {
        ...prev.loading,
        width: selectedWidth
      }
    }));
  }, [currentStep, selectedWidth, workflowData.loading.width]);

  const matchSelectedPapersFromRecord = async () => {
    if (!editingRecord) return;
    
    try {
      const response = await qcAPI.getRecord(editingRecord.id);
      
      // Get papers from rollnumbers_detail directly (these are the full Paper objects from the API)
      let papersFromRecord: Paper[] = [];
      
      if (response.rollnumbers_detail && response.rollnumbers_detail.length > 0) {
        // Use the full Paper objects directly from the API response
        papersFromRecord = response.rollnumbers_detail;
      } else if (response.roll_numbers_list && response.roll_numbers_list.length > 0) {
        // Fallback: if we only have roll numbers, try to match with availablePapers
        const selectedRollNumbers = response.roll_numbers_list;
        papersFromRecord = availablePapers.filter(paper => 
          selectedRollNumbers.includes(paper.roll_number)
        );
      }
      
      if (papersFromRecord.length > 0) {
        // Add papers from record to availablePapers if they're not already there
        // This ensures they show up in the UI even if they're outside the time range
        const existingRollNumbers = new Set(availablePapers.map(p => p.roll_number));
        const papersToAdd = papersFromRecord.filter(p => !existingRollNumbers.has(p.roll_number));
        
        if (papersToAdd.length > 0) {
          setAvailablePapers(prev => [...prev, ...papersToAdd]);
        }
        
        // Set the selected papers
        setWorkflowData(prev => ({
          ...prev,
          selectedPapers: papersFromRecord
        }));
      }
    } catch (error) {
      console.error('Failed to match selected papers:', error);
    }
  };

  const loadExistingQCData = async () => {
    if (!editingRecord) return;
    
    try {
      setIsLoading(true);
      // Get the full QC record data
      const response = await qcAPI.getRecord(editingRecord.id);
      
      // Get selected papers directly from rollnumbers_detail
      let selectedPapersFromRecord: Paper[] = [];
      if (response.rollnumbers_detail && response.rollnumbers_detail.length > 0) {
        // Use the full Paper objects directly from the API response
        selectedPapersFromRecord = response.rollnumbers_detail;
      }
      
      // Set customer state using the detailed customer object
      if (response.customer_detail) {
        setCustomerState({
          step: 'list',
          selectedCustomer: response.customer_detail
        });
      }

      // Set workflow data with selected papers
      const newWorkflowData = {
        selectedPapers: selectedPapersFromRecord, // Set papers directly from API response
        customer: response.customer_detail || {},
        loading: response.loading_detail || {},
        customFields: response.custom_items || [],
        printCount: response.print_count || 1
      };
      
      setWorkflowData(prev => ({
        ...prev,
        ...newWorkflowData
      }));

      // Set warehouse and width from the first selected paper
      if (selectedPapersFromRecord.length > 0) {
        const firstPaper = selectedPapersFromRecord[0];
        const initialWarehouse = firstPaper.warehouse || '';
        const initialWidth = firstPaper.paper_size ?? null;

        if (initialWarehouse) {
          setSelectedWarehouse(initialWarehouse);
          await loadWidthsForWarehouse(initialWarehouse);
        }
        if (initialWidth !== null) {
          setSelectedWidth(initialWidth);
        }

        // In edit mode, load step-1 list from the same warehouse/width context
        if (initialWarehouse && initialWidth !== null) {
          await loadPapersByWarehouseAndWidth('', initialWarehouse, initialWidth);
        }
      }

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
      // Also add selected papers to availablePapers if they're not already there
      // Add selected papers to availablePapers if they're not already there
      // This ensures they show up in the UI even if they're outside the time range
      if (selectedPapersFromRecord.length > 0) {
        setAvailablePapers(prev => {
          const existingRollNumbers = new Set(prev.map(p => p.roll_number));
          const papersToAdd = selectedPapersFromRecord.filter(p => !existingRollNumbers.has(p.roll_number));
          return papersToAdd.length > 0 ? [...prev, ...papersToAdd] : prev;
        });
      }

      // Start from step 1 to allow editing all data
      setCurrentStep(1);
      
    } catch (error) {
      console.error('Failed to load existing QC record:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadWarehouses = async () => {
    try {
      const response = await qcAPI.getWarehouseNames();
      setWarehouses(response.warehouses || []);
    } catch (error) {
      console.error('Failed to load warehouses:', error);
      setWarehouses([]);
    }
  };

  const loadWidthsForWarehouse = async (warehouse: string) => {
    if (!warehouse) {
      setWarehouseWidths([]);
      return;
    }

    try {
      setIsLoading(true);
      const response = await qcAPI.getWarehouseWidths(warehouse);
      setWarehouseWidths(response.widths || []);
    } catch (error) {
      console.error('Failed to load widths:', error);
      setWarehouseWidths([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPapersByWarehouseAndWidth = async (
    searchQuery: string = '',
    warehouseOverride?: string,
    widthOverride?: number | null
  ) => {
    const warehouseToUse = warehouseOverride ?? selectedWarehouse;
    const widthToUse = widthOverride ?? selectedWidth;

    if (!warehouseToUse || widthToUse === null) {
      return;
    }

    try {
      setIsLoading(true);
      const response = editingRecord?.id 
        ? await qcAPI.getWarehouseReels(warehouseToUse, widthToUse, editingRecord.id, searchQuery, onlyUnused)
        : await qcAPI.getWarehouseReels(warehouseToUse, widthToUse, undefined, searchQuery, onlyUnused);
      setAvailablePapers(response.papers || []);
      setUsedPapersInfo(response.used_papers_info || []);
      setWarehouseRollSummary({
        external_roll_numbers_count: response.external_roll_numbers_count || 0,
        missing_roll_count: response.missing_roll_count || 0,
        missing_roll_numbers: response.missing_roll_numbers || [],
      });
    } catch (error) {
      console.error('Failed to load papers by warehouse and width:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    await loadPapersByWarehouseAndWidth(rollNumberSearch);
  };

  const loadAvailableFields = async () => {
    try {
      const response = await qcAPI.getPaperFields();
      setAvailableFields(response.fields || []);
    } catch (error) {
      //console.error('Failed to load paper fields:', error);
    }
  };

  const ensureDraftRecord = async () => {
    if (editingRecord?.id) {
      return {
        recordId: editingRecord.id,
        customerId: editingRecord.customer_id,
        loadingId: editingRecord.loading_id
      };
    }

    if (draftRecordId && draftLoadingId) {
      return {
        recordId: draftRecordId,
        customerId: null,
        loadingId: draftLoadingId
      };
    }

    const createdLoading = await qcAPI.createLoading({
      grammage: Number(workflowData.loading.grammage) || 0,
      width: Number(workflowData.loading.width) || Number(selectedWidth) || 0,
      humidity: Number(workflowData.loading.humidity) || 0,
      burst: Number(workflowData.loading.burst) || 0,
      cub: Number(workflowData.loading.cub) || 0,
      md: Number(workflowData.loading.md) || 0,
      cd: Number(workflowData.loading.cd) || 0,
      ash: workflowData.loading.ash !== undefined ? Number(workflowData.loading.ash) : undefined,
      custom: Boolean(workflowData.loading.custom),
    });

    const createdRecord = await qcAPI.createRecord({
      rollnumbers: workflowData.selectedPapers.map(paper => paper.id),
      loading_id: createdLoading.id,
      custom_items: workflowData.customFields,
      print_count: workflowData.printCount,
      status: 'draft'
    });

    await qcAPI.acquireEditLock(createdRecord.id);

    setDraftRecordId(createdRecord.id);
    setDraftLoadingId(createdLoading.id);

    return {
      recordId: createdRecord.id,
      customerId: null,
      loadingId: createdLoading.id
    };
  };

  const saveDraftProgress = async () => {
    const draftRefs = await ensureDraftRecord();

    const targetCustomerId = customerState.selectedCustomer?.id || draftRefs.customerId;
    const targetLoadingId = workflowData.loading.id || draftRefs.loadingId;

    await qcAPI.updateLoading(targetLoadingId, {
      grammage: Number(workflowData.loading.grammage) || 0,
      width: Number(workflowData.loading.width) || Number(selectedWidth) || 0,
      humidity: Number(workflowData.loading.humidity) || 0,
      burst: Number(workflowData.loading.burst) || 0,
      cub: Number(workflowData.loading.cub) || 0,
      md: Number(workflowData.loading.md) || 0,
      cd: Number(workflowData.loading.cd) || 0,
      ash: workflowData.loading.ash !== undefined && workflowData.loading.ash !== null
        ? Number(workflowData.loading.ash)
        : undefined,
      custom: Boolean(workflowData.loading.custom),
    });

    await qcAPI.updateRecord(draftRefs.recordId, {
      rollnumbers: workflowData.selectedPapers.map(paper => paper.id),
      ...(targetCustomerId ? { customer_id: targetCustomerId } : {}),
      loading_id: targetLoadingId,
      custom_items: workflowData.customFields,
      print_count: workflowData.printCount,
      status: 'draft'
    });
  };

  const handleNext = async () => {
    try {
      await saveDraftProgress();
    } catch (error) {
      console.error('Failed to save draft progress:', error);
      return;
    }

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

  const renderCustomValueOption = (value: number | undefined, presets: number[]) => {
    if (value === undefined || value === null || Number.isNaN(Number(value))) {
      return null;
    }
    const numericValue = Number(value);
    // Ignore default/empty numeric placeholders (e.g. initial 0 state).
    if (numericValue <= 0) {
      return null;
    }
    if (presets.includes(numericValue)) {
      return null;
    }
    return (
      <option value={String(numericValue)}>
        مقدار ذخیره شده: {numericValue}
      </option>
    );
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
        if (draftRecordId || editingRecord?.id) {
          qcAPI.releaseEditLock(String(draftRecordId || editingRecord?.id)).catch(() => {});
        }
        onCancel?.();
      }
    } else {
      if (draftRecordId || editingRecord?.id) {
        qcAPI.releaseEditLock(String(draftRecordId || editingRecord?.id)).catch(() => {});
      }
      onCancel?.();
    }
  };

  const handleSaveAndComplete = async () => {
    try {
      setIsPreviewOpen(false);
      setIsLoading(true);
      
      let savedRecord;
      
      const activeRecordId = draftRecordId || editingRecord?.id;

      if (activeRecordId) {
        // Update existing QC record
        const paperIds = workflowData.selectedPapers.map(paper => paper.id);
        
        const updateData = {
          rollnumbers: paperIds, // Include selected paper IDs
          customer_id: customerState.selectedCustomer?.id,
          loading_id: workflowData.loading.id || workflowData.loading, // Use ID if it's an object
          loading: workflowData.loading, // Send full loading data to update Loading object
          custom_items: workflowData.customFields,
          print_count: workflowData.printCount,
          status: 'completed'
        };
        
        //console.log('DEBUG - Update data being sent:', updateData);
        
        savedRecord = await qcAPI.updateRecord(activeRecordId, updateData);
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
        await qcAPI.releaseEditLock(savedRecord.id).catch(() => {});
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
            {/* {(draftRecordId || editingRecord?.id) && (
              <div className="text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-md px-3 py-2 inline-block">
                پیش‌نویس به صورت خودکار ذخیره می‌شود - QC-{draftRecordId || editingRecord?.id}
              </div>
            )} */}
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 mb-4 flex-wrap">
              <div className='w-full sm:w-auto'>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  انبار:
                </label>
                <select
                  value={selectedWarehouse}
                  onChange={async (e) => {
                    const nextWarehouse = e.target.value;
                    setSelectedWarehouse(nextWarehouse);
                    setSelectedWidth(null);
                    setWarehouseWidths([]);
                    setAvailablePapers([]);
                    setUsedPapersInfo([]);
                    setWarehouseRollSummary({
                      external_roll_numbers_count: 0,
                      missing_roll_count: 0,
                      missing_roll_numbers: [],
                    });
                    setShowMissingRollDetails(false);
                    await loadWidthsForWarehouse(nextWarehouse);
                  }}
                  className="w-full sm:w-64 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">انتخاب انبار</option>
                  {warehouses.map((warehouse) => (
                    <option key={warehouse} value={warehouse}>
                      {warehouse}
                    </option>
                  ))}
                </select>
              </div>

              <div className='w-full sm:w-auto'>
                <label className="w-100 block text-sm font-medium text-gray-700 mb-1">
                  عرض:
                </label>
                <select
                  value={selectedWidth ?? ''}
                  disabled={!selectedWarehouse || warehouseWidths.length === 0}
                  onChange={async (e) => {
                    const value = e.target.value;
                    const width = value ? Number(value) : null;
                    setSelectedWidth(width);
                    setShowMissingRollDetails(false);
                    setWarehouseRollSummary({
                      external_roll_numbers_count: 0,
                      missing_roll_count: 0,
                      missing_roll_numbers: [],
                    });
                    if (width !== null) {
                      await loadPapersByWarehouseAndWidth(rollNumberSearch, selectedWarehouse, width);
                    } else {
                      setAvailablePapers([]);
                      setUsedPapersInfo([]);
                    }
                  }}
                  className="w-full sm:w-40 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100"
                >
                  <option value="">انتخاب عرض</option>
                  {warehouseWidths.map((width) => (
                    <option key={width} value={width}>
                      {width}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Only Unused Toggle */}
              {/* <label className="flex items-center gap-2 cursor-pointer bg-gray-100 px-3 py-2 rounded-md hover:bg-gray-200 transition-colors">
                <input
                  type="checkbox"
                  checked={onlyUnused}
                  onChange={(e) => {
                    setOnlyUnused(e.target.checked);
                    setTimeout(() => loadPapersByWarehouseAndWidth(rollNumberSearch), 0);
                  }}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-gray-700">فقط استفاده نشده</span>
              </label> */}
              
              <div className="flex-1 w-full min-w-[300px] flex gap-2">
                <form onSubmit={handleSearchSubmit} className="w-full flex gap-2 flex-1">
                  <input
                    type="text"
                    placeholder="جستجوی شماره رول..."
                    value={rollNumberSearch}
                    onChange={(e) => setRollNumberSearch(e.target.value)}
                    className="flex-1 px-3 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
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
              <div className="text-sm text-gray-600">{availablePapers.length} رکورد یافت شد</div>
            </div>

            {selectedWarehouse && selectedWidth !== null && warehouseRollSummary.missing_roll_count > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900 space-y-2">
                <div>
                  از بین {warehouseRollSummary.external_roll_numbers_count} رول در خروجی انبار،
                  {' '}
                  {warehouseRollSummary.missing_roll_count} رول در دیتابیس موجود نیست.
                </div>
                {warehouseRollSummary.missing_roll_count > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowMissingRollDetails(prev => !prev)}
                    className="text-blue-700 hover:text-blue-900 underline"
                  >
                    {showMissingRollDetails ? 'بستن جزئیات رول‌های ناموجود' : 'نمایش جزئیات رول‌های ناموجود'}
                  </button>
                )}
                {showMissingRollDetails && warehouseRollSummary.missing_roll_numbers.length > 0 && (
                  <div className="max-h-32 overflow-y-auto bg-white border border-blue-200 rounded p-2 text-xs text-blue-800">
                    {warehouseRollSummary.missing_roll_numbers.join('، ')}
                  </div>
                )}
              </div>
            )}
            
            {/* Show warning for used papers when in only_unused mode */}
            {onlyUnused && usedPapersInfo.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <div className="font-medium text-amber-800 mb-2">
                      رول‌های زیر قبلاً استفاده شده‌اند:
                    </div>
                    <div className="space-y-1">
                      {usedPapersInfo.map((info) => (
                        <div key={info.paper_id} className="text-sm text-amber-700">
                          <span className="font-medium">{info.roll_number}</span>
                          <span className="mx-1">←</span>
                          <span>استفاده شده در QC-{info.used_in_qc_ids.join('، QC-')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-1 pl-1 sm:pl-0 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
              {sortedPapers.map((paper) => {
                // Match by roll_number instead of ID since IDs might be different
                const isSelected = workflowData.selectedPapers.some(p => p.roll_number === paper.roll_number);
                const productionLineColors = getProductionLineColors(paper.ProductionLine);
                const productionLineBorder = paper.ProductionLine === 2
                  ? 'border-blue-200'
                  : paper.ProductionLine === 3
                    ? 'border-green-200'
                    : paper.ProductionLine === 4
                      ? 'border-purple-200'
                      : 'border-gray-200';
                //console.log(`DEBUG - Paper ${paper.roll_number} (ID: ${paper.id}) selected:`, isSelected);
                //console.log(`DEBUG - Selected roll numbers:`, workflowData.selectedPapers.map(p => p.roll_number));
                return (
                  <div
                    key={paper.id}
                    className={`flex items-center gap-2 p-1 border rounded-xl transition-all text-[15px] leading-snug shadow-sm min-h-[112px] ${
                      isSelected 
                        ? 'border-emerald-400 bg-gradient-to-br from-emerald-50/80 to-teal-50/70 shadow-emerald-100'
                        : 'border-slate-200 bg-gradient-to-br from-white to-slate-50/70 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      id={`paper-${paper.id}`}
                      checked={isSelected}
                      onChange={(e) => handlePaperSelection(paper, e.target.checked)}
                      className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500 hidden"
                    />
                    <label htmlFor={`paper-${paper.id}`} className="flex-1 cursor-pointer text-gray-800 min-w-0 space-y-1.5">
                      <div className="grid grid-cols-1 gap-1.5 text-center w-full">
                        <p style={{direction: 'rtl', textWrap: 'nowrap', display: 'flex',width:"100%", alignItems: 'center'}}>
                          <span className='text-center' style={{width:"30%"}}>شماره رول</span> - 
                          <span className='text-center' style={{width:"20%"}}>خط</span> - 
                          <span className='text-center' style={{width:"20%"}}>عرض</span> -
                          <span className='text-center' style={{width:"30%"}}>
                            تاریخ
                          </span>
                        </p>
                        <p style={{direction: 'rtl', textWrap: 'nowrap', display: 'flex',width:"100%", alignItems: 'center'}}>
                          <span className='text-center' style={{width:"30%"}}>{paper.roll_number || '-'}</span> - 
                          <span className='text-center' style={{width:"20%"}}>{productionLineColors.label}</span> - 
                          <span className='text-center' style={{width:"20%"}}>{paper.paper_size || '-'}</span> -
                          <span className='text-center' style={{width:"30%"}}>
                          {(() => {
                            if (!paper.created_at) return '-';
                            const parsedDate = new Date(paper.created_at);
                            if (Number.isNaN(parsedDate.getTime())) return paper.created_at;
                            const msPerDay = 24 * 60 * 60 * 1000;
                            const daysAgo = Math.max(0, Math.floor((Date.now() - parsedDate.getTime()) / msPerDay));
                            return `${daysAgo == 1 ? "دیروز" : daysAgo == 0 ? "امروز" : daysAgo + " روز قبل"}`
                            return `${daysAgo} روز${daysAgo === 1 ? '' : ''} قبل`;
                          })()}
                          </span>
                        </p>
                      </div>
                      <div className="grid grid-cols-1 gap-1.5 text-center w-full">
                        <p style={{direction: 'ltr', textWrap: 'nowrap', display: 'flex',width:"100%", alignItems: 'center'}}>
                          <span className='text-center mx-1' style={{width:"10%"}}>GSM </span> - 
                          <span className='text-center' style={{width:"23%"}}>Moisture</span> - 
                          <span className='text-center' style={{width:"17%"}}>COBB</span> - 
                          <span className='text-center' style={{width:"20%"}}>Break</span> - 
                          <span className='text-center' style={{width:"20%"}}>Burst</span> - 
                          <span className='text-center' style={{width:"10%"}}>MD </span>
                        </p>
                        <p style={{direction: 'ltr', textWrap: 'nowrap', display: 'flex',width:"100%", alignItems: 'center'}}>
                          <span className='text-center mx-1' style={{width:"10%"}}>{paper.real_grammage ?? '-'}</span> - 
                          <span className='text-center' style={{width:"23%"}}>{paper.humidity ?? '-'} %</span> - 
                          <span className='text-center' style={{width:"17%"}}>{paper.cub ?? '-'}</span> - 
                          <span className='text-center' style={{width:"20%"}}>{paper.NumberOfTears ?? '_'}</span> - 
                          <span className='text-center' style={{width:"20%"}}>{paper.burst_test ?? '-'}</span> - 
                          <span className='text-center' style={{width:"10%"}}>{paper.tensile_strength_md ?? '-'}</span>
                        </p>
                      </div>
                    </label>
                  </div>
                );
              })}
            </div>
            
            {availablePapers.length === 0 && !isLoading && (
              <div className="text-center py-8 text-gray-500">
                {rollNumberSearch 
                  ? `هیچ رکوردی با شماره رول "${rollNumberSearch}" یافت نشد` 
                  : (selectedWarehouse && selectedWidth !== null
                    ? 'هیچ رکورد کاغذی برای انبار و عرض انتخاب شده یافت نشد'
                    : 'ابتدا انبار و عرض را انتخاب کنید')
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

            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="px-3 py-1.5 rounded-md border border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100 text-slate-700">
                انبار: {selectedWarehouse || '-'}
              </span>
              <span className="px-3 py-1.5 rounded-md border border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100 text-slate-700">
                عرض: {selectedWidth ?? '-'}
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
              {workflowData.selectedPapers.map((paper) => {
                const productionLineColors = getProductionLineColors(paper.ProductionLine);
                const productionLineBorder = paper.ProductionLine === 2
                  ? 'border-blue-200'
                  : paper.ProductionLine === 3
                    ? 'border-green-200'
                    : paper.ProductionLine === 4
                      ? 'border-purple-200'
                      : 'border-gray-200';
                return (
                <div
                  key={paper.id}
                  className="p-3.5 border rounded-xl transition-all text-[15px] leading-snug shadow-sm min-h-[112px] border-slate-200 bg-gradient-to-br from-white to-slate-50/70 hover:border-slate-300"
                >
                  <div className="text-gray-800 min-w-0 space-y-1.5">
                  <div className="grid grid-cols-1 gap-1.5 text-center w-full">
                        <p style={{direction: 'rtl', textWrap: 'nowrap', display: 'flex',width:"100%", alignItems: 'center'}}>
                          <span className='text-center' style={{width:"30%"}}>شماره رول</span> - 
                          <span className='text-center' style={{width:"20%"}}>خط</span> - 
                          <span className='text-center' style={{width:"20%"}}>عرض</span> -
                          <span className='text-center' style={{width:"30%"}}>
                            تاریخ
                          </span>
                        </p>
                        <p style={{direction: 'rtl', textWrap: 'nowrap', display: 'flex',width:"100%", alignItems: 'center'}}>
                          <span className='text-center' style={{width:"30%"}}>{paper.roll_number || '-'}</span> - 
                          <span className='text-center' style={{width:"20%"}}>{productionLineColors.label}</span> - 
                          <span className='text-center' style={{width:"20%"}}>{paper.paper_size || '-'}</span> -
                          <span className='text-center' style={{width:"30%"}}>
                          {(() => {
                            if (!paper.created_at) return '-';
                            const parsedDate = new Date(paper.created_at);
                            if (Number.isNaN(parsedDate.getTime())) return paper.created_at;
                            const msPerDay = 24 * 60 * 60 * 1000;
                            const daysAgo = Math.max(0, Math.floor((Date.now() - parsedDate.getTime()) / msPerDay));
                            return `${daysAgo == 1 ? "دیروز" : daysAgo == 0 ? "امروز" : daysAgo + " روز قبل"}`
                            return `${daysAgo} روز${daysAgo === 1 ? '' : ''} قبل`;
                          })()}
                          </span>
                        </p>
                      </div>
                      <div className="grid grid-cols-1 gap-1.5 text-center w-full">
                        <p style={{direction: 'ltr', textWrap: 'nowrap', display: 'flex',width:"100%", alignItems: 'center'}}>
                          <span className='text-center mx-1' style={{width:"10%"}}>GSM </span> - 
                          <span className='text-center' style={{width:"23%"}}>Moisture</span> - 
                          <span className='text-center' style={{width:"17%"}}>COBB</span> - 
                          <span className='text-center' style={{width:"20%"}}>Break</span> - 
                          <span className='text-center' style={{width:"20%"}}>Burst</span> - 
                          <span className='text-center' style={{width:"10%"}}>MD </span>
                        </p>
                        <p style={{direction: 'ltr', textWrap: 'nowrap', display: 'flex',width:"100%", alignItems: 'center'}}>
                          <span className='text-center mx-1' style={{width:"10%"}}>{paper.real_grammage ?? '-'}</span> - 
                          <span className='text-center' style={{width:"23%"}}>{paper.humidity ?? '-'} %</span> - 
                          <span className='text-center' style={{width:"17%"}}>{paper.cub ?? '-'}</span> - 
                          <span className='text-center' style={{width:"20%"}}>{paper.NumberOfTears ?? '0'}</span> - 
                          <span className='text-center' style={{width:"20%"}}>{paper.burst_test ?? '-'}</span> - 
                          <span className='text-center' style={{width:"10%"}}>{paper.tensile_strength_md ?? '-'}</span>
                        </p>
                      </div>
                  </div>
                </div>
              )})}
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
        //console.log('DEBUG - Step 4 loading data:', workflowData.loading);
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
                  {renderCustomValueOption(
                    typeof workflowData.loading.grammage === 'number' ? workflowData.loading.grammage : undefined,
                    [125]
                  )}
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
                  {renderCustomValueOption(
                    typeof workflowData.loading.width === 'number' ? workflowData.loading.width : undefined,
                    [120, 130, 140, 200, 210, 220, 230, 240]
                  )}
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
                  {renderCustomValueOption(
                    typeof workflowData.loading.humidity === 'number' ? workflowData.loading.humidity : undefined,
                    [6, 7]
                  )}
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
                  {renderCustomValueOption(
                    typeof workflowData.loading.burst === 'number' ? workflowData.loading.burst : undefined,
                    [300]
                  )}
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
                  COBB
                </label>
                <select
                  value={otherSelected.cub ? 'other' : (workflowData.loading.cub ? String(workflowData.loading.cub) : '')}
                  onChange={(e) => handleDropdownChange('cub', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">انتخاب کنید</option>
                  <option value="30">25 - 35</option>
                  {renderCustomValueOption(
                    typeof workflowData.loading.cub === 'number' ? workflowData.loading.cub : undefined,
                    [30]
                  )}
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
                  {renderCustomValueOption(
                    typeof workflowData.loading.md === 'number' ? workflowData.loading.md : undefined,
                    [100]
                  )}
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
                  {renderCustomValueOption(
                    typeof workflowData.loading.cd === 'number' ? workflowData.loading.cd : undefined,
                    [45]
                  )}
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
            
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => setIsPreviewOpen(true)}
                className="w-full px-6 py-3 border border-primary-600 text-primary-600 rounded-md hover:bg-primary-50 transition-colors flex items-center justify-center gap-2"
              >
                <Eye className="w-4 h-4" />
                پیش‌نمایش چاپ
              </button>
              
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
    <div className="mx-auto p-1 pb-28">
      {/* Header with Back Button */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <button
            onClick={handleCancel}
            className="flex items-center gap-2 text-xs sm:text-sm px-2 sm:px-4 py-2 bg-red-600 text-white font-bold hover:bg-red-700 rounded-lg transition-colors"
          >
            <ArrowLeft className=" w-4 h-4" />
            بازگشت به لیست
          </button>
          <div className="h-6 w-px bg-gray-300"></div>
          <h1 className="text-base sm:text-lg md:text-2xl font-bold text-gray-900">
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
        <div className="flex items-start sm:items-center justify-between mb-4">
          {steps.map((step, index) => (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium ${
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
                <div className="mt-2 text-xs sm:text-sm text-center max-w-20">
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
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-6 mb-6">
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
        <div className="sticky bottom-4 z-30 flex justify-between items-center px-4 py-3 rounded-xl border border-gray-200 bg-white/95 backdrop-blur shadow-lg">
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

      {isPreviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
          <div className="relative w-full max-w-6xl max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900">پیش‌نمایش چاپ</h3>
                <p className="text-sm text-gray-500 mt-1">
                  پیش از ذخیره، نمای کلی نسخه چاپی را بررسی کنید.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              {previewPrintData ? (
                <div className="max-h-[70vh] overflow-auto border border-gray-200 rounded-lg bg-white">
                  <QCPrintContent
                    data={previewPrintData}
                    showControls={false}
                    allowColumnReorder
                  />
                </div>
              ) : (
                <div className="text-sm text-gray-500">
                  برای مشاهده پیش‌نمایش، ابتدا رکوردها و فیلدهای مورد نیاز را تکمیل کنید.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
