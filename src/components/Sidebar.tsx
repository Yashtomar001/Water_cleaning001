import { Waves, AlertTriangle, Radio, BarChart3, FlaskConical, Database, LayoutDashboard, BookOpen, LogOut, User as UserIcon } from 'lucide-react';
import { useAuth } from '@/lib/auth';

export type ViewKey = 'dashboard' | 'feed' | 'lakes' | 'prediction' | 'alerts' | 'analytics' | 'learn';

export interface NavItem {
  key: ViewKey;
  label: string;
  icon: typeof LayoutDashboard;
}

export const NAV_ITEMS: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'feed', label: 'Sensor Feed', icon: Radio },
  { key: 'lakes', label: 'Lake Explorer', icon: Database },
  { key: 'prediction', label: 'Prediction Lab', icon: FlaskConical },
  { key: 'alerts', label: 'Early Warnings', icon: AlertTriangle },
  { key: 'analytics', label: 'Analytics', icon: BarChart3 },
  { key: 'learn', label: 'Learn & Revive', icon: BookOpen },
];

interface SidebarProps {
  active: ViewKey;
  onNavigate: (view: ViewKey) => void;
  alertCount: number;
}

export function Sidebar({ active, onNavigate, alertCount }: SidebarProps) {
  const { user, signOut } = useAuth();
  const userName = (user?.user_metadata as { full_name?: string } | null)?.full_name ?? user?.email ?? '';
  const initials = userName
    ? userName.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? 'U';

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-ink-900 text-ink-100 fixed inset-y-0 left-0 z-30">
      <div className="px-5 py-6 border-b border-ink-700/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-400 to-teal-500 flex items-center justify-center shadow-lg">
            <Waves className="w-5 h-5 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-sm font-display font-bold text-white leading-tight">PhytoWatch</h1>
            <p className="text-[10px] text-ink-400 leading-tight">Bloom Prediction System</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onNavigate(item.key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-primary-600 text-white shadow-md'
                  : 'text-ink-300 hover:bg-ink-800 hover:text-white'
              }`}
            >
              <Icon className="w-4.5 h-4.5 flex-shrink-0" size={18} />
              <span className="flex-1 text-left">{item.label}</span>
              {item.key === 'alerts' && alertCount > 0 && (
                <span className="bg-danger-500 text-white text-[10px] font-bold rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center">
                  {alertCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* User section */}
      <div className="px-3 py-3 border-t border-ink-700/50">
        <div className="flex items-center gap-3 px-2 py-2 rounded-xl bg-ink-800/50">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary-400 to-teal-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">{userName}</p>
            <p className="text-[10px] text-ink-400 flex items-center gap-1">
              <UserIcon className="w-2.5 h-2.5" /> Member
            </p>
          </div>
          <button
            onClick={() => signOut()}
            className="w-7 h-7 rounded-lg hover:bg-ink-700 flex items-center justify-center text-ink-400 hover:text-danger-400 transition-colors"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="px-5 py-3 border-t border-ink-700/50">
        <div className="text-[10px] text-ink-400 leading-relaxed">
          <p className="font-semibold text-ink-300 mb-0.5">ML Model v1.0</p>
          <p>Logistic Regression · 7 features</p>
          <p className="mt-1 text-ink-500">India Water Bodies · 94 sites</p>
        </div>
      </div>
    </aside>
  );
}

interface MobileNavProps {
  active: ViewKey;
  onNavigate: (view: ViewKey) => void;
  alertCount: number;
}

export function MobileNav({ active, onNavigate, alertCount }: MobileNavProps) {
  const items = NAV_ITEMS.slice(0, 7);
  return (
    <div className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-ink-900 border-t border-ink-700/50 px-1 py-2 flex justify-around overflow-x-auto">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = active === item.key;
        return (
          <button
            key={item.key}
            onClick={() => onNavigate(item.key)}
            className={`relative flex flex-col items-center gap-1 px-1.5 py-1 rounded-lg transition-colors flex-shrink-0 ${
              isActive ? 'text-primary-400' : 'text-ink-400'
            }`}
          >
            <Icon size={20} />
            <span className="text-[8px] font-medium whitespace-nowrap">{item.label.split(' ')[0]}</span>
            {item.key === 'alerts' && alertCount > 0 && (
              <span className="absolute top-0 right-0 bg-danger-500 text-white text-[8px] font-bold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center" />
            )}
          </button>
        );
      })}
    </div>
  );
}
