import type { MonitoringData, RiskLevel, BloomIntensity } from './supabase';

export interface ModelWeights {
  chlorophyll_a: number;
  nitrate: number;
  phosphate: number;
  temperature: number;
  dissolved_oxygen: number;
  ph: number;
  turbidity: number;
  bias: number;
}

export const DEFAULT_WEIGHTS: ModelWeights = {
  chlorophyll_a: 0.0085,
  nitrate: 0.12,
  phosphate: 0.75,
  temperature: 0.025,
  dissolved_oxygen: -0.08,
  ph: 0.18,
  turbidity: 0.004,
  bias: -2.1,
};

export interface PredictionInput {
  temperature_c: number;
  ph: number;
  dissolved_oxygen_mgl: number;
  turbidity_ntu: number;
  chlorophyll_a_ugl: number;
  nitrate_mgl: number;
  phosphate_mgl: number;
}

export interface PredictionResult {
  rawScore: number;
  probability: number;
  intensity: BloomIntensity;
  riskLevel: RiskLevel;
  factorBreakdown: { name: string; value: number; weight: number; contribution: number }[];
}

export function predictBloom(input: PredictionInput, weights: ModelWeights = DEFAULT_WEIGHTS): PredictionResult {
  const rawScore =
    weights.bias +
    input.chlorophyll_a_ugl * weights.chlorophyll_a +
    input.nitrate_mgl * weights.nitrate +
    input.phosphate_mgl * weights.phosphate +
    input.temperature_c * weights.temperature +
    input.dissolved_oxygen_mgl * weights.dissolved_oxygen +
    input.ph * weights.ph +
    input.turbidity_ntu * weights.turbidity;

  const probability = 1 / (1 + Math.exp(-rawScore));

  const factorBreakdown = [
    { name: 'Chlorophyll-a', value: input.chlorophyll_a_ugl, weight: weights.chlorophyll_a, contribution: input.chlorophyll_a_ugl * weights.chlorophyll_a },
    { name: 'Nitrate', value: input.nitrate_mgl, weight: weights.nitrate, contribution: input.nitrate_mgl * weights.nitrate },
    { name: 'Phosphate', value: input.phosphate_mgl, weight: weights.phosphate, contribution: input.phosphate_mgl * weights.phosphate },
    { name: 'Temperature', value: input.temperature_c, weight: weights.temperature, contribution: input.temperature_c * weights.temperature },
    { name: 'Dissolved O₂', value: input.dissolved_oxygen_mgl, weight: weights.dissolved_oxygen, contribution: input.dissolved_oxygen_mgl * weights.dissolved_oxygen },
    { name: 'pH', value: input.ph, weight: weights.ph, contribution: input.ph * weights.ph },
    { name: 'Turbidity', value: input.turbidity_ntu, weight: weights.turbidity, contribution: input.turbidity_ntu * weights.turbidity },
  ].sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));

  let intensity: BloomIntensity = 'none';
  let riskLevel: RiskLevel = 'low';

  if (probability >= 0.75) { intensity = 'severe'; riskLevel = 'critical'; }
  else if (probability >= 0.5) { intensity = 'high'; riskLevel = 'high'; }
  else if (probability >= 0.25) { intensity = 'moderate'; riskLevel = 'moderate'; }
  else if (probability >= 0.1) { intensity = 'low'; riskLevel = 'low'; }

  return { rawScore, probability, intensity, riskLevel, factorBreakdown };
}

export function readingToInput(r: MonitoringData): PredictionInput {
  return {
    temperature_c: r.temperature_c ?? 25,
    ph: r.ph ?? 7.5,
    dissolved_oxygen_mgl: r.dissolved_oxygen_mgl ?? 7,
    turbidity_ntu: r.turbidity_ntu ?? 10,
    chlorophyll_a_ugl: r.chlorophyll_a_ugl ?? 10,
    nitrate_mgl: r.nitrate_mgl ?? 1,
    phosphate_mgl: r.phosphate_mgl ?? 0.1,
  };
}

export interface TrainingResult {
  weights: ModelWeights;
  epochs: number;
  finalLoss: number;
  lossHistory: number[];
  accuracy: number;
  samples: number;
}

export function trainModel(
  data: { input: PredictionInput; label: number }[],
  options: { epochs?: number; learningRate?: number } = {}
): TrainingResult {
  const epochs = options.epochs ?? 200;
  const lr = options.learningRate ?? 0.001;

  let weights: ModelWeights = { ...DEFAULT_WEIGHTS, bias: -2.1 };
  const lossHistory: number[] = [];

  for (let epoch = 0; epoch < epochs; epoch++) {
    let totalLoss = 0;
    const gradAccum: ModelWeights = {
      chlorophyll_a: 0, nitrate: 0, phosphate: 0, temperature: 0,
      dissolved_oxygen: 0, ph: 0, turbidity: 0, bias: 0,
    };

    for (const sample of data) {
      const raw =
        weights.bias +
        sample.input.chlorophyll_a_ugl * weights.chlorophyll_a +
        sample.input.nitrate_mgl * weights.nitrate +
        sample.input.phosphate_mgl * weights.phosphate +
        sample.input.temperature_c * weights.temperature +
        sample.input.dissolved_oxygen_mgl * weights.dissolved_oxygen +
        sample.input.ph * weights.ph +
        sample.input.turbidity_ntu * weights.turbidity;

      const pred = 1 / (1 + Math.exp(-raw));
      const error = pred - sample.label;
      totalLoss += error * error;

      const dRaw = error * pred * (1 - pred);
      gradAccum.chlorophyll_a += dRaw * sample.input.chlorophyll_a_ugl;
      gradAccum.nitrate += dRaw * sample.input.nitrate_mgl;
      gradAccum.phosphate += dRaw * sample.input.phosphate_mgl;
      gradAccum.temperature += dRaw * sample.input.temperature_c;
      gradAccum.dissolved_oxygen += dRaw * sample.input.dissolved_oxygen_mgl;
      gradAccum.ph += dRaw * sample.input.ph;
      gradAccum.turbidity += dRaw * sample.input.turbidity_ntu;
      gradAccum.bias += dRaw;
    }

    const n = data.length;
    (Object.keys(weights) as (keyof ModelWeights)[]).forEach((k) => {
      weights[k] -= (lr * gradAccum[k]) / n;
    });

    const avgLoss = totalLoss / n;
    if (epoch % 10 === 0 || epoch === epochs - 1) {
      lossHistory.push(avgLoss);
    }
  }

  let correct = 0;
  for (const sample of data) {
    const result = predictBloom(sample.input, weights);
    const predictedBinary = result.probability >= 0.5 ? 1 : 0;
    if (predictedBinary === sample.label) correct++;
  }

  return {
    weights,
    epochs,
    finalLoss: lossHistory[lossHistory.length - 1] ?? 0,
    lossHistory,
    accuracy: correct / data.length,
    samples: data.length,
  };
}

export function generateTrainingLabels(readings: MonitoringData[]): { input: PredictionInput; label: number }[] {
  return readings.map((r) => {
    const input = readingToInput(r);
    const label = r.chlorophyll_a_ugl && r.chlorophyll_a_ugl > 40 ? 1 : 0;
    return { input, label };
  });
}
