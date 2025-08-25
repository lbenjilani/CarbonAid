import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  Container,
  Grid,
  Paper,
  Box,
  Chip,
  LinearProgress,
  List,
  ListItemButton,
  ListItemText,
  Card,
  CardHeader,
  CardContent,
  TextField,
  Button,
  IconButton,
  Stack,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CssBaseline,
  ThemeProvider,
  createTheme,
  Divider,
} from "@mui/material";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import NotificationsIcon from "@mui/icons-material/Notifications";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import LogoutIcon from "@mui/icons-material/Logout";

const DRAFT_KEY = "carbonaid_quiz_draft_v1";

type QuizFormData = Record<string, FormDataEntryValue>;

const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#2e7d32" }, // accent
    background: { default: "#eaf5e1" }, // page bg
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial'].join(", "),
  },
  components: {
    MuiPaper: { styleOverrides: { root: { borderRadius: 14 } } },
    MuiCard: { styleOverrides: { root: { borderRadius: 14 } } },
  },
});

const Form: React.FC = () => {
  const formRef = useRef<HTMLFormElement | null>(null);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [totalInputs, setTotalInputs] = useState(0);
  const [activeSectionId, setActiveSectionId] = useState<string>("sec-basic");
  const [stepIndex, setStepIndex] = useState<number>(0);
  const year = new Date().getFullYear();

  const go = (path: string) => {
    // swap with useNavigate() if you wire React Router
    console.log("navigate to", path);
  };

  // Section registration (preserve your data-title metadata)
  const sections = useMemo(() => {
    if (!formRef.current) return [] as HTMLElement[];
    return Array.from(
      formRef.current.querySelectorAll<HTMLElement>("section[data-title]")
    );
  }, [formRef.current]);

  const sectionMeta = useMemo(
    () =>
      sections.map((s, idx) => ({
        id: s.id,
        title: s.dataset.title ?? `Section ${idx + 1}`,
        idx,
      })),
    [sections]
  );

  // Initial load: count inputs + restore draft
  useEffect(() => {
    if (!formRef.current) return;
    const inputs = formRef.current.querySelectorAll("input, select");
    setTotalInputs(inputs.length);

    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw) {
      try {
        const data = JSON.parse(raw) as QuizFormData;
        Object.entries(data).forEach(([k, v]) => {
          const el = formRef.current?.elements.namedItem(k) as
            | HTMLInputElement
            | HTMLSelectElement
            | null;
          if (el) (el as any).value = v as string;
        });
      } catch (e) {
        console.warn("draft parse error", e);
      }
    }
    countAnswered();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formRef.current]);

  // Scroll spy
  useEffect(() => {
    if (sections.length === 0) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = (entry.target as HTMLElement).id;
            setActiveSectionId(id);
            const idx = sections.findIndex((s) => s.id === id);
            setStepIndex(idx >= 0 ? idx : 0);
          }
        });
      },
      { rootMargin: "-40% 0px -55% 0px", threshold: 0 }
    );
    sections.forEach((s) => obs.observe(s));
    return () => obs.disconnect();
  }, [sections]);

  const countAnswered = () => {
    if (!formRef.current) return;
    const els = formRef.current.querySelectorAll<
      HTMLInputElement | HTMLSelectElement
    >("input, select");
    let c = 0;
    els.forEach((el) => {
      const v =
        el instanceof HTMLInputElement && (el.type === "number" || el.type === "text")
          ? el.value.trim()
          : el.value;
      if (v !== "" && v != null) c++;
    });
    setAnsweredCount(c);
  };

  const saveDraft = () => {
    if (!formRef.current) return;
    const data = Object.fromEntries(new FormData(formRef.current).entries());
    localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
  };

  const handleInput: React.FormEventHandler<HTMLFormElement> = () => {
    countAnswered();
    saveDraft();
  };

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    if (!formRef.current) return;
    const payload = Object.fromEntries(new FormData(formRef.current).entries());
    console.log("SUBMIT", payload);
    alert("Quiz submitted! (Check console for payload)");
  };

  const handleClearDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    formRef.current?.reset();
    countAnswered();
  };

  // Progress %
  const progressPct = totalInputs ? Math.round((answeredCount / totalInputs) * 100) : 0;

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {/* Header */}
      <AppBar elevation={1} color="inherit" position="sticky">
        <Toolbar sx={{ maxWidth: 1100, mx: "auto", width: "100%" }}>
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ cursor: "pointer" }} onClick={() => go("/dashboard")}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 1.5,
                background: "linear-gradient(135deg, #2e7d32, #6cc27c)",
                display: "grid",
                placeItems: "center",
                color: "white",
                fontWeight: 800,
              }}
            >
              CA
            </Box>
            <Typography variant="h6" fontWeight={700}>CarbonAid</Typography>
          </Stack>

          <Stack direction="row" spacing={1.5} sx={{ ml: "auto", mr: 2 }}>
            <Button variant="contained" size="small" color="primary" onClick={() => go("/dashboard")}>Dashboard</Button>
            <Button size="small" onClick={() => go("/report")}>Report</Button>
            <Button size="small" onClick={() => go("/task")}>Task</Button>
          </Stack>

          <Stack direction="row" spacing={1}>
            <IconButton aria-label="Profile"><AccountCircleIcon /></IconButton>
            <IconButton aria-label="Notifications"><NotificationsIcon /></IconButton>
            <IconButton aria-label="Help"><HelpOutlineIcon /></IconButton>
            <IconButton aria-label="Logout" color="error" onClick={() => go("/")}>
              <LogoutIcon />
            </IconButton>
          </Stack>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Grid container spacing={2}>
          {/* Sidebar */}
          <Grid item xs={12} md={4} lg={3}>
            <Paper elevation={0} variant="outlined" sx={{ position: "sticky", top: 88, p: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                <Box>
                  <Typography fontWeight={700}>Quiz Progress</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {answeredCount}/{totalInputs} answered
                  </Typography>
                </Box>
                <Chip
                  color="success"
                  variant="outlined"
                  label={`Step ${stepIndex + 1} of ${Math.max(sections.length, 1)}`}
                  sx={{ fontWeight: 700 }}
                />
              </Stack>

              <Box sx={{ mt: 1 }}>
                <LinearProgress
                  variant="determinate"
                  value={progressPct}
                  sx={{ height: 10, borderRadius: 5, backgroundColor: "#f3f4f6" }}
                />
              </Box>

              <List dense sx={{ mt: 1 }}>
                {sectionMeta.map(({ id, title }) => (
                  <ListItemButton
                    key={id}
                    selected={activeSectionId === id}
                    onClick={() =>
                      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })
                    }
                    sx={{
                      borderRadius: 2,
                      "&.Mui-selected": {
                        border: "1px solid",
                        borderColor: "primary.main",
                        backgroundColor: "success.50",
                      },
                    }}
                  >
                    <ListItemText primary={title} />
                  </ListItemButton>
                ))}
              </List>
            </Paper>
          </Grid>

          {/* Main Form */}
          <Grid item xs={12} md={8} lg={9}>
            <Card variant="outlined">
              <CardHeader
                title="Carbon Footprint Questionnaire"
                action={<Chip color="success" variant="outlined" label="Most recent will be shown first" />}
                sx={{ "& .MuiCardHeader-title": { fontWeight: 700 } }}
              />
              <Divider />
              <CardContent>
                <Box component="form" ref={formRef} onInput={handleInput} onSubmit={handleSubmit} noValidate>

                  {/* BASIC INFO */}
                  <Box id="sec-basic" data-title="Basic Info" sx={{ mb: 3 }}>
                    <Typography variant="h6" color="primary" fontWeight={700} sx={{ mb: 1 }}>
                      Basic Info
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <TextField
                          id="householdSize"
                          name="householdSize"
                          type="number"
                          label="Household size"
                          placeholder="e.g. 3"
                          inputProps={{ min: 1 }}
                          required
                          fullWidth
                        />
                        <Typography variant="caption" color="text.secondary">
                          Number of people regularly living in your home.
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          id="postcode"
                          name="postcode"
                          label="Postcode / City"
                          placeholder="e.g. SW1A 1AA or Tunis"
                          required
                          fullWidth
                        />
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <FormControl fullWidth>
                          <InputLabel id="period-label">Reporting period</InputLabel>
                          <Select
                            labelId="period-label"
                            id="period"
                            name="period"
                            label="Reporting period"
                            required
                            defaultValue=""
                          >
                            <MenuItem value=""><em>Select…</em></MenuItem>
                            <MenuItem value="Last 30 days">Last 30 days</MenuItem>
                            <MenuItem value="Last 90 days">Last 90 days</MenuItem>
                            <MenuItem value="Last 12 months">Last 12 months</MenuItem>
                          </Select>
                        </FormControl>
                        <Typography variant="caption" color="text.secondary">
                          Used to normalise your results and compare reports over time.
                        </Typography>
                      </Grid>
                    </Grid>
                  </Box>

                  {/* TRANSPORTATION */}
                  <Box id="sec-transport" data-title="Transportation" sx={{ mb: 3 }}>
                    <Typography variant="h6" color="primary" fontWeight={700} sx={{ mb: 1 }}>
                      Transportation
                    </Typography>
                    <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
                        Personal Car
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                          <FormControl fullWidth>
                            <InputLabel id="carFuel-label">Fuel type</InputLabel>
                            <Select labelId="carFuel-label" id="carFuel" name="carFuel" label="Fuel type" required defaultValue="">
                              <MenuItem value=""><em>Select…</em></MenuItem>
                              <MenuItem value="Petrol">Petrol</MenuItem>
                              <MenuItem value="Diesel">Diesel</MenuItem>
                              <MenuItem value="Hybrid">Hybrid</MenuItem>
                              <MenuItem value="Electric">Electric</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={12} md={3}>
                          <TextField id="carKm" name="carKm" type="number" label="Distance driven" placeholder="km in period" inputProps={{ min: 0 }} required fullWidth />
                        </Grid>
                        <Grid item xs={12} md={3}>
                          <TextField id="carEfficiency" name="carEfficiency" type="number" label="Efficiency" placeholder="L/100km or kWh/100km" inputProps={{ min: 0, step: 0.1 }} fullWidth />
                          <Typography variant="caption" color="text.secondary">Leave blank if unknown.</Typography>
                        </Grid>
                      </Grid>
                    </Paper>

                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
                        Public Transport & Flights
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                          <TextField id="busKm" name="busKm" type="number" label="Bus / Coach (km)" placeholder="e.g. 120" inputProps={{ min: 0 }} fullWidth />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <TextField id="railKm" name="railKm" type="number" label="Rail / Metro (km)" placeholder="e.g. 320" inputProps={{ min: 0 }} fullWidth />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <TextField id="shortFlights" name="shortFlights" type="number" label="Short-haul flights" placeholder="# flights" inputProps={{ min: 0 }} fullWidth />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <TextField id="longFlights" name="longFlights" type="number" label="Long-haul flights" placeholder="# flights" inputProps={{ min: 0 }} fullWidth />
                        </Grid>
                      </Grid>
                    </Paper>
                  </Box>

                  {/* HOME ENERGY */}
                  <Box id="sec-energy" data-title="Home Energy" sx={{ mb: 3 }}>
                    <Typography variant="h6" color="primary" fontWeight={700} sx={{ mb: 1 }}>
                      Home Energy
                    </Typography>
                    <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
                        Electricity
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                          <TextField id="elecKwh" name="elecKwh" type="number" label="Usage (kWh)" placeholder="e.g. 220" inputProps={{ min: 0 }} fullWidth />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <TextField id="tariff" name="tariff" label="Tariff / supplier" placeholder="optional" fullWidth />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <FormControl fullWidth>
                            <InputLabel id="solar-label">Do you have solar?</InputLabel>
                            <Select labelId="solar-label" id="solar" name="solar" label="Do you have solar?" defaultValue="">
                              <MenuItem value=""><em>Select…</em></MenuItem>
                              <MenuItem value="None">None</MenuItem>
                              <MenuItem value="Solar PV (roof)">Solar PV (roof)</MenuItem>
                              <MenuItem value="Community solar">Community solar</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                      </Grid>
                    </Paper>

                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
                        Heating
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                          <FormControl fullWidth>
                            <InputLabel id="heatType-label">Primary heating type</InputLabel>
                            <Select labelId="heatType-label" id="heatType" name="heatType" label="Primary heating type" defaultValue="">
                              <MenuItem value=""><em>Select…</em></MenuItem>
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
                          <TextField id="gasKwh" name="gasKwh" type="number" label="Gas / Heat kWh" placeholder="kWh in period" inputProps={{ min: 0 }} fullWidth />
                        </Grid>
                        <Grid item xs={12} md={3}>
                          <TextField id="homeArea" name="homeArea" type="number" label="Home size (m²)" placeholder="e.g. 85" inputProps={{ min: 0 }} fullWidth />
                        </Grid>
                      </Grid>
                    </Paper>
                  </Box>

                  {/* DIET */}
                  <Box id="sec-diet" data-title="Diet" sx={{ mb: 3 }}>
                    <Typography variant="h6" color="primary" fontWeight={700} sx={{ mb: 1 }}>
                      Diet
                    </Typography>
                    <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
                        Diet Pattern
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                          <FormControl fullWidth>
                            <InputLabel id="dietType-label">Typical diet</InputLabel>
                            <Select labelId="dietType-label" id="dietType" name="dietType" label="Typical diet" defaultValue="">
                              <MenuItem value=""><em>Select…</em></MenuItem>
                              <MenuItem value="Omnivore (meat daily)">Omnivore (meat daily)</MenuItem>
                              <MenuItem value="Reduced-meat (few times/week)">Reduced-meat (few times/week)</MenuItem>
                              <MenuItem value="Pescatarian">Pescatarian</MenuItem>
                              <MenuItem value="Vegetarian">Vegetarian</MenuItem>
                              <MenuItem value="Vegan">Vegan</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={12} md={3}>
                          <TextField id="eatingOut" name="eatingOut" type="number" label="Meals out / week" placeholder="e.g. 2" inputProps={{ min: 0 }} fullWidth />
                        </Grid>
                        <Grid item xs={12} md={3}>
                          <TextField id="foodWaste" name="foodWaste" type="number" label="Food wasted / week (kg)" placeholder="e.g. 0.6" inputProps={{ min: 0, step: 0.1 }} fullWidth />
                        </Grid>
                      </Grid>
                    </Paper>

                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
                        Groceries
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                          <TextField id="localShare" name="localShare" type="number" label="% local / seasonal" placeholder="0–100" inputProps={{ min: 0, max: 100 }} fullWidth />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <TextField id="organicShare" name="organicShare" type="number" label="% organic" placeholder="0–100" inputProps={{ min: 0, max: 100 }} fullWidth />
                        </Grid>
                      </Grid>
                    </Paper>
                  </Box>

                  {/* CONSUMPTION & WASTE */}
                  <Box id="sec-consumption" data-title="Consumption & Waste" sx={{ mb: 3 }}>
                    <Typography variant="h6" color="primary" fontWeight={700} sx={{ mb: 1 }}>
                      Consumption & Waste
                    </Typography>
                    <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
                        Purchases
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                          <TextField id="clothesItems" name="clothesItems" type="number" label="Clothing items bought / month" placeholder="e.g. 3" inputProps={{ min: 0 }} fullWidth />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <TextField id="electronicsSpend" name="electronicsSpend" type="number" label="Electronics spend in period (currency)" placeholder="e.g. 250" inputProps={{ min: 0 }} fullWidth />
                        </Grid>
                      </Grid>
                    </Paper>

                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
                        Waste
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                          <TextField id="recycleRate" name="recycleRate" type="number" label="Recycling rate (%)" placeholder="0–100" inputProps={{ min: 0, max: 100 }} fullWidth />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <TextField id="trashKg" name="trashKg" type="number" label="General waste / week (kg)" placeholder="e.g. 3.2" inputProps={{ min: 0, step: 0.1 }} fullWidth />
                        </Grid>
                      </Grid>
                    </Paper>
                  </Box>

                  {/* Sticky footer actions */}
                  <Paper
                    elevation={0}
                    variant="outlined"
                    sx={{
                      position: "sticky",
                      bottom: 16,
                      p: 1.5,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      backdropFilter: "saturate(140%) blur(6px)",
                      backgroundColor: "rgba(255,255,255,.9)",
                    }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      Your inputs auto-save in this browser as a draft.
                    </Typography>
                    <Stack direction="row" spacing={1}>
                      <Button variant="outlined" onClick={handleClearDraft}>Clear draft</Button>
                      <Button variant="contained" type="submit">Submit quiz</Button>
                    </Stack>
                  </Paper>
                </Box>
              </CardContent>
            </Card>

            {/* Footer */}
            <Paper
              elevation={0}
              sx={{
                mt: 3,
                p: 2,
                textAlign: "center",
                color: "#374151",
                border: "1px solid #dbe7d0",
                backgroundColor: "#cde8bd",
              }}
            >
              © {year} CarbonAid. All rights reserved.
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </ThemeProvider>
  );
};

export default Form;
