import React, { useState, useEffect } from 'react';
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
import type { User, AppSection, Paper, Pulp, Material, ProductionMachine, QCRecord, PaperTypeItem } from './types';
import { useCurrentUser, useLogin, useLogout, useCreatePaper, useUpdatePaper, useCreatePulp, useUpdatePulp, useCreateMaterial, useUpdateMaterial, useCreateProductionMachine, useUpdateProductionMachine, useCreatePaperType, useUpdatePaperType } from './hooks/useAPI';
import { paperAPI } from './utils/api';

function App() {
  // App state
  const [currentSection, setCurrentSection] = useState<AppSection>('dashboard');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
  const handleCreateQC = () => {
    setEditingQCRecord(undefined);
    setShowQCWorkflow(true);
  };

  const handleViewQC = (qcRecord: QCRecord) => {
    setViewingQCRecord(qcRecord);
    setShowQCView(true);
  };

  const handleEditQC = (qcRecord: QCRecord) => {
    setEditingQCRecord(qcRecord);
    setShowQCWorkflow(true);
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

  // Show loading screen
  if (isLoading || userLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">در حال بارگذاری...</p>
        </div>
      </div>
    );
  }

  // Show login page if not authenticated
  if (!currentUser) {
    return (
      <ToastProvider>
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

    // Material section
    if (currentSection === 'material') {
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
      return (
        <MaterialList
          onEdit={handleEditMaterial}
          onView={handleViewMaterial}
          onCreate={handleCreateMaterial}
        />
      );
    }

    // Production Machine section
    if (currentSection === 'production-machine') {
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
      return (
        <ProductionMachineList
          onEdit={handleEditProductionMachine}
          onView={handleViewProductionMachine}
          onCreate={handleCreateProductionMachine}
        />
      );
    }

    // Paper Type section
    if (currentSection === 'paper-type') {
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
      return (
        <PaperTypeList
          onEdit={handleEditPaperType}
          onView={handleViewPaperType}
          onCreate={handleCreatePaperType}
        />
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

    // Default: Dashboard
    return <Dashboard />;
  };

  return (
    <ToastProvider>
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