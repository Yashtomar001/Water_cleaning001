import { useEffect, useState, useCallback } from 'react';
import { FlaskConical, Sliders, Play, RotateCcw, Brain, Zap, CheckCircle2 } from 'lucide-react';
import { fetchAllMonitoring } from '@/lib/dataAccess';
import type { MonitoringData } from '@/lib/supabase';
import {
  predictBloom, trainModel, generateTrainingLabels,
  type PredictionInput, type PredictionResult, type TrainingResult, type ModelWeights,
} from '@/lib/mlModel';
import { LoadingState, ErrorState, Gauge, probabilityColor } from './ui';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

const DEFAULT_INPUT: PredictionInput = {
  temperature_c: 28,
  ph: 8.2,
  dissolved_oxygen_mgl: 5.5,
  turbidity_ntu: 25,
  chlorophyll_a_ugl: 45,
  nitrate_mgl: 2.5,
  phosphate_mgl: 0.3,
};

const SLIDER_CONFIG: { key: keyof PredictionInput; label: string; min: number; max: number; step: number; unit: string; color: string }[] = [
  { key: 'chlorophyll_a_ugl', label: 'Chlorophyll-a', min: 0, max: 150, step: 1, unit: 'µg/L', color: '#ef4444' },
  { key: 'temperature_c', label: 'Water Temperature', min: 5, max: 40, step: 0.5, unit: '°C', color: '#f97316' },
  { key: 'nitrate_mgl', label: 'Nitrate', min: 0, max: 10, step: 0.1, unit: 'mg/L', color: '#f59e0b' },
  { key: 'phosphate_mgl', label: 'Phosphate', min: 0, max: 1.5, step: 0.01, unit: 'mg/L', color: '#ec4899' },
  { key: 'dissolved_oxygen_mgl', label: 'Dissolved Oxygen', min: 0, max: 14, step: 0.1, unit: 'mg/L', color: '#10b981' },
  { key: 'ph', label: 'pH Level', min: 4, max: 11, step: 0.1, unit: '', color: '#06b6d4' },
  { key: 'turbidity_ntu', label: 'Turbidity', min: 0, max: 80, step: 1, unit: 'NTU', color: '#8b5cf6' },
];

export function PredictionLab() {
  const [input, setInput] = useState<PredictionInput>(DEFAULT_INPUT);
  const [readings, setReadings] = useState<MonitoringData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [training, setTraining] = useState(false);
  const [trainResult, setTrainResult] = useState<TrainingResult | null>(null);
  const [weights, setWeights] = useState<ModelWeights | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAllMonitoring();
      setReadings(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load training data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleTrain = useCallback(async () => {
    if (readings.length === 0) return;
    setTraining(true);
    await new Promise((r) => setTimeout(r, 100));
    const labels = generateTrainingLabels(readings);
    const result = trainModel(labels, { epochs: 300, learningRate: 0.002 });
    setTrainResult(result);
    setWeights(result.weights);
    setTraining(false);
  }, [readings]);

  const handleReset = () => {
    setInput(DEFAULT_INPUT);
    setWeights(null);
    setTrainResult(null);
  };

  const prediction: PredictionResult = predictBloom(input, weights ?? undefined);

  if (loading) return <LoadingState message="Loading sensor data..." />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  const lossData = trainResult?.lossHistory.map((loss, i) => ({ epoch: i * 10, loss })) ?? [];

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h2 className="text-xl font-display font-bold flex items-center gap-2">
          <FlaskConical className="w-5 h-5 text-primary-600" /> Prediction Lab
        </h2>
        <p className="text-sm text-ink-500">
          Adjust environmental parameters to predict bloom probability. Train the regression model on {readings.length.toLocaleString('en-IN')} real sensor readings.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Input sliders */}
        <div className="card p-6 lg:col-span-3">
          <div className="flex items-center justify-between mb-5">
            <h3 className="section-title flex items-center gap-2">
              <Sliders className="w-4.5 h-4.5 text-primary-600" /> Environmental Parameters
            </h3>
            <button onClick={() => setInput(DEFAULT_INPUT)} className="text-xs font-medium text-ink-400 hover:text-ink-700 flex items-center gap-1">
              <RotateCcw className="w-3 h-3" /> Reset
            </button>
          </div>

          <div className="space-y-4">
            {SLIDER_CONFIG.map((cfg) => (
              <div key={cfg.key}>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-sm font-medium text-ink-700 flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cfg.color }} />
                    {cfg.label}
                  </label>
                  <span className="text-sm font-bold tabular-nums" style={{ color: cfg.color }}>
                    {input[cfg.key].toFixed(cfg.step < 1 ? 2 : 1)} <span className="text-xs text-ink-400 font-normal">{cfg.unit}</span>
                  </span>
                </div>
                <input
                  type="range"
                  min={cfg.min}
                  max={cfg.max}
                  step={cfg.step}
                  value={input[cfg.key]}
                  onChange={(e) => setInput((prev) => ({ ...prev, [cfg.key]: parseFloat(e.target.value) }))}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer slider-custom"
                  style={{
                    background: `linear-gradient(to right, ${cfg.color} 0%, ${cfg.color} ${((input[cfg.key] - cfg.min) / (cfg.max - cfg.min)) * 100}%, #e2e8f0 ${((input[cfg.key] - cfg.min) / (cfg.max - cfg.min)) * 100}%, #e2e8f0 100%)`,
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Prediction output */}
        <div className="card p-6 lg:col-span-2 flex flex-col">
          <h3 className="section-title mb-4">Model Prediction</h3>

          <div className="flex justify-center mb-4">
            <Gauge
              value={prediction.probability}
              label="Bloom Probability"
              color={probabilityColor(prediction.probability)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="p-3 rounded-xl bg-ink-50 text-center">
              <p className="text-[10px] uppercase tracking-wide text-ink-400 font-semibold">Intensity</p>
              <p className="text-base font-bold capitalize mt-0.5" style={{ color: probabilityColor(prediction.probability) }}>
                {prediction.intensity}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-ink-50 text-center">
              <p className="text-[10px] uppercase tracking-wide text-ink-400 font-semibold">Risk Level</p>
              <p className="text-base font-bold capitalize mt-0.5" style={{ color: probabilityColor(prediction.probability) }}>
                {prediction.riskLevel}
              </p>
            </div>
          </div>

          {/* Factor contributions */}
          <div className="pt-3 border-t border-ink-100">
            <p className="text-xs font-semibold text-ink-500 mb-2">Factor Contributions</p>
            <div className="space-y-1.5">
              {prediction.factorBreakdown.slice(0, 4).map((f) => (
                <div key={f.name} className="flex items-center gap-2 text-xs">
                  <span className="w-24 text-ink-600 flex-shrink-0">{f.name}</span>
                  <div className="flex-1 h-1.5 bg-ink-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(100, Math.abs(f.contribution) * 8)}%`,
                        backgroundColor: f.contribution > 0 ? '#ef4444' : '#10b981',
                      }}
                    />
                  </div>
                  <span className={`tabular-nums font-semibold w-10 text-right ${f.contribution > 0 ? 'text-danger-600' : 'text-accent-600'}`}>
                    {f.contribution > 0 ? '+' : ''}{f.contribution.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-ink-100 text-xs text-ink-400">
            <p>Model: {weights ? 'Trained (gradient descent)' : 'Default weights'}</p>
            {trainResult && <p>Accuracy: {(trainResult.accuracy * 100).toFixed(1)}% · Loss: {trainResult.finalLoss.toFixed(4)}</p>}
          </div>
        </div>
      </div>

      {/* Model Training */}
      <div className="card p-6">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <h3 className="section-title flex items-center gap-2">
            <Brain className="w-4.5 h-4.5 text-teal-600" /> Model Training
          </h3>
          <div className="flex gap-2">
            <button onClick={handleTrain} disabled={training} className="btn-primary">
              {training ? (
                <><Zap className="w-4 h-4 animate-pulse" /> Training...</>
              ) : (
                <><Play className="w-4 h-4" /> Train Model</>
              )}
            </button>
            <button onClick={handleReset} className="btn-ghost">
              <RotateCcw className="w-4 h-4" /> Reset Weights
            </button>
          </div>
        </div>

        <p className="text-sm text-ink-500 mb-4">
          Trains a logistic regression model using gradient descent on {readings.length.toLocaleString('en-IN')} sensor readings.
          Samples with chlorophyll-a &gt; 40 µg/L are labeled as bloom events.
        </p>

        {trainResult && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 animate-slide-up">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-5 h-5 text-accent-600" />
                <h4 className="font-display font-bold">Training Complete</h4>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <StatBox label="Training Samples" value={trainResult.samples.toString()} />
                <StatBox label="Epochs" value={trainResult.epochs.toString()} />
                <StatBox label="Final Loss" value={trainResult.finalLoss.toFixed(4)} />
                <StatBox label="Accuracy" value={`${(trainResult.accuracy * 100).toFixed(1)}%`} />
              </div>

              <div className="pt-3 border-t border-ink-100">
                <p className="text-xs font-semibold text-ink-500 mb-2">Learned Weights</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  {Object.entries(trainResult.weights).map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <span className="text-ink-600 capitalize">{k.replace(/_/g, ' ')}</span>
                      <span className="font-mono font-semibold text-ink-800">{v.toFixed(4)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-ink-500 mb-2">Loss Curve (training convergence)</p>
              <div style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={lossData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="epoch" tick={{ fontSize: 10, fill: '#64748b' }} label={{ value: 'Epoch', position: 'insideBottom', offset: -2, fontSize: 10, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                    <RTooltip contentStyle={{ borderRadius: '0.5rem', border: '1px solid #e2e8f0', fontSize: '11px' }} />
                    <ReferenceLine y={0} stroke="#cbd5e1" />
                    <Line type="monotone" dataKey="loss" stroke="#1c87f5" strokeWidth={2} name="Loss" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {!trainResult && !training && (
          <div className="text-center py-8 text-ink-400">
            <Brain className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Click "Train Model" to run gradient descent on the sensor data.</p>
          </div>
        )}
      </div>

      <style>{`
        .slider-custom::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: white;
          border: 2px solid #1c87f5;
          cursor: pointer;
          box-shadow: 0 1px 4px rgba(0,0,0,0.2);
          transition: transform 0.15s;
        }
        .slider-custom::-webkit-slider-thumb:hover {
          transform: scale(1.2);
        }
        .slider-custom::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: white;
          border: 2px solid #1c87f5;
          cursor: pointer;
          box-shadow: 0 1px 4px rgba(0,0,0,0.2);
        }
      `}</style>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded-xl bg-ink-50">
      <p className="text-[10px] uppercase tracking-wide text-ink-400 font-semibold">{label}</p>
      <p className="text-lg font-bold text-ink-900 mt-0.5">{value}</p>
    </div>
  );
}
