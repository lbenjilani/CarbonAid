import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Grid,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Chip,
  Divider,
  LinearProgress,
  Stack,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import Header from "../components/Header";
import Footer from "../components/Footer";

/**
 * CarbonAid Quiz Form (React + MUI)
 * - Sticky sidebar with progress
 * - Autosaves to localStorage
 * - Submits to /api/quiz (Mongo via server)
 * - On success, returns to /dashboard?auto=1 to trigger AI + task-ingest flow
 */

const DRAFT_KEY = "carbonaid_quiz_draft_v1";
const DEV_USER_ID = (process.env.REACT_APP_DEV_USER_ID || "66e000000000000000000001").trim();

// Shared palette (matches Dashboard/Report look)
const PALETTE = {
  pageBg: "#eaf5e1",
  cardBg: "#f0f8e0",
  primary: "#66bb6a",
  primaryAlt: "#4caf50",
  border: "divider",
};

// Group field names by section for ToC + progress
const sections = [
  {
    id: "basic",
    title: "Basic Info",
    fields: ["householdSize", "postcode", "period"],
  },
  {
    id: "transport",
    title: "Transportation",
    fields: [
      "carFuel",
      "carKm",
      "carEfficiency",
      "busKm",
      "railKm",
      "shortFlights",
      "longFlights",
    ],
  },
  {
    id: "energy",
    title: "Home Energy",
    fields: ["elecKwh", "tariff", "solar", "heatType", "gasKwh", "homeArea"],
  },
  {
    id: "diet",
    title: "Diet",
    fields: ["dietType", "eatingOut", "foodWaste", "localShare", "organicShare"],
  },
  {
    id: "consumption",
    title: "Consumption & Waste",
    fields: ["clothesItems", "electronicsSpend", "recycleRate", "trashKg"],
  },
] as const;

// util: create empty state with all fields
const defaultState = sections.reduce<Record<string, string>>((acc, s) => {
  s.fields.forEach((f) => (acc[f] = ""));
  return acc;
}, {});

// helper: coerce numeric strings to numbers or undefined
const n = (v: string): number | undefined => {
  if (v === undefined || v === null) return undefined;
  const t = String(v).trim();
  if (t === "") return undefined;
  const num = Number(t);
  return Number.isFinite(num) ? num : undefined;
};

const Quiz: React.FC = () => {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [values, setValues] = useState<Record<string, string>>(() => {
    const raw = typeof window !== "undefined" && localStorage.getItem(DRAFT_KEY);
    if (!raw) return { ...defaultState };
    try {
      const parsed = JSON.parse(raw);
      return { ...defaultState, ...parsed };
    } catch {
      return { ...defaultState };
    }
  });

  const allFields = useMemo(() => Object.keys(defaultState), []);

  const answeredCount = useMemo(
    () => allFields.filter((k) => (values[k] ?? "").toString().trim() !== "").length,
    [allFields, values]
  );

  const totalCount = allFields.length;
  const progressPct = Math.round((answeredCount / totalCount) * 100);

  // persist on change
  useEffect(() => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(values));
  }, [values]);

  const update =
    (k: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | any) => {
      const v = e.target?.value ?? "";
      setValues((prev) => ({ ...prev, [k]: v }));
    };

  const clearDraft = (): void => {
    localStorage.removeItem(DRAFT_KEY);
    setValues({ ...defaultState });
  };

  const onSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (submitting) return;

    // Build payload mapped to server schema
    const payload = {
      basic: {
        householdSize: n(values.householdSize),
        postcode: values.postcode || undefined,
        period: values.period || undefined,
      },
      transport: {
        carFuel: values.carFuel || undefined,
        carKm: n(values.carKm),
        carEfficiency: n(values.carEfficiency),
        busKm: n(values.busKm),
        railKm: n(values.railKm),
        shortFlights: n(values.shortFlights),
        longFlights: n(values.longFlights),
      },
      energy: {
        elecKwh: n(values.elecKwh),
        tariff: values.tariff || undefined,
        solar: values.solar || undefined,
        heatType: values.heatType || undefined,
        gasKwh: n(values.gasKwh),
        homeArea: n(values.homeArea),
      },
      diet: {
        dietType: values.dietType || undefined,
        eatingOut: n(values.eatingOut),
        foodWaste: n(values.foodWaste),
        localShare: n(values.localShare),
        organicShare: n(values.organicShare),
      },
      consumption: {
        clothesItems: n(values.clothesItems),
        electronicsSpend: n(values.electronicsSpend),
        recycleRate: n(values.recycleRate),
        trashKg: n(values.trashKg),
      },
      meta: { version: 1, period: values.period || undefined, source: "web" as const },
    };

    try {
      setSubmitting(true);
      await api.post("/api/quiz", payload, {
        headers: { "x-user-id": DEV_USER_ID },
      });
      localStorage.removeItem(DRAFT_KEY);

      // 2A/2B: set flags so Dashboard auto-runs AI + ingests tasks, then return to dashboard
      localStorage.setItem("recalcAfterQuiz", "1");
      localStorage.setItem("postQuizReturn", "/dashboard?auto=1");
      navigate("/dashboard?auto=1");
    } catch (err: any) {
      console.error("Submit failed:", err?.response?.data || err.message);
      alert("Submit failed. See console for details.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: PALETTE.pageBg, display: "flex", flexDirection: "column" }}>
      <Header />

      <Box sx={{ maxWidth: 1200, width: "100%", mx: "auto", px: 2, py: 3, flex: 1 }}>
        {/* Top bar with Back button */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
          <Typography variant="h5" fontWeight={800} color={PALETTE.primaryAlt}>
            Carbon Footprint Questionnaire
          </Typography>
          <Button
            variant="outlined"
            onClick={() => navigate("/dashboard")}
            sx={{
              borderColor: PALETTE.primary,
              color: PALETTE.primary,
              "&:hover": { borderColor: PALETTE.primaryAlt, color: PALETTE.primaryAlt, background: "transparent" },
            }}
          >
            ← Back to Dashboard
          </Button>
        </Stack>

        <Grid container spacing={2} alignItems="flex-start">
          {/* Sidebar */}
          <Grid item xs={12} md={4} lg={3}>
            <Paper
              elevation={0}
              sx={{
                position: { md: "sticky" },
                top: { md: 88 },
                p: 2,
                border: 1,
                borderColor: PALETTE.border,
                borderRadius: 2,
                bgcolor: PALETTE.cardBg,
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                <Box>
                  <Typography fontWeight={700}>Quiz Progress</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {answeredCount}/{totalCount} answered
                  </Typography>
                </Box>
                <Chip
                  label={`~ ${progressPct}%`}
                  size="small"
                  sx={{
                    borderColor: PALETTE.primary,
                    color: PALETTE.primary,
                    borderWidth: 1,
                    borderStyle: "solid",
                    background: "#fff",
                  }}
                />
              </Stack>
              <LinearProgress
                variant="determinate"
                value={progressPct}
                sx={{
                  borderRadius: 1,
                  height: 8,
                  my: 1,
                  "& .MuiLinearProgress-bar": { backgroundColor: PALETTE.primary },
                }}
              />

              <Stack spacing={1} mt={1}>
                {sections.map((s, i) => (
                  <Button
                    key={s.id}
                    href={`#${s.id}`}
                    variant="outlined"
                    size="small"
                    sx={{
                      justifyContent: "flex-start",
                      borderColor: PALETTE.primary,
                      color: PALETTE.primary,
                      "&:hover": { borderColor: PALETTE.primaryAlt, color: PALETTE.primaryAlt, background: "transparent" },
                    }}
                  >
                    {i + 1}. {s.title}
                  </Button>
                ))}
              </Stack>
            </Paper>
          </Grid>

          {/* Main card */}
          <Grid item xs={12} md={8} lg={9}>
            <Paper
              component="form"
              onSubmit={(e) => void onSubmit(e)} // void-safe
              elevation={0}
              sx={{ p: 2, border: 1, borderColor: PALETTE.border, borderRadius: 2, bgcolor: PALETTE.cardBg }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="subtitle1" fontWeight={700} color={PALETTE.primaryAlt}>
                  Your answers help tailor your dashboard & AI suggestions
                </Typography>
                <Chip
                  label="Most recent will be shown first"
                  variant="outlined"
                  sx={{ borderColor: PALETTE.primary, color: PALETTE.primary }}
                />
              </Stack>

              {/* BASIC INFO */}
              <Box id="basic" sx={{ scrollMarginTop: 88 }}>
                <Typography variant="subtitle1" fontWeight={800} color={PALETTE.primaryAlt} gutterBottom>
                  Basic Info
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Household size"
                      type="number"
                      inputProps={{ min: 1 }}
                      fullWidth
                      value={values.householdSize}
                      onChange={update("householdSize")}
                      helperText="Number of people regularly living in your home."
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Postcode / City"
                      placeholder="e.g. SW1A 1AA or Tunis"
                      fullWidth
                      value={values.postcode}
                      onChange={update("postcode")}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel id="period-label">Reporting period</InputLabel>
                      <Select
                        labelId="period-label"
                        label="Reporting period"
                        value={values.period}
                        onChange={update("period")}
                      >
                        <MenuItem value="">Select…</MenuItem>
                        <MenuItem value="Last 30 days">Last 30 days</MenuItem>
                        <MenuItem value="Last 90 days">Last 90 days</MenuItem>
                        <MenuItem value="Last 12 months">Last 12 months</MenuItem>
                      </Select>
                    </FormControl>
                    <Typography variant="caption" color="text.secondary">
                      Used to normalise results and compare reports over time.
                    </Typography>
                  </Grid>
                </Grid>
              </Box>

              <Divider sx={{ my: 3 }} />

              {/* TRANSPORTATION */}
              <Box id="transport" sx={{ scrollMarginTop: 88 }}>
                <Typography variant="subtitle1" fontWeight={800} color={PALETTE.primaryAlt} gutterBottom>
                  Transportation
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel id="carFuel-label">Fuel type</InputLabel>
                      <Select
                        labelId="carFuel-label"
                        label="Fuel type"
                        value={values.carFuel}
                        onChange={update("carFuel")}
                      >
                        <MenuItem value="">Select…</MenuItem>
                        <MenuItem value="Petrol">Petrol</MenuItem>
                        <MenuItem value="Diesel">Diesel</MenuItem>
                        <MenuItem value="Hybrid">Hybrid</MenuItem>
                        <MenuItem value="Electric">Electric</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField
                      label="Distance driven (km)"
                      type="number"
                      inputProps={{ min: 0 }}
                      fullWidth
                      value={values.carKm}
                      onChange={update("carKm")}
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField
                      label="Efficiency (L/100km or kWh/100km)"
                      type="number"
                      inputProps={{ min: 0, step: 0.1 }}
                      fullWidth
                      value={values.carEfficiency}
                      onChange={update("carEfficiency")}
                      helperText="Leave blank if unknown"
                    />
                  </Grid>

                  <Grid item xs={12} md={3}>
                    <TextField
                      label="Bus / Coach (km)"
                      type="number"
                      inputProps={{ min: 0 }}
                      fullWidth
                      value={values.busKm}
                      onChange={update("busKm")}
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField
                      label="Rail / Metro (km)"
                      type="number"
                      inputProps={{ min: 0 }}
                      fullWidth
                      value={values.railKm}
                      onChange={update("railKm")}
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField
                      label="Short-haul flights"
                      type="number"
                      inputProps={{ min: 0 }}
                      fullWidth
                      value={values.shortFlights}
                      onChange={update("shortFlights")}
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField
                      label="Long-haul flights"
                      type="number"
                      inputProps={{ min: 0 }}
                      fullWidth
                      value={values.longFlights}
                      onChange={update("longFlights")}
                    />
                  </Grid>
                </Grid>
              </Box>

              <Divider sx={{ my: 3 }} />

              {/* HOME ENERGY */}
              <Box id="energy" sx={{ scrollMarginTop: 88 }}>
                <Typography variant="subtitle1" fontWeight={800} color={PALETTE.primaryAlt} gutterBottom>
                  Home Energy
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={3}>
                    <TextField
                      label="Electricity (kWh)"
                      type="number"
                      inputProps={{ min: 0 }}
                      fullWidth
                      value={values.elecKwh}
                      onChange={update("elecKwh")}
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField label="Tariff / supplier" fullWidth value={values.tariff} onChange={update("tariff")} />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel id="solar-label">Do you have solar?</InputLabel>
                      <Select
                        labelId="solar-label"
                        label="Do you have solar?"
                        value={values.solar}
                        onChange={update("solar")}
                      >
                        <MenuItem value="">Select…</MenuItem>
                        <MenuItem value="None">None</MenuItem>
                        <MenuItem value="Solar PV (roof)">Solar PV (roof)</MenuItem>
                        <MenuItem value="Community solar">Community solar</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel id="heatType-label">Primary heating type</InputLabel>
                      <Select
                        labelId="heatType-label"
                        label="Primary heating type"
                        value={values.heatType}
                        onChange={update("heatType")}
                      >
                        <MenuItem value="">Select…</MenuItem>
                        <MenuItem value="Natural Gas">Natural Gas</MenuItem>
                        <MenuItem value="Heating Oil">Heating Oil</MenuItem>
                        <MenuItem value="Electric (Heat Pump)">Electric (Heat Pump)</MenuItem>
                        <MenuItem value="Electric (Resistive)">Electric (Resistive)</MenuItem>
                        <MenuItem value="District Heating">District Heating</MenuItem>
                        <MenuItem value="Biomass">Biomass</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField
                      label="Gas / Heat (kWh)"
                      type="number"
                      inputProps={{ min: 0 }}
                      fullWidth
                      value={values.gasKwh}
                      onChange={update("gasKwh")}
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField
                      label="Home size (m²)"
                      type="number"
                      inputProps={{ min: 0 }}
                      fullWidth
                      value={values.homeArea}
                      onChange={update("homeArea")}
                    />
                  </Grid>
                </Grid>
              </Box>

              <Divider sx={{ my: 3 }} />

              {/* DIET */}
              <Box id="diet" sx={{ scrollMarginTop: 88 }}>
                <Typography variant="subtitle1" fontWeight={800} color={PALETTE.primaryAlt} gutterBottom>
                  Diet
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel id="dietType-label">Typical diet</InputLabel>
                      <Select
                        labelId="dietType-label"
                        label="Typical diet"
                        value={values.dietType}
                        onChange={update("dietType")}
                      >
                        <MenuItem value="">Select…</MenuItem>
                        <MenuItem value="Omnivore (meat daily)">Omnivore (meat daily)</MenuItem>
                        <MenuItem value="Reduced-meat (few times/week)">Reduced-meat (few times/week)</MenuItem>
                        <MenuItem value="Pescatarian">Pescatarian</MenuItem>
                        <MenuItem value="Vegetarian">Vegetarian</MenuItem>
                        <MenuItem value="Vegan">Vegan</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField
                      label="Meals out / week"
                      type="number"
                      inputProps={{ min: 0 }}
                      fullWidth
                      value={values.eatingOut}
                      onChange={update("eatingOut")}
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField
                      label="Food wasted / week (kg)"
                      type="number"
                      inputProps={{ min: 0, step: 0.1 }}
                      fullWidth
                      value={values.foodWaste}
                      onChange={update("foodWaste")}
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField
                      label="% local / seasonal"
                      type="number"
                      inputProps={{ min: 0, max: 100 }}
                      fullWidth
                      value={values.localShare}
                      onChange={update("localShare")}
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField
                      label="% organic"
                      type="number"
                      inputProps={{ min: 0, max: 100 }}
                      fullWidth
                      value={values.organicShare}
                      onChange={update("organicShare")}
                    />
                  </Grid>
                </Grid>
              </Box>

              <Divider sx={{ my: 3 }} />

              {/* CONSUMPTION & WASTE */}
              <Box id="consumption" sx={{ scrollMarginTop: 88 }}>
                <Typography variant="subtitle1" fontWeight={800} color={PALETTE.primaryAlt} gutterBottom>
                  Consumption &amp; Waste
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={3}>
                    <TextField
                      label="Clothing items / month"
                      type="number"
                      inputProps={{ min: 0 }}
                      fullWidth
                      value={values.clothesItems}
                      onChange={update("clothesItems")}
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField
                      label="Electronics spend (period)"
                      type="number"
                      inputProps={{ min: 0 }}
                      fullWidth
                      value={values.electronicsSpend}
                      onChange={update("electronicsSpend")}
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField
                      label="Recycling rate (%)"
                      type="number"
                      inputProps={{ min: 0, max: 100 }}
                      fullWidth
                      value={values.recycleRate}
                      onChange={update("recycleRate")}
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField
                      label="General waste / week (kg)"
                      type="number"
                      inputProps={{ min: 0, step: 0.1 }}
                      fullWidth
                      value={values.trashKg}
                      onChange={update("trashKg")}
                    />
                  </Grid>
                </Grid>
              </Box>

              <Stack
                direction={{ xs: "column", sm: "row" }}
                justifyContent="space-between"
                alignItems={{ xs: "stretch", sm: "center" }}
                gap={1}
                mt={3}
              >
                <Typography variant="body2" color="text.secondary">
                  Your inputs auto-save in this browser as a draft.
                </Typography>
                <Box sx={{ display: "flex", gap: 1 }}>
                  <Button
                    variant="outlined"
                    onClick={clearDraft}
                    disabled={submitting}
                    sx={{
                      borderColor: PALETTE.primary,
                      color: PALETTE.primary,
                      "&:hover": { borderColor: PALETTE.primaryAlt, color: PALETTE.primaryAlt, background: "transparent" },
                    }}
                  >
                    Clear draft
                  </Button>
                  <Button type="submit" variant="contained" color="success" disabled={submitting}
                    sx={{ bgcolor: PALETTE.primary, "&:hover": { bgcolor: PALETTE.primaryAlt } }}
                  >
                    {submitting ? "Submitting..." : "Submit quiz"}
                  </Button>
                </Box>
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      </Box>

      <Footer />
    </Box>
  );
};

export default Quiz;
