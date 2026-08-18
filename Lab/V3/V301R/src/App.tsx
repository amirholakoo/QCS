import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ToastProvider } from './components/common/Toast';
import { Header } from './components/layout/Header';
import { Layout } from './components/layout/Layout';
import { LoginPage } from './components/auth/LoginPage';
import { Dashboard } from './components/dashboard/Dashboard';
import { PaperList } from './components/paper/PaperList';
import { PaperForm } from './components/paper/PaperForm';
import { PulpList } from './components/pulp/PulpList';
import { PulpForm } from './components/pulp/PulpForm';
import { MaterialList } from './components/material/MaterialList';
import { MaterialForm } from './components/material/MaterialForm';
import { ProductionMachineList } from './components/productionmachine/ProductionMachineList';
import { ProductionMachineForm } from './components/productionmachine/ProductionMachineForm';
import { PaperTypeList } from './components/papertype/PaperTypeList';
import { PaperTypeForm } from './components/papertype/PaperTypeForm';
import { LogsList } from './components/logs/LogsList';
import { ReportPage } from './components/report/ReportPage';
import { TechnicalReport } from './components/report/TechnicalReport';
import { CompleteReport } from './components/report/CompleteReport';
import { QCWorkflow } from './components/qc/QCWorkflow';
import { QCList } from './components/qc/QCList';
import { QCView } from './components/qc/QCView';
import { QCPrintPage } from './components/qc/QCPrintPage';
import { SpeedPage } from './components/speed/SpeedPage';
import { VersionChecker } from './components/common/VersionChecker';
import OfflineBanner from './components/common/OfflineBanner';
import { UpdateDetailsModal } from './components/common/UpdateDetailsModal';
import { UpdatingPage } from './components/common/UpdatingPage';
import type { User, AppSection, Paper, Pulp, Material, ProductionMachine, QCRecord, PaperTypeItem } from './types';
import { useCurrentUser, useLogin, useLogout, useCreatePaper, useUpdatePaper, useCreatePulp, useUpdatePulp, useCreateMaterial, useUpdateMaterial, useCreateProductionMachine, useUpdateProductionMachine, useCreatePaperType, useUpdatePaperType } from './hooks/useAPI';
import { paperAPI, authAPI, qcAPI } from './utils/api';
import { hasPageAccess } from './utils/permissions';

function App() {
  const { t } = useTranslation();
  // App state
  const [currentSection, setCurrentSection] = useState<AppSection>('dashboard');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState<{
    is_updating: boolean;
    timer_seconds: number;
    message: string;
  } | null>(null);

  // Form states
  const [editingPaper, setEditingPaper] = useState<Paper | undefined>();
  const [editingPulp, setEditingPulp] = useState<Pulp | undefined>();
  const [editingMaterial, setEditingMaterial] = useState<Material | undefined>();
  const [editingProductionMachine, setEditingProductionMachine] = useState<ProductionMachine | undefined>();
  const [editingPaperType, setEditingPaperType] = useState<PaperTypeItem | undefined>();
  const [viewingPaper, setViewingPaper] = useState<Paper | undefined>();
  const [viewingPulp, setViewingPulp] = useState<Pulp | undefined>();
  const [viewingMaterial, setViewingMaterial] = useState<Material | undefined>();
  const [viewingProductionMachine, setViewingProductionMachine] = useState<ProductionMachine | undefined>();
  const [viewingPaperType, setViewingPaperType] = useState<PaperTypeItem | undefined>();
  const [showPaperForm, setShowPaperForm] = useState(false);
  const [showPulpForm, setShowPulpForm] = useState(false);
  const [showMaterialForm, setShowMaterialForm] = useState(false);
  const [showProductionMachineForm, setShowProductionMachineForm] = useState(false);
  const [showPaperTypeForm, setShowPaperTypeForm] = useState(false);
  const [showPaperView, setShowPaperView] = useState(false);
  const [showPulpView, setShowPulpView] = useState(false);
  const [showMaterialView, setShowMaterialView] = useState(false);
  const [showProductionMachineView, setShowProductionMachineView] = useState(false);
  const [showPaperTypeView, setShowPaperTypeView] = useState(false);

  // Settings page internal tab state
  const [settingsTab, setSettingsTab] = useState<'material' | 'production-machine' | 'paper-type'>('material');

  // Update details modal state
  const [updateDetails, setUpdateDetails] = useState<string | null>(null);
  const [showUpdateDetailsModal, setShowUpdateDetailsModal] = useState(false);

  // QC states
  const [showQCWorkflow, setShowQCWorkflow] = useState(false);
  const [showQCView, setShowQCView] = useState(false);
  const [showQCPrint, setShowQCPrint] = useState(false);
  const [editingQCRecord, setEditingQCRecord] = useState<QCRecord | undefined>();
  const [viewingQCRecord, setViewingQCRecord] = useState<QCRecord | undefined>();
  const [printingQCRecordId, setPrintingQCRecordId] = useState<string | undefined>();

  // API hooks
  const { data: userData, loading: userLoading, refetch: refetchUser } = useCurrentUser();
  const { login, loading: loginLoading } = useLogin();
  const { logout } = useLogout();
  const { createPaper } = useCreatePaper();
  const { updatePaper } = useUpdatePaper();
  const { createPulp } = useCreatePulp();
  const { updatePulp } = useUpdatePulp();
  const { createMaterial } = useCreateMaterial();
  const { updateMaterial } = useUpdateMaterial();
  const { createProductionMachine } = useCreateProductionMachine();
  const { updateProductionMachine } = useUpdateProductionMachine();
  const { createPaperType } = useCreatePaperType();
  const { updatePaperType } = useUpdatePaperType();

  useEffect(() => {
    const fetchUpdatingStatus = async () => {
      try {
        const data = await authAPI.getUpdatingStatus();
        setUpdatingStatus({
          is_updating: data.is_updating,
          timer_seconds: data.timer_seconds ?? 0,
          message: data.message ?? '',
        });
      } catch {
        setUpdatingStatus({ is_updating: false, timer_seconds: 0, message: '' });
      }
    };
    fetchUpdatingStatus();
    const interval = setInterval(fetchUpdatingStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  // Check authentication on app load
  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (userData && userData.user) {
          setCurrentUser(userData.user);
        } else {
          setCurrentUser(null);
        }
      } catch (error) {
        console.log('User not authenticated');
        setCurrentUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    if (!userLoading) {
      checkAuth();
    }
  }, [userData, userLoading]);

  // Check for pending update details after page refresh
  useEffect(() => {
    const pendingDetails = sessionStorage.getItem('pending_update_details');
    if (pendingDetails) {
      setUpdateDetails(pendingDetails);
      setShowUpdateDetailsModal(true);
      sessionStorage.removeItem('pending_update_details');
    }
  }, []);

  useEffect(() => {
    const handleSessionExpired = () => {
      setCurrentUser(null);
    };
    window.addEventListener('app:sessionExpired', handleSessionExpired);
    return () => window.removeEventListener('app:sessionExpired', handleSessionExpired);
  }, []);

  // Check page access and redirect to dashboard if unauthorized
  useEffect(() => {
    if (currentUser ) {
      const hasAccess = hasPageAccess(currentUser, currentSection);
      if (!hasAccess) {
        setCurrentSection('dashboard');
      }
    }
  }, [currentUser, currentSection]);

  // Handle login
  const handleLogin = async (firstName: string, lastName: string) => {
    try {
      setIsLoading(true);
      const result = await login(firstName, lastName);
      if (result?.user) {
        setCurrentUser(result.user);
        await refetchUser();
      }
    } catch (error) {
      console.error('Login failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await logout();
      setCurrentUser(null);
      setCurrentSection('dashboard');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // Paper handlers
  const handleCreatePaper = () => {
    setEditingPaper(undefined);
    setShowPaperForm(true);
  };

  const handleViewPaper = async (paper: Paper) => {
    try {
      // Navigate to paper section first
      setCurrentSection('paper');
      // Fetch the full paper data for viewing
      const fullPaper = await paperAPI.get(paper.id);
      setViewingPaper(fullPaper);
      setShowPaperView(true);
    } catch (error) {
      console.error('Failed to fetch full paper data:', error);
      // Fallback to using the limited data if fetch fails
      setCurrentSection('paper');
      setViewingPaper(paper);
      setShowPaperView(true);
    }
  };

  const handleEditPaper = async (paper: Paper) => {
    try {
      // Navigate to paper section first
      setCurrentSection('paper');
      // Fetch the full paper data for editing
      const fullPaper = await paperAPI.get(paper.id);
      setEditingPaper(fullPaper);
      setShowPaperForm(true);
    } catch (error) {
      console.error('Failed to fetch full paper data:', error);
      // Fallback to using the limited data if fetch fails
      setCurrentSection('paper');
      setEditingPaper(paper);
      setShowPaperForm(true);
    }
  };

  const handleSavePaper = async (paperData: Omit<Paper, 'id' | 'created_at' | 'last_updated' | 'user'>) => {
    try {
      if (editingPaper) {
        await updatePaper(editingPaper.id, paperData);
      } else {
        await createPaper(paperData);
      }
      setShowPaperForm(false);
      setEditingPaper(undefined);
    } catch (error) {
      console.error('Failed to save paper:', error);
    }
  };

  const handleCancelPaperForm = () => {
    setShowPaperForm(false);
    setEditingPaper(undefined);
  };

  const handleClosePaperView = () => {
    setShowPaperView(false);
    setViewingPaper(undefined);
  };

  // Pulp handlers
  const handleCreatePulp = () => {
    setEditingPulp(undefined);
    setShowPulpForm(true);
  };

  const handleViewPulp = (pulp: Pulp) => {
    // Navigate to pulp section first
    setCurrentSection('pulp');
    setViewingPulp(pulp);
    setShowPulpView(true);
  };

  const handleEditPulp = (pulp: Pulp) => {
    // Navigate to pulp section first
    setCurrentSection('pulp');
    setEditingPulp(pulp);
    setShowPulpForm(true);
  };

  const handleSavePulp = async (pulpData: Omit<Pulp, 'id' | 'created_at' | 'last_updated'> & { sampling_location_data?: Array<{ title: string; value: string }> }) => {
    try {
      if (editingPulp) {
        await updatePulp(editingPulp.id, pulpData);
      } else {
        await createPulp(pulpData);
      }
      setShowPulpForm(false);
      setEditingPulp(undefined);
    } catch (error) {
      console.error('Failed to save pulp:', error);
    }
  };

  const handleCancelPulpForm = () => {
    setShowPulpForm(false);
    setEditingPulp(undefined);
  };

  const handleClosePulpView = () => {
    setShowPulpView(false);
    setViewingPulp(undefined);
  };

  // Material handlers
  const handleCreateMaterial = () => {
    setEditingMaterial(undefined);
    setShowMaterialForm(true);
  };

  const handleViewMaterial = (material: Material) => {
    setViewingMaterial(material);
    setShowMaterialView(true);
  };

  const handleEditMaterial = (material: Material) => {
    setEditingMaterial(material);
    setShowMaterialForm(true);
  };

  const handleSaveMaterial = async (materialData: Omit<Material, 'id' | 'created_at' | 'last_updated'>) => {
    try {
      if (editingMaterial) {
        await updateMaterial(editingMaterial.id, materialData);
      } else {
        await createMaterial(materialData);
      }
      setShowMaterialForm(false);
      setEditingMaterial(undefined);
    } catch (error) {
      console.error('Failed to save material:', error);
    }
  };

  const handleCancelMaterialForm = () => {
    setShowMaterialForm(false);
    setEditingMaterial(undefined);
  };

  const handleCloseMaterialView = () => {
    setShowMaterialView(false);
    setViewingMaterial(undefined);
  };

  // Production Machine handlers
  const handleCreateProductionMachine = () => {
    setEditingProductionMachine(undefined);
    setShowProductionMachineForm(true);
  };

  const handleViewProductionMachine = (machine: ProductionMachine) => {
    setViewingProductionMachine(machine);
    setShowProductionMachineView(true);
  };

  const handleEditProductionMachine = (machine: ProductionMachine) => {
    setEditingProductionMachine(machine);
    setShowProductionMachineForm(true);
  };

  const handleSaveProductionMachine = async (machineData: Omit<ProductionMachine, 'id' | 'created_at' | 'last_updated'>) => {
    try {
      if (editingProductionMachine) {
        await updateProductionMachine(editingProductionMachine.id, machineData);
      } else {
        await createProductionMachine(machineData);
      }
      setShowProductionMachineForm(false);
      setEditingProductionMachine(undefined);
    } catch (error) {
      console.error('Failed to save production machine:', error);
    }
  };

  const handleCancelProductionMachineForm = () => {
    setShowProductionMachineForm(false);
    setEditingProductionMachine(undefined);
  };

  const handleCloseProductionMachineView = () => {
    setShowProductionMachineView(false);
    setViewingProductionMachine(undefined);
  };

  // Paper Type handlers
  const handleCreatePaperType = () => {
    setEditingPaperType(undefined);
    setShowPaperTypeForm(true);
  };

  const handleViewPaperType = (paperType: PaperTypeItem) => {
    setViewingPaperType(paperType);
    setShowPaperTypeView(true);
  };

  const handleEditPaperType = (paperType: PaperTypeItem) => {
    setEditingPaperType(paperType);
    setShowPaperTypeForm(true);
  };

  const handleSavePaperType = async (paperTypeData: Omit<PaperTypeItem, 'id' | 'created_at' | 'last_updated'>) => {
    try {
      if (editingPaperType) {
        await updatePaperType(editingPaperType.id, paperTypeData);
      } else {
        await createPaperType(paperTypeData);
      }
      setShowPaperTypeForm(false);
      setEditingPaperType(undefined);
    } catch (error) {
      console.error('Failed to save paper type:', error);
    }
  };

  const handleCancelPaperTypeForm = () => {
    setShowPaperTypeForm(false);
    setEditingPaperType(undefined);
  };

  const handleClosePaperTypeView = () => {
    setShowPaperTypeView(false);
    setViewingPaperType(undefined);
  };

  // QC handlers
  const handleCreateQC = async () => {
    try {
      const response = await qcAPI.listRecords({ status: 'draft', page: '1' });
      const latestDraft = response.results?.[0];

      if (latestDraft) {
        const continueNew = window.confirm(
          'یک فرم پیش‌نویس ناتمام وجود دارد.\n\nOK: ایجاد فرم جدید\nCancel: ادامه پیش‌نویس'
        );

        if (continueNew) {
          setEditingQCRecord(undefined);
        } else {
          try {
            await qcAPI.acquireEditLock(latestDraft.id);
            setEditingQCRecord(latestDraft);
          } catch (lockError: any) {
            alert(lockError?.message || 'این فرم توسط کاربر دیگری در حال ویرایش است. لطفا بعدا تلاش کنید.');
            return;
          }
        }
      } else {
        setEditingQCRecord(undefined);
      }
    } catch (error) {
      console.error('Failed to load draft QC records:', error);
      setEditingQCRecord(undefined);
    }
    setShowQCWorkflow(true);
  };

  const handleViewQC = (qcRecord: QCRecord) => {
    setViewingQCRecord(qcRecord);
    setShowQCView(true);
  };

  const handleEditQC = (qcRecord: QCRecord) => {
    qcAPI.acquireEditLock(qcRecord.id)
      .then(() => {
        setEditingQCRecord(qcRecord);
        setShowQCWorkflow(true);
      })
      .catch((error: any) => {
        alert(error?.message || 'کاربر دیگری در حال ویرایش این فرم است. لطفا بعدا تلاش کنید.');
      });
  };

  const handleCompleteQC = (qcRecord: QCRecord) => {
    setShowQCWorkflow(false);
    setEditingQCRecord(undefined);
    // Optionally refresh the QC list or show success message
  };

  const handlePrintQC = (qcRecordId: string) => {
    setShowQCWorkflow(false);
    setEditingQCRecord(undefined);
    setPrintingQCRecordId(qcRecordId);
    setShowQCPrint(true);
  };

  const handleCancelQCWorkflow = () => {
    setShowQCWorkflow(false);
    setEditingQCRecord(undefined);
  };

  const handleClosePrintPage = () => {
    setShowQCPrint(false);
    setPrintingQCRecordId(undefined);
  };

  const handleCloseQCView = () => {
    setShowQCView(false);
    setViewingQCRecord(undefined);
  };

  const handleEditFromView = (qcRecord: QCRecord) => {
    setShowQCView(false);
    setViewingQCRecord(undefined);
    setEditingQCRecord(qcRecord);
    setShowQCWorkflow(true);
  };

  if (updatingStatus?.is_updating) {
    return (
      <UpdatingPage
        timerSeconds={updatingStatus.timer_seconds}
        message={updatingStatus.message || undefined}
      />
    );
  }

  if (updatingStatus === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (isLoading || userLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  // Show login page if not authenticated
  if (!currentUser) {
    return (
      <ToastProvider>
        <OfflineBanner />
        <LoginPage onLogin={handleLogin} />
      </ToastProvider>
    );
  }

  // Render main content based on current section
  const renderContent = () => {
    // Paper section
    if (currentSection === 'paper') {
      if (showPaperForm) {
        return (
          <PaperForm
            paper={editingPaper}
            onSave={handleSavePaper}
            onCancel={handleCancelPaperForm}
          />
        );
      }
      if (showPaperView) {
        return (
          <PaperForm
            paper={viewingPaper}
            onSave={() => {}} // No save in view mode
            onCancel={handleClosePaperView}
            readOnly={true}
          />
        );
      }
      return (
        <PaperList
          onEdit={handleEditPaper}
          onView={handleViewPaper}
          onCreate={handleCreatePaper}
        />
      );
    }

    // Pulp section
    if (currentSection === 'pulp') {
      if (showPulpForm) {
        return (
          <PulpForm
            pulp={editingPulp}
            onSave={handleSavePulp}
            onCancel={handleCancelPulpForm}
          />
        );
      }
      if (showPulpView) {
        return (
          <PulpForm
            pulp={viewingPulp}
            onSave={() => {}} // No save in view mode
            onCancel={handleClosePulpView}
            readOnly={true}
          />
        );
      }
      return (
        <PulpList
          onEdit={handleEditPulp}
          onView={handleViewPulp}
          onCreate={handleCreatePulp}
        />
      );
    }

    // Settings section (Materials, Production Machines, Paper Types)
    if (currentSection === 'settings') {
      // When a form/view is open, show it full-page based on active tab
      if (settingsTab === 'material') {
        if (showMaterialForm) {
          return (
            <MaterialForm
              material={editingMaterial}
              onSave={handleSaveMaterial}
              onCancel={handleCancelMaterialForm}
            />
          );
        }
        if (showMaterialView) {
          return (
            <MaterialForm
              material={viewingMaterial}
              onSave={() => {}} // No save in view mode
              onCancel={handleCloseMaterialView}
              readOnly={true}
            />
          );
        }
      }

      if (settingsTab === 'production-machine') {
        if (showProductionMachineForm) {
          return (
            <ProductionMachineForm
              machine={editingProductionMachine}
              onSave={handleSaveProductionMachine}
              onCancel={handleCancelProductionMachineForm}
            />
          );
        }
        if (showProductionMachineView) {
          return (
            <ProductionMachineForm
              machine={viewingProductionMachine}
              onSave={() => {}} // No save in view mode
              onCancel={handleCloseProductionMachineView}
              readOnly={true}
            />
          );
        }
      }

      if (settingsTab === 'paper-type') {
        if (showPaperTypeForm) {
          return (
            <PaperTypeForm
              paperType={editingPaperType}
              onSave={handleSavePaperType}
              onCancel={handleCancelPaperTypeForm}
            />
          );
        }
        if (showPaperTypeView) {
          return (
            <PaperTypeForm
              paperType={viewingPaperType}
              onSave={() => {}} // No save in view mode
              onCancel={handleClosePaperTypeView}
              readOnly={true}
            />
          );
        }
      }

      // Default settings view: tabbed lists
      return (
        <div className="space-y-8">
          <div className="flex justify-center">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1 inline-flex gap-1">
              <button
                type="button"
                onClick={() => setSettingsTab('material')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  settingsTab === 'material'
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {t('settings.materials')}
              </button>
              <button
                type="button"
                onClick={() => setSettingsTab('production-machine')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  settingsTab === 'production-machine'
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {t('settings.productionMachines')}
              </button>
              <button
                type="button"
                onClick={() => setSettingsTab('paper-type')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  settingsTab === 'paper-type'
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {t('settings.paperTypes')}
              </button>
            </div>
          </div>

          {settingsTab === 'material' && (
            <MaterialList
              onEdit={handleEditMaterial}
              onView={handleViewMaterial}
              onCreate={handleCreateMaterial}
            />
          )}

          {settingsTab === 'production-machine' && (
            <ProductionMachineList
              onEdit={handleEditProductionMachine}
              onView={handleViewProductionMachine}
              onCreate={handleCreateProductionMachine}
            />
          )}

          {settingsTab === 'paper-type' && (
            <PaperTypeList
              onEdit={handleEditPaperType}
              onView={handleViewPaperType}
              onCreate={handleCreatePaperType}
            />
          )}
        </div>
      );
    }

    // Logs section
    if (currentSection === 'logs') {
      return <LogsList />;
    }

    // Report section
    if (currentSection === 'report') {
      return <ReportPage />;
    }

    // Technical Report section
    if (currentSection === 'technical-report') {
      return <TechnicalReport />;
    }

    // QC section
    if (currentSection === 'qc') {
      if (showQCWorkflow) {
        return (
          <QCWorkflow
            editingRecord={editingQCRecord}
            onComplete={handleCompleteQC}
            onCancel={handleCancelQCWorkflow}
            onPrint={handlePrintQC}
          />
        );
      }
      if (showQCPrint && printingQCRecordId) {
        return (
          <QCPrintPage 
            qcRecordId={printingQCRecordId} 
            onClose={handleClosePrintPage}
          />
        );
      }
      if (showQCView && viewingQCRecord) {
        return (
          <QCView
            qcRecord={viewingQCRecord}
            onClose={handleCloseQCView}
            onEdit={handleEditFromView}
          />
        );
      }
      return (
        <QCList
          onEdit={handleEditQC}
          onView={handleViewQC}
          onCreate={handleCreateQC}
        />
      );
    }

    // Complete Report section
    if (currentSection === 'complete-report') {
      return (
        <CompleteReport
          onEditPaper={handleEditPaper}
          onViewPaper={handleViewPaper}
          onEditPulp={handleEditPulp}
          onViewPulp={handleViewPulp}
        />
      );
    }

    // Speed section
    if (currentSection === 'speed') {
      return <SpeedPage />;
    }

    // Default: Dashboard
    return <Dashboard />;
  };

  return (
    <ToastProvider>
      <OfflineBanner />
      <VersionChecker />
      <UpdateDetailsModal
        isOpen={showUpdateDetailsModal}
        onClose={() => setShowUpdateDetailsModal(false)}
        details={updateDetails || ''}
      />
      <div className="min-h-screen bg-gray-50">
        <Header
          currentUser={currentUser}
          currentSection={currentSection}
          onSectionChange={setCurrentSection}
          onLogout={handleLogout}
        />
        
        <Layout>
          {renderContent()}
        </Layout>
      </div>
    </ToastProvider>
  );
}

export default App;