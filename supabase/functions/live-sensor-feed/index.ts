import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") as string;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;

    if (!supabaseUrl || !serviceKey) {
      return new Response(
        JSON.stringify({ error: "Server not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // Fetch all lakes
    const { data: lakes, error: lakeErr } = await supabase
      .from("lakes")
      .select("id, status, lat")
      .order("name");

    if (lakeErr) throw lakeErr;
    if (!lakes || lakes.length === 0) {
      return new Response(
        JSON.stringify({ message: "No lakes found", readings: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Pick a random subset of lakes to "feed" new sensor data for (10-15 per call)
    const batchSize = Math.min(15, Math.max(8, Math.floor(lakes.length * 0.15)));
    const shuffled = [...lakes].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, batchSize);

    const now = new Date();
    const month = now.getMonth();
    const isMonsoon = month >= 5 && month <= 8; // Jun-Sep in India

    // Generate realistic sensor readings with slight variations from last reading
    const readingsToInsert: Record<string, unknown>[] = [];
    const predictionsToInsert: Record<string, unknown>[] = [];
    const alertsToInsert: Record<string, unknown>[] = [];

    for (const lake of selected) {
      const status = lake.status as string;
      const lat = lake.lat as number;

      // Base values influenced by season and latitude
      const baseTemp = 22 + 8 * Math.sin((month + 4) * 0.524) + (25 - Math.abs(lat)) * 0.3;
      const statusBoost = status === "critical" ? 1 : status === "warning" ? 0.6 : status === "watch" ? 0.3 : 0;

      const temperature_c = Math.round((baseTemp + (Math.random() - 0.5) * 4) * 100) / 100;
      const ph = Math.round((7.5 + (Math.random() - 0.5) * 1.5 + statusBoost * 0.5) * 100) / 100;
      const dissolved_oxygen_mgl = Math.round((7.5 - Math.random() * 2 - statusBoost * 2.5) * 100) / 100;
      const turbidity_ntu = Math.round((5 + Math.random() * 8 + (isMonsoon ? 12 : 0) + statusBoost * 15) * 100) / 100;
      const chlorophyll_a_ugl = Math.round((5 + Math.random() * 8 + (isMonsoon ? 10 : 3) + statusBoost * 70) * 100) / 100;
      const nitrate_mgl = Math.round((0.5 + Math.random() * 1.2 + statusBoost * 2.5) * 1000) / 1000;
      const phosphate_mgl = Math.round((0.05 + Math.random() * 0.15 + statusBoost * 0.4) * 1000) / 1000;
      const rainfall_mm = Math.round((isMonsoon ? 40 + Math.random() * 120 : Math.random() * 15) * 100) / 100;
      const sunlight_hours = Math.round((6 + 3 * Math.sin((month + 4) * 0.524) + Math.random() * 2) * 100) / 100;

      readingsToInsert.push({
        lake_id: lake.id,
        recorded_at: now.toISOString(),
        temperature_c,
        ph,
        dissolved_oxygen_mgl,
        turbidity_ntu,
        chlorophyll_a_ugl,
        nitrate_mgl,
        phosphate_mgl,
        rainfall_mm,
        sunlight_hours,
      });

      // Compute bloom probability using the same weighted model
      const bloomProb = Math.min(1, Math.max(0,
        0.35 * Math.min(1, chlorophyll_a_ugl / 100) +
        0.15 * Math.min(1, nitrate_mgl / 5) +
        0.15 * Math.min(1, phosphate_mgl / 0.8) +
        0.12 * Math.min(1, (temperature_c - 15) / 20) +
        0.10 * Math.min(1, Math.max(0, (9 - dissolved_oxygen_mgl) / 6)) +
        0.08 * Math.min(1, Math.max(0, (ph - 8.5) / 1.5)) +
        0.05 * Math.min(1, turbidity_ntu / 50)
      ));

      let intensity = "none";
      let riskLevel = "low";
      if (bloomProb >= 0.75) { intensity = "severe"; riskLevel = "critical"; }
      else if (bloomProb >= 0.5) { intensity = "high"; riskLevel = "high"; }
      else if (bloomProb >= 0.25) { intensity = "moderate"; riskLevel = "moderate"; }
      else if (bloomProb >= 0.1) { intensity = "low"; riskLevel = "low"; }

      predictionsToInsert.push({
        lake_id: lake.id,
        predicted_at: now.toISOString(),
        bloom_probability: Math.round(bloomProb * 10000) / 10000,
        predicted_intensity: intensity,
        risk_level: riskLevel,
        contributing_factors: {
          chlorophyll_a: chlorophyll_a_ugl,
          temperature: temperature_c,
          dissolved_oxygen: dissolved_oxygen_mgl,
          nitrate: nitrate_mgl,
          phosphate: phosphate_mgl,
          turbidity: turbidity_ntu,
          ph,
        },
        model_version: "v1.0-live",
      });

      // Update lake status based on new prediction
      const newStatus = bloomProb >= 0.75 ? "critical" : bloomProb >= 0.5 ? "warning" : bloomProb >= 0.25 ? "watch" : "safe";

      // Generate alert if risk is elevated
      if (bloomProb >= 0.5) {
        const severity = bloomProb >= 0.75 ? "critical" : "warning";
        const msg = bloomProb >= 0.75
          ? "CRITICAL: Severe phytoplankton bloom detected. Immediate action required."
          : "WARNING: High bloom probability. Water quality deteriorating.";
        alertsToInsert.push({
          lake_id: lake.id,
          alert_type: "bloom_warning",
          severity,
          message: msg,
          is_active: true,
          acknowledged: false,
        });
      }

      // Update lake status in background
      await supabase
        .from("lakes")
        .update({
          status: newStatus,
          last_bloom_date: bloomProb >= 0.5 ? now.toISOString().split("T")[0] : undefined,
        })
        .eq("id", lake.id);
    }

    // Insert readings
    const { error: readInsertErr } = await supabase
      .from("monitoring_data")
      .insert(readingsToInsert);
    if (readInsertErr) throw readInsertErr;

    // Insert predictions
    const { error: predInsertErr } = await supabase
      .from("predictions")
      .insert(predictionsToInsert);
    if (predInsertErr) throw predInsertErr;

    // Insert alerts (if any)
    if (alertsToInsert.length > 0) {
      const { error: alertInsertErr } = await supabase
        .from("alerts")
        .insert(alertsToInsert);
      if (alertInsertErr) throw alertInsertErr;
    }

    return new Response(
      JSON.stringify({
        message: "Live sensor feed processed",
        readings: readingsToInsert.length,
        predictions: predictionsToInsert.length,
        alerts: alertsToInsert.length,
        timestamp: now.toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
