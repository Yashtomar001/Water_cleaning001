import { useEffect, useState } from 'react';
import { Sidebar, MobileNav, type ViewKey } from '@/components/Sidebar';
import { Dashboard } from '@/components/Dashboard';
import { SensorFeed } from '@/components/SensorFeed';
import { LakeExplorer } from '@/components/LakeExplorer';
import { PredictionLab } from '@/components/PredictionLab';
import { EarlyWarnings } from '@/components/EarlyWarnings';
import { Analytics } from '@/components/Analytics';
import { Learn } from '@/components/Learn';
import { AuthPage } from '@/components/AuthPage';
import { AuthProvider, useAuth } from '@/lib/auth';
import { LiveDataProvider } from '@/lib/liveData';
import { fetchActiveAlerts } from '@/lib/dataAccess';
import { Spinner } from '@/components/ui';

function AppContent() {
  const { session, loading } = useAuth();
  const [view, setView] = useState<ViewKey>('dashboard');
  const [alertCount, setAlertCount] = useState(0);

  useEffect(() => {
    if (!session) return;
    const loadAlerts = async () => {
      try {
        const alerts = await fetchActiveAlerts();
        setAlertCount(alerts.length);
      } catch {
        // non-fatal
      }
    };
    loadAlerts();
    const interval = setInterval(loadAlerts, 30000);
    return () => clearInterval(interval);
  }, [session]);

  const handleNavigate = (v: ViewKey) => {
    setView(v);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ink-50">
        <Spinner size={40} />
      </div>
    );
  }

  if (!session) {
    return <AuthPage />;
  }

  return (
    <div className="min-h-screen bg-ink-50">
      <Sidebar active={view} onNavigate={handleNavigate} alertCount={alertCount} />

      <div className="lg:ml-64 pb-20 lg:pb-8">
        {/* Mobile header */}
        <header className="lg:hidden sticky top-0 z-20 bg-ink-900 text-white px-4 py-3 flex items-center gap-3 shadow-md">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-400 to-teal-500 flex items-center justify-center">
            <svg className="w-4.5 h-4.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M2 12c2-3 4-3 6 0s4 3 6 0 4-3 6 0" />
              <path d="M2 18c2-3 4-3 6 0s4 3 6 0 4-3 6 0" />
            </svg>
          </div>
          <div>
            <h1 className="text-sm font-display font-bold leading-tight">PhytoWatch</h1>
            <p className="text-[9px] text-ink-400 leading-tight">Bloom Prediction System</p>
          </div>
          {alertCount > 0 && (
            <span className="ml-auto bg-danger-500 text-white text-xs font-bold rounded-full min-w-[24px] h-6 px-2 flex items-center justify-center">
              {alertCount}
            </span>
          )}
        </header>

        <main className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
          {view === 'dashboard' && <Dashboard onNavigate={handleNavigate} />}
          {view === 'feed' && <SensorFeed />}
          {view === 'lakes' && <LakeExplorer />}
          {view === 'prediction' && <PredictionLab />}
          {view === 'alerts' && <EarlyWarnings onNavigate={handleNavigate} />}
          {view === 'analytics' && <Analytics />}
          {view === 'learn' && <Learn />}
        </main>
      </div>

      <MobileNav active={view} onNavigate={handleNavigate} alertCount={alertCount} />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <LiveDataProvider>
        <AppContent />
      </LiveDataProvider>
    </AuthProvider>
  );
}

export default App;
