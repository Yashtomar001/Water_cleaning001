import { useState } from 'react';
import { Waves, Mail, Lock, User, ArrowRight, AlertCircle, Loader2, Droplets } from 'lucide-react';
import { useAuth } from '@/lib/auth';

export function AuthPage() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      setLoading(false);
      return;
    }

    const result = mode === 'login'
      ? await signIn(email, password)
      : await signUp(email, password, fullName);

    if (result.error) {
      setError(result.error);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-ink-900 via-primary-900 to-teal-900 text-white p-12 flex-col justify-between overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <Waves className="absolute -right-12 -top-12 w-96 h-96" />
          <Droplets className="absolute -left-8 bottom-20 w-64 h-64" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-400 to-teal-500 flex items-center justify-center shadow-lg">
              <Waves className="w-6 h-6 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-lg font-display font-bold text-white">PhytoWatch</h1>
              <p className="text-xs text-ink-400">Bloom Prediction System</p>
            </div>
          </div>

          <h2 className="text-3xl font-display font-bold leading-tight mb-4">
            Protecting India's<br />Water Ecosystems
          </h2>
          <p className="text-ink-300 text-sm leading-relaxed max-w-md">
            AI-powered phytoplankton bloom prediction across 94 Indian lakes, rivers, and reservoirs.
            Monitor water quality, identify high-risk areas, and take early action to preserve aquatic life.
          </p>
        </div>

        <div className="relative z-10 space-y-4">
          <FeatureRow text="Real-time monitoring of 94 water bodies across 20+ states" />
          <FeatureRow text="Machine learning bloom probability predictions" />
          <FeatureRow text="Interactive spatial risk mapping & early warnings" />
          <FeatureRow text="Learn how to revive water bodies near you" />
        </div>

        <div className="relative z-10 text-xs text-ink-500">
          National Monitoring Network · ML Model v1.0
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-ink-50">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary-400 to-teal-500 flex items-center justify-center shadow-lg">
              <Waves className="w-5.5 h-5.5 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-base font-display font-bold text-ink-900">PhytoWatch</h1>
              <p className="text-[10px] text-ink-500">Bloom Prediction System</p>
            </div>
          </div>

          <div className="card p-8">
            <h2 className="text-2xl font-display font-bold text-ink-900 mb-1">
              {mode === 'login' ? 'Welcome back' : 'Create your account'}
            </h2>
            <p className="text-sm text-ink-500 mb-6">
              {mode === 'login'
                ? 'Sign in to access the bloom prediction dashboard.'
                : 'Join the network to monitor and protect water bodies.'}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <div>
                  <label className="block text-xs font-semibold text-ink-600 mb-1.5">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter your full name"
                      className="input pl-9"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-ink-600 mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="input pl-9"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-600 mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="input pl-9"
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-danger-50 border border-danger-200 text-danger-700 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-3 text-base"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Please wait...</>
                ) : (
                  <>
                    {mode === 'login' ? 'Sign In' : 'Create Account'}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-ink-500">
              {mode === 'login' ? (
                <>
                  Don't have an account?{' '}
                  <button
                    onClick={() => { setMode('signup'); setError(null); }}
                    className="font-semibold text-primary-600 hover:text-primary-700"
                  >
                    Sign up
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <button
                    onClick={() => { setMode('login'); setError(null); }}
                    className="font-semibold text-primary-600 hover:text-primary-700"
                  >
                    Sign in
                  </button>
                </>
              )}
            </div>
          </div>

          <p className="text-center text-xs text-ink-400 mt-6">
            By continuing, you agree to use this platform for environmental monitoring purposes.
          </p>
        </div>
      </div>
    </div>
  );
}

function FeatureRow({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
        <Droplets className="w-4 h-4 text-primary-300" />
      </div>
      <p className="text-sm text-ink-200">{text}</p>
    </div>
  );
}
