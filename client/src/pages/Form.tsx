import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * CarbonAid | Footprint Quiz (TSX)
 * - Self-contained styles (same look & feel)
 * - Scroll spy with IntersectionObserver
 * - Progress tracking
 * - Local draft via localStorage
 * - Accessible ToC + sticky footer actions
 */
const DRAFT_KEY = "carbonaid_quiz_draft_v1";

type QuizFormData = Record<string, FormDataEntryValue>;

const Form: React.FC = () => {
  const formRef = useRef<HTMLFormElement | null>(null);
  const tocRef = useRef<HTMLDivElement | null>(null);
  const barRef = useRef<HTMLSpanElement | null>(null);

  const [answeredCount, setAnsweredCount] = useState(0);
  const [totalInputs, setTotalInputs] = useState(0);
  const [activeSectionId, setActiveSectionId] = useState<string>("sec-basic");
  const [stepIndex, setStepIndex] = useState<number>(0);
  const [year, setYear] = useState<number>(new Date().getFullYear());

  // helper: mock navigation to mirror Header.tsx behaviours
  const go = (path: string) => {
    // Replace with your router navigate() if desired
    // e.g., const navigate = useNavigate(); navigate(path)
    console.log("navigate to", path);
  };

  // grab sections lazily from the form
  const sections = useMemo(() => {
    if (!formRef.current) return [] as HTMLElement[];
    return Array.from(
      formRef.current.querySelectorAll<HTMLElement>("section[data-title]")
    );
  }, [formRef.current]);

  // compute section titles for ToC
  const sectionMeta = useMemo(
    () =>
      sections.map((s, idx) => ({
        id: s.id,
        title: s.dataset.title ?? `Section ${idx + 1}`,
        idx,
      })),
    [sections]
  );

  // load draft from localStorage into the form (once)
  useEffect(() => {
    if (!formRef.current) return;

    // set total inputs
    const inputs = formRef.current.querySelectorAll("input, select");
    setTotalInputs(inputs.length);

    // load draft
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

    // initial count
    countAnswered();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formRef.current]);

  // intersection observer for scroll spy
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

  // update progress bar width
  useEffect(() => {
    if (!barRef.current || totalInputs === 0) return;
    const pct = Math.round((answeredCount / totalInputs) * 100);
    barRef.current.style.width = `${pct}%`;
  }, [answeredCount, totalInputs]);

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

  return (
    <>
      {/* Styles preserved from original */}
      <style>{`
        :root{
          --ca-bg:#eaf5e1;
          --ca-accent:#2e7d32;
          --ca-accent-100:#cde8bd;
          --ca-card:#ffffff;
          --ca-text:#111827;
          --ca-muted:#6b7280;
          --ca-border:#e5e7eb;
          --radius:14px;
        }
        *{box-sizing:border-box}
        body:has(#CarbonFootprintQuizRoot){background:var(--ca-bg)}
        .appbar{position:sticky;top:0;z-index:50;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.06)}
        .toolbar{max-width:1100px;margin:auto;display:flex;align-items:center;justify-content:space-between;padding:10px 16px}
        .brand{display:flex;align-items:center;gap:10px;cursor:pointer}
        .brand-logo{width:40px;height:40px;border-radius:8px;background:linear-gradient(135deg,var(--ca-accent),#6cc27c);display:grid;place-items:center;color:white;font-weight:800}
        .brand-title{font-weight:700}
        .nav{display:flex;gap:6px}
        .nav button{border:none;background:transparent;padding:8px 12px;border-radius:10px;cursor:pointer;font-weight:600}
        .nav button.active{background:var(--ca-accent);color:#fff}
        .actions{display:flex;align-items:center;gap:6px}
        .icon-btn{border:none;background:transparent;padding:8px;border-radius:10px;cursor:pointer}
        .icon-btn.danger{color:#b91c1c}
        .wrap{max-width:1100px;margin:24px auto;padding:0 16px}
        .layout{display:grid;grid-template-columns:260px 1fr;gap:20px}
        @media (max-width: 900px){.layout{grid-template-columns:1fr}}
        .side{position:sticky;top:64px;align-self:start;background:var(--ca-card);border:1px solid var(--ca-border);border-radius:var(--radius);padding:16px}
        .progress{height:10px;background:#f3f4f6;border-radius:999px;overflow:hidden;margin-top:6px}
        .progress > span{display:block;height:100%;width:0;background:var(--ca-accent);transition:width .2s ease}
        .toc{margin-top:12px;display:grid;gap:6px}
        .toc a{padding:8px 10px;border-radius:10px;text-decoration:none;color:var(--ca-text);border:1px solid transparent}
        .toc a.active{border-color:var(--ca-accent);background:#f0fdf4}
        .card{background:var(--ca-card);border:1px solid var(--ca-border);border-radius:var(--radius);padding:18px}
        .form-header{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:14px}
        .form-title{font-size:20px;font-weight:700}
        .pill{font-size:12px;color:#155e2b;background:#dcfce7;border-radius:999px;padding:4px 8px;font-weight:700}
        .grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
        @media (max-width: 700px){.grid{grid-template-columns:1fr}}
        fieldset{border:1px dashed var(--ca-border);padding:14px;border-radius:12px}
        legend{font-weight:700;color:var(--ca-accent)}
        .q{display:grid;gap:4px}
        label{font-weight:600}
        .hint{font-size:12px;color:var(--ca-muted)}
        input[type="text"], input[type="number"], select{width:100%;padding:10px;border:1px solid #d1d5db;border-radius:10px}
        .row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
        .footer-actions{display:flex;gap:10px;justify-content:flex-end;margin-top:16px}
        .btn{border:none;border-radius:10px;padding:10px 14px;font-weight:700;cursor:pointer}
        .btn.outline{background:#fff;border:1px solid var(--ca-border)}
        .btn.primary{background:var(--ca-accent);color:#fff}
        .sticky-footer{position:sticky;bottom:0;background:rgba(255,255,255,.9);backdrop-filter:saturate(140%) blur(6px);border:1px solid var(--ca-border);border-radius:16px;padding:10px;display:flex;justify-content:space-between;align-items:center}
        .site-footer{margin-top:32px;padding:16px 20px;background:var(--ca-accent-100);text-align:center;color:#374151;border-top:1px solid #dbe7d0}
      `}</style>

      <div id="CarbonFootprintQuizRoot">
        {/* Header */}
        <header className="appbar" role="banner">
          <div className="toolbar">
            <div className="brand" onClick={() => go("/dashboard")} role="button" tabIndex={0}>
              <div className="brand-logo" aria-hidden>CA</div>
              <div className="brand-title">CarbonAid</div>
            </div>
            <nav className="nav" aria-label="Primary">
              <button className="active" onClick={() => go("/dashboard")}>Dashboard</button>
              <button onClick={() => go("/report")}>Report</button>
              <button onClick={() => go("/task")}>Task</button>
            </nav>
            <div className="actions">
              <button className="icon-btn" title="Profile" aria-label="Profile">👤</button>
              <button className="icon-btn" title="Notifications" aria-label="Notifications">🔔</button>
              <button className="icon-btn" title="Help" aria-label="Help">❔</button>
              <button className="icon-btn danger" title="Logout" aria-label="Logout" onClick={() => go("/")}>⎋</button>
            </div>
          </div>
        </header>

        <main className="wrap">
          <div className="layout">
            {/* Sidebar */}
            <aside className="side" aria-labelledby="quiz-progress-title">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                <div>
                  <div id="quiz-progress-title" style={{ fontWeight: 700 }}>Quiz Progress</div>
                  <div className="hint">
                    <span>{answeredCount}</span>/<span>{totalInputs}</span> answered
                  </div>
                </div>
                <span className="pill">Step {stepIndex + 1} of {Math.max(sections.length, 1)}</span>
              </div>
              <div className="progress" aria-hidden><span ref={barRef} /></div>
              <nav className="toc" ref={tocRef} aria-label="On this page">
                {sectionMeta.map(({ id, title, idx }) => (
                  <a
                    key={id}
                    href={`#${id}`}
                    className={activeSectionId === id ? "active" : undefined}
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                  >
                    {idx + 1}. {title}
                  </a>
                ))}
              </nav>
            </aside>

            {/* Form Card */}
            <section className="card" aria-labelledby="quiz-title">
              <div className="form-header">
                <div id="quiz-title" className="form-title">Carbon Footprint Questionnaire</div>
                <span className="pill">Most recent will be shown first</span>
              </div>

              <form ref={formRef} onInput={handleInput} onSubmit={handleSubmit} noValidate>
                {/* BASIC INFO */}
                <section id="sec-basic" data-title="Basic Info" className="grid">
                  <fieldset className="q">
                    <legend>Basic Info</legend>
                    <div className="q">
                      <label htmlFor="householdSize">Household size</label>
                      <input id="householdSize" name="householdSize" type="number" min={1} placeholder="e.g. 3" required />
                      <div className="hint">Number of people regularly living in your home.</div>
                    </div>
                    <div className="q">
                      <label htmlFor="postcode">Postcode / City</label>
                      <input id="postcode" name="postcode" type="text" placeholder="e.g. SW1A 1AA or Tunis" required />
                    </div>
                  </fieldset>
                  <fieldset className="q">
                    <legend>Timeframe</legend>
                    <div className="q">
                      <label htmlFor="period">Reporting period</label>
                      <select id="period" name="period" required>
                        <option value="">Select…</option>
                        <option>Last 30 days</option>
                        <option>Last 90 days</option>
                        <option>Last 12 months</option>
                      </select>
                      <div className="hint">Used to normalise your results and compare reports over time.</div>
                    </div>
                  </fieldset>
                </section>

                {/* TRANSPORTATION */}
                <section id="sec-transport" data-title="Transportation" className="grid">
                  <fieldset className="q">
                    <legend>Personal Car</legend>
                    <div className="q">
                      <label htmlFor="carFuel">Fuel type</label>
                      <select id="carFuel" name="carFuel" required>
                        <option value="">Select…</option>
                        <option>Petrol</option>
                        <option>Diesel</option>
                        <option>Hybrid</option>
                        <option>Electric</option>
                      </select>
                    </div>
                    <div className="row">
                      <div className="q" style={{ flex: "1 1 140px" }}>
                        <label htmlFor="carKm">Distance driven</label>
                        <input id="carKm" name="carKm" type="number" min={0} placeholder="km in period" required />
                      </div>
                      <div className="q" style={{ flex: "1 1 140px" }}>
                        <label htmlFor="carEfficiency">Efficiency</label>
                        <input id="carEfficiency" name="carEfficiency" type="number" min={0} step={0.1} placeholder="L/100km or kWh/100km" />
                        <div className="hint">Leave blank if unknown.</div>
                      </div>
                    </div>
                  </fieldset>
                  <fieldset className="q">
                    <legend>Public Transport & Flights</legend>
                    <div className="row">
                      <div className="q" style={{ flex: "1 1 160px" }}>
                        <label htmlFor="busKm">Bus / Coach (km)</label>
                        <input id="busKm" name="busKm" type="number" min={0} placeholder="e.g. 120" />
                      </div>
                      <div className="q" style={{ flex: "1 1 160px" }}>
                        <label htmlFor="railKm">Rail / Metro (km)</label>
                        <input id="railKm" name="railKm" type="number" min={0} placeholder="e.g. 320" />
                      </div>
                    </div>
                    <div className="row">
                      <div className="q" style={{ flex: "1 1 160px" }}>
                        <label htmlFor="shortFlights">Short-haul flights</label>
                        <input id="shortFlights" name="shortFlights" type="number" min={0} placeholder="# flights" />
                      </div>
                      <div className="q" style={{ flex: "1 1 160px" }}>
                        <label htmlFor="longFlights">Long-haul flights</label>
                        <input id="longFlights" name="longFlights" type="number" min={0} placeholder="# flights" />
                      </div>
                    </div>
                  </fieldset>
                </section>

                {/* HOME ENERGY */}
                <section id="sec-energy" data-title="Home Energy" className="grid">
                  <fieldset className="q">
                    <legend>Electricity</legend>
                    <div className="row">
                      <div className="q" style={{ flex: "1 1 160px" }}>
                        <label htmlFor="elecKwh">Usage (kWh)</label>
                        <input id="elecKwh" name="elecKwh" type="number" min={0} placeholder="e.g. 220" />
                      </div>
                      <div className="q" style={{ flex: "1 1 160px" }}>
                        <label htmlFor="tariff">Tariff / supplier</label>
                        <input id="tariff" name="tariff" type="text" placeholder="optional" />
                      </div>
                    </div>
                    <div className="q">
                      <label htmlFor="solar">Do you have solar?</label>
                      <select id="solar" name="solar">
                        <option value="">Select…</option>
                        <option>None</option>
                        <option>Solar PV (roof)</option>
                        <option>Community solar</option>
                      </select>
                    </div>
                  </fieldset>
                  <fieldset className="q">
                    <legend>Heating</legend>
                    <div className="q">
                      <label htmlFor="heatType">Primary heating type</label>
                      <select id="heatType" name="heatType">
                        <option value="">Select…</option>
                        <option>Natural Gas</option>
                        <option>Heating Oil</option>
                        <option>Electric (Heat Pump)</option>
                        <option>Electric (Resistive)</option>
                        <option>District Heating</option>
                        <option>Biomass</option>
                      </select>
                    </div>
                    <div className="row">
                      <div className="q" style={{ flex: "1 1 160px" }}>
                        <label htmlFor="gasKwh">Gas / Heat kWh</label>
                        <input id="gasKwh" name="gasKwh" type="number" min={0} placeholder="kWh in period" />
                      </div>
                      <div className="q" style={{ flex: "1 1 160px" }}>
                        <label htmlFor="homeArea">Home size (m²)</label>
                        <input id="homeArea" name="homeArea" type="number" min={0} placeholder="e.g. 85" />
                      </div>
                    </div>
                  </fieldset>
                </section>

                {/* DIET */}
                <section id="sec-diet" data-title="Diet" className="grid">
                  <fieldset className="q">
                    <legend>Diet Pattern</legend>
                    <div className="q">
                      <label htmlFor="dietType">Typical diet</label>
                      <select id="dietType" name="dietType">
                        <option value="">Select…</option>
                        <option>Omnivore (meat daily)</option>
                        <option>Reduced-meat (few times/week)</option>
                        <option>Pescatarian</option>
                        <option>Vegetarian</option>
                        <option>Vegan</option>
                      </select>
                    </div>
                    <div className="row">
                      <div className="q" style={{ flex: "1 1 160px" }}>
                        <label htmlFor="eatingOut">Meals out / week</label>
                        <input id="eatingOut" name="eatingOut" type="number" min={0} placeholder="e.g. 2" />
                      </div>
                      <div className="q" style={{ flex: "1 1 160px" }}>
                        <label htmlFor="foodWaste">Food wasted / week (kg)</label>
                        <input id="foodWaste" name="foodWaste" type="number" step={0.1} min={0} placeholder="e.g. 0.6" />
                      </div>
                    </div>
                  </fieldset>
                  <fieldset className="q">
                    <legend>Groceries</legend>
                    <div className="q">
                      <label htmlFor="localShare">% local / seasonal</label>
                      <input id="localShare" name="localShare" type="number" min={0} max={100} placeholder="0–100" />
                    </div>
                    <div className="q">
                      <label htmlFor="organicShare">% organic</label>
                      <input id="organicShare" name="organicShare" type="number" min={0} max={100} placeholder="0–100" />
                    </div>
                  </fieldset>
                </section>

                {/* CONSUMPTION & WASTE */}
                <section id="sec-consumption" data-title="Consumption & Waste" className="grid">
                  <fieldset className="q">
                    <legend>Purchases</legend>
                    <div className="q">
                      <label htmlFor="clothesItems">Clothing items bought / month</label>
                      <input id="clothesItems" name="clothesItems" type="number" min={0} placeholder="e.g. 3" />
                    </div>
                    <div className="q">
                      <label htmlFor="electronicsSpend">Electronics spend in period (currency)</label>
                      <input id="electronicsSpend" name="electronicsSpend" type="number" min={0} placeholder="e.g. 250" />
                    </div>
                  </fieldset>
                  <fieldset className="q">
                    <legend>Waste</legend>
                    <div className="q">
                      <label htmlFor="recycleRate">Recycling rate (%)</label>
                      <input id="recycleRate" name="recycleRate" type="number" min={0} max={100} placeholder="0–100" />
                    </div>
                    <div className="q">
                      <label htmlFor="trashKg">General waste / week (kg)</label>
                      <input id="trashKg" name="trashKg" type="number" min={0} step={0.1} placeholder="e.g. 3.2" />
                    </div>
                  </fieldset>
                </section>

                {/* Sticky actions (Save / Submit) */}
                <div className="sticky-footer">
                  <div className="hint">Your inputs auto-save in this browser as a draft.</div>
                  <div className="footer-actions">
                    <button type="button" className="btn outline" onClick={handleClearDraft}>
                      Clear draft
                    </button>
                    <button type="submit" className="btn primary">
                      Submit quiz
                    </button>
                  </div>
                </div>
              </form>
            </section>
          </div>

          {/* App Footer */}
          <footer className="site-footer">© <span>{year}</span> CarbonAid. All rights reserved.</footer>
        </main>
      </div>
    </>
  );
};

export default Form;
