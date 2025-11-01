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
import { LogsList } from './components/logs/LogsList';
import { ReportPage } from './components/report/ReportPage';
import { TechnicalReport } from './components/report/TechnicalReport';
import type { User, AppSection, Paper, Pulp, Material } from './types';
import { useCurrentUser, useLogin, useLogout, useCreatePaper, useUpdatePaper, useCreatePulp, useUpdatePulp, useCreateMaterial, useUpdateMaterial } from './hooks/useAPI';
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
  const [viewingPaper, setViewingPaper] = useState<Paper | undefined>();
  const [viewingPulp, setViewingPulp] = useState<Pulp | undefined>();
  const [viewingMaterial, setViewingMaterial] = useState<Material | undefined>();
  const [showPaperForm, setShowPaperForm] = useState(false);
  const [showPulpForm, setShowPulpForm] = useState(false);
  const [showMaterialForm, setShowMaterialForm] = useState(false);
  const [showPaperView, setShowPaperView] = useState(false);
  const [showPulpView, setShowPulpView] = useState(false);
  const [showMaterialView, setShowMaterialView] = useState(false);

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
      // Fetch the full paper data for viewing
      const fullPaper = await paperAPI.get(paper.id);
      setViewingPaper(fullPaper);
      setShowPaperView(true);
    } catch (error) {
      console.error('Failed to fetch full paper data:', error);
      // Fallback to using the limited data if fetch fails
      setViewingPaper(paper);
      setShowPaperView(true);
    }
  };

  const handleEditPaper = async (paper: Paper) => {
    try {
      // Fetch the full paper data for editing
      const fullPaper = await paperAPI.get(paper.id);
      setEditingPaper(fullPaper);
      setShowPaperForm(true);
    } catch (error) {
      console.error('Failed to fetch full paper data:', error);
      // Fallback to using the limited data if fetch fails
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
    setViewingPulp(pulp);
    setShowPulpView(true);
  };

  const handleEditPulp = (pulp: Pulp) => {
    setEditingPulp(pulp);
    setShowPulpForm(true);
  };

  const handleSavePulp = async (pulpData: Omit<Pulp, 'id' | 'created_at' | 'last_updated'>) => {
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