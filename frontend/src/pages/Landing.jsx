import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../utils/AuthContext";
import { GENDERS, BLOOD_TYPES } from "../utils/api";
import doctorHero from "../doctor.png";

function useOnScreen(ref, threshold = 0.15) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [ref, threshold]);
  return visible;
}

function AnimatedSection({ children, className = "", delay = 0 }) {
  const ref = useRef(null);
  const visible = useOnScreen(ref);
  return (
    <div ref={ref} className={`anim-section ${visible ? "anim-visible" : ""} ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

const TRUST_LOGOS = [
  <svg key="t1" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="1.5"><path d="M3 21h18M9 8h1M9 12h1M9 16h1M14 8h1M14 12h1M14 16h1M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"/></svg>,
  <svg key="t2" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="1.5"><path d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.69a1.5 1.5 0 0 0 1.342 2.171h11.876a1.5 1.5 0 0 0 1.342-2.17l-5.07-10.268A2 2 0 0 1 14 9.527V2"/><path d="M8.5 2h7M7 16.5h10"/></svg>,
  <svg key="t3" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 2"/></svg>,
  <svg key="t4" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="1.5"><path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6 6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/><path d="M8 15v1a6 6 0 0 0 6 6 6 6 0 0 0 6-6v-4"/><path d="M22 10c0 1.66-1.33 3-3 3"/></svg>,
  <svg key="t5" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ec4899" strokeWidth="1.5"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>,
  <svg key="t6" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.5"><path d="M9 2h6l3 7H6Zm0 0 3 7m6-7-3 7M6 9l1.5 11.5a1 1 0 0 0 1 .9h7a1 1 0 0 0 1-.9L18 9"/><path d="M12 13v4"/></svg>,
];

export default function Landing() {
  const { login, register: doRegister, setToast } = useAuth();
  const navigate = useNavigate();
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [registerForm, setRegisterForm] = useState({
    email: "", full_name: "", password: "", age: "", gender: "Male", blood_type: "O+", allergies: "", medications: "", role: "patient"
  });

  // Animated counter hook
  const [counts, setCounts] = useState({ diag: 0, uptime: 0, records: 0, speed: 0 });
  const statsRef = useRef(null);
  const statsVisible = useOnScreen(statsRef);
  useEffect(() => {
    if (!statsVisible) return;
    const targets = { diag: 98, uptime: 24, records: 1, speed: 40 };
    const duration = 2000;
    const steps = 60;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      const progress = Math.min(step / steps, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setCounts({
        diag: Math.round(targets.diag * ease),
        uptime: Math.round(targets.uptime * ease),
        records: +(targets.records * ease).toFixed(1),
        speed: Math.round(targets.speed * ease),
      });
      if (step >= steps) clearInterval(timer);
    }, duration / steps);
    return () => clearInterval(timer);
  }, [statsVisible]);

  function openAuth(mode) { setAuthMode(mode); setShowAuth(true); setAuthError(""); }

  async function handleLogin(e) {
    e.preventDefault(); setAuthLoading(true); setAuthError("");
    try {
      const data = await login(loginForm.email, loginForm.password);
      setShowAuth(false);
      navigate(data.role === "doctor" ? "/doctor/portal" : "/consult/new");
      setToast(data.role === "doctor" ? "Welcome to your Doctor Portal." : "Welcome back. Your clinical workspace is ready.");
    } catch (err) { setAuthError(err.message); } finally { setAuthLoading(false); }
  }

  async function handleRegister(e) {
    e.preventDefault(); setAuthLoading(true); setAuthError("");
    try {
      const data = await doRegister(registerForm);
      setShowAuth(false);
      navigate(data.role === "doctor" ? "/doctor/portal" : "/consult/new");
      setToast(data.role === "doctor" ? "Doctor account created." : "Account created. You are now signed in.");
    } catch (err) { setAuthError(err.message); } finally { setAuthLoading(false); }
  }

  return (
    <>
      <main className="landing-page">
        {/* Animated background particles */}
        <div className="landing-particles">
          <div className="particle p1" />
          <div className="particle p2" />
          <div className="particle p3" />
          <div className="particle p4" />
          <div className="particle p5" />
        </div>

        <header className="landing-nav anim-nav">
          <div className="brand-mark">
            <div className="brand-pulse" />
            <div><strong>AI Medical Assistant</strong><span>Clinical intelligence platform</span></div>
          </div>
          <nav className="landing-links">
            <a href="#solutions">Solutions</a><a href="#experience">Experience</a><a href="#features">Features</a><a href="#contact">Contact</a>
          </nav>
          <div className="landing-actions">
            <button className="ghost-button" onClick={() => openAuth("login")}>Sign in</button>
            <button className="primary-button" onClick={() => openAuth("register")}>Get started</button>
          </div>
        </header>

        <section className="hero-section">
          <div className="hero-copy">
            <AnimatedSection>
              <span className="hero-badge">
                <span className="hero-badge-dot" />
                New: Voice, vision, triage, RAG, and safety guardrails in one workflow
              </span>
            </AnimatedSection>
            <AnimatedSection delay={150}>
              <h1>AI-powered <span>healthcare UX</span> for faster and better decisions.</h1>
            </AnimatedSection>
            <AnimatedSection delay={300}>
              <p>Deliver an industry-grade patient experience with secure symptom recording, medical image analysis, differential diagnosis support, and clinician-ready summaries.</p>
            </AnimatedSection>
            <AnimatedSection delay={450}>
              <div className="hero-buttons">
                <button className="primary-button large hero-cta-glow" onClick={() => openAuth("register")}>
                  <span className="hero-cta-shine" />
                  Launch dashboard
                </button>
                <button className="secondary-button large" onClick={() => document.getElementById("experience")?.scrollIntoView({ behavior: "smooth" })}>Preview product</button>
              </div>
            </AnimatedSection>
            <div className="hero-stats" ref={statsRef}>
              <AnimatedSection delay={500} className="stat-card-anim">
                <div className="stat-card"><strong>{counts.diag}%</strong><span>Diagnostic confidence</span></div>
              </AnimatedSection>
              <AnimatedSection delay={600} className="stat-card-anim">
                <div className="stat-card"><strong>{counts.uptime}/7</strong><span>Continuous intake</span></div>
              </AnimatedSection>
              <AnimatedSection delay={700} className="stat-card-anim">
                <div className="stat-card"><strong>{counts.records}M+</strong><span>Knowledge records</span></div>
              </AnimatedSection>
              <AnimatedSection delay={800} className="stat-card-anim">
                <div className="stat-card"><strong>{counts.speed}%</strong><span>Faster workflows</span></div>
              </AnimatedSection>
            </div>
          </div>
          <div className="hero-visual">
            <div className="hero-glow-orb" />
            <div className="hero-visual-card floating top"><span>System status</span><strong>Analysis complete</strong></div>
            <img src={doctorHero} alt="AI doctor" className="doctor-hero hero-img-anim" />
            <div className="hero-visual-card floating bottom">
              <div className="avatar-stack"><span /><span /><span /></div>
              <div><strong>500+</strong><span>Expert doctors connected</span></div>
            </div>
          </div>
        </section>

        {/* Trust bar */}
        <AnimatedSection className="trust-bar">
          <span className="trust-label">Trusted by leading healthcare institutions</span>
          <div className="trust-logos">
            {TRUST_LOGOS.map((logo, i) => (
              <div key={i} className="trust-logo" style={{ animationDelay: `${i * 0.15}s` }}>{logo}</div>
            ))}
          </div>
        </AnimatedSection>

        <section id="solutions" className="feature-section">
          <AnimatedSection>
            <div className="section-heading"><span className="eyebrow">Why it feels premium</span><h2>Designed like a modern health-tech product, not a demo.</h2></div>
          </AnimatedSection>
          <div className="feature-grid">
            {[
              { icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><defs><linearGradient id="gMic" x1="0" y1="0" x2="24" y2="24"><stop stopColor="#4f46e5"/><stop offset="1" stopColor="#7c3aed"/></linearGradient></defs><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3Z" fill="url(#gMic)" opacity=".2"/><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3Z" stroke="url(#gMic)" strokeWidth="2"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4m-4 0h8" stroke="url(#gMic)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>, title: "Voice-first consultation", desc: "Microphone recording, upload fallback, audio playback, and structured medical outputs in one flow." },
              { icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><defs><linearGradient id="gEye" x1="0" y1="0" x2="24" y2="24"><stop stopColor="#3b82f6"/><stop offset="1" stopColor="#06b6d4"/></linearGradient></defs><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12Z" fill="url(#gEye)" opacity=".15"/><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12Z" stroke="url(#gEye)" strokeWidth="2"/><circle cx="12" cy="12" r="3" fill="url(#gEye)" opacity=".3" stroke="url(#gEye)" strokeWidth="2"/></svg>, title: "Clinical image support", desc: "Attach symptom photos or scans and review the vision model findings alongside triage and diagnosis." },
              { icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><defs><linearGradient id="gChart" x1="0" y1="24" x2="24" y2="0"><stop stopColor="#059669"/><stop offset="1" stopColor="#10b981"/></linearGradient></defs><rect x="3" y="3" width="18" height="18" rx="2" fill="url(#gChart)" opacity=".12" stroke="url(#gChart)" strokeWidth="2"/><path d="M7 17V13m5 4V7m5 10v-4" stroke="url(#gChart)" strokeWidth="2.5" strokeLinecap="round"/></svg>, title: "Operational dashboard", desc: "Sidebar history, patient profile management, urgency summary, confidence, and chat-style results." },
              { icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><defs><linearGradient id="gBrain" x1="0" y1="0" x2="24" y2="24"><stop stopColor="#8b5cf6"/><stop offset="1" stopColor="#ec4899"/></linearGradient></defs><path d="M12 2a7 7 0 0 0-4.6 12.3A4 4 0 0 0 9 22h6a4 4 0 0 0 1.6-7.7A7 7 0 0 0 12 2Z" fill="url(#gBrain)" opacity=".12"/><path d="M12 2a7 7 0 0 0-4.6 12.3A4 4 0 0 0 9 22h6a4 4 0 0 0 1.6-7.7A7 7 0 0 0 12 2Z" stroke="url(#gBrain)" strokeWidth="2"/><path d="M9 14.5a2 2 0 0 0 3 1.7 2 2 0 0 0 3-1.7" stroke="url(#gBrain)" strokeWidth="1.5" strokeLinecap="round"/><circle cx="9.5" cy="10" r="1" fill="url(#gBrain)"/><circle cx="14.5" cy="10" r="1" fill="url(#gBrain)"/></svg>, title: "AI-powered triage", desc: "Automatic urgency classification, differential diagnosis, and specialist recommendations in seconds." },
              { icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><defs><linearGradient id="gShield" x1="0" y1="0" x2="24" y2="24"><stop stopColor="#f59e0b"/><stop offset="1" stopColor="#ef4444"/></linearGradient></defs><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" fill="url(#gShield)" opacity=".12"/><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" stroke="url(#gShield)" strokeWidth="2"/><path d="m9 12 2 2 4-4" stroke="url(#gShield)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>, title: "Safety guardrails", desc: "Built-in confidence thresholds, flagging system, and emergency detection for responsible AI use." },
              { icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><defs><linearGradient id="gGlobe" x1="0" y1="0" x2="24" y2="24"><stop stopColor="#0ea5e9"/><stop offset="1" stopColor="#6366f1"/></linearGradient></defs><circle cx="12" cy="12" r="10" fill="url(#gGlobe)" opacity=".1" stroke="url(#gGlobe)" strokeWidth="2"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10A15.3 15.3 0 0 1 12 2Z" stroke="url(#gGlobe)" strokeWidth="2"/></svg>, title: "Multi-language support", desc: "Speak in Hindi, Kannada, Marathi, or English. Full multilingual voice and text processing pipeline." },
            ].map((f, i) => (
              <AnimatedSection key={i} delay={i * 100}>
                <div className="feature-card feature-card-hover">
                  <div className="feature-icon-wrap">{f.icon}</div>
                  <strong>{f.title}</strong>
                  <p>{f.desc}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </section>

        <section id="experience" className="preview-section">
          <AnimatedSection>
            <div className="preview-frame">
              <aside className="preview-sidebar">
                <div className="preview-side-icons"><span /><span className="active" /><span /><span /></div>
                <div className="preview-history-card">
                  <h3>Chat history</h3>
                  <input value="chest pain, dizziness" readOnly />
                  <button type="button">+ New consultation</button>
                  <div className="preview-history-items">
                    <div>How can I optimize triage response?</div>
                    <div>What is the best way to design diagnosis cards?</div>
                    <div>How can symptom capture feel intuitive?</div>
                  </div>
                </div>
              </aside>
              <div className="preview-main">
                <div className="preview-topbar"><span>Care Engine v5.0</span><div className="preview-user">Medical Admin</div></div>
                <div className="preview-center">
                  <div className="preview-orb" />
                  <h3>Welcome to AI Medical Assistant</h3>
                  <p>Describe what you want to assess and the assistant will handle the rest.</p>
                  <div className="preview-actions"><span>Generate diagnosis</span><span>Review image</span><span>Improve prompt</span><span>Dashboard design</span></div>
                </div>
                <div className="preview-composer"><span>Describe symptoms, attach files, or start voice capture...</span><button type="button">Send</button></div>
              </div>
            </div>
          </AnimatedSection>
        </section>

        <section id="features" className="cta-section">
          <AnimatedSection>
            <div><span className="eyebrow">Ready to modernize?</span><h2>Ship a frontend experience that looks enterprise-grade from day one.</h2></div>
          </AnimatedSection>
          <AnimatedSection delay={200}>
            <button className="primary-button large hero-cta-glow" onClick={() => openAuth("register")}>Start using the dashboard</button>
          </AnimatedSection>
        </section>
      </main>

      {showAuth && (
        <div className="auth-backdrop" onClick={() => setShowAuth(false)}>
          <div className="auth-modal auth-modal-anim" onClick={(e) => e.stopPropagation()}>
            <div className="auth-tabs">
              <button className={authMode === "login" ? "active" : ""} onClick={() => setAuthMode("login")}>Login</button>
              <button className={authMode === "register" ? "active" : ""} onClick={() => setAuthMode("register")}>Register</button>
            </div>
            {authMode === "login" ? (
              <form className="auth-form" onSubmit={handleLogin}>
                <h3>Welcome back</h3>
                <p>Sign in to access the patient dashboard and consultation history.</p>
                <input type="email" placeholder="Email" value={loginForm.email} onChange={(e) => setLoginForm((c) => ({ ...c, email: e.target.value }))} />
                <input type="password" placeholder="Password" value={loginForm.password} onChange={(e) => setLoginForm((c) => ({ ...c, password: e.target.value }))} />
                {authError && <div className="auth-error">{authError}</div>}
                <button className="primary-button full" type="submit" disabled={authLoading}>{authLoading ? "Signing in..." : "Sign in"}</button>
              </form>
            ) : (
              <form className="auth-form register" onSubmit={handleRegister}>
                <h3>Create account</h3>
                <p>Set up your profile to continue.</p>
                
                <div className="auth-role-toggle" style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
                  <button type="button" className={`ghost-button ${registerForm.role === "patient" ? "active" : ""}`} style={{ flex: 1, background: registerForm.role === "patient" ? "rgba(79, 70, 229, 0.1)" : "transparent", borderColor: registerForm.role === "patient" ? "var(--indigo)" : "var(--border)" }} onClick={() => setRegisterForm(c => ({...c, role: "patient"}))}>Patient</button>
                  <button type="button" className={`ghost-button ${registerForm.role === "doctor" ? "active" : ""}`} style={{ flex: 1, background: registerForm.role === "doctor" ? "rgba(79, 70, 229, 0.1)" : "transparent", borderColor: registerForm.role === "doctor" ? "var(--indigo)" : "var(--border)" }} onClick={() => setRegisterForm(c => ({...c, role: "doctor"}))}>Doctor</button>
                </div>
                
                {registerForm.role === "doctor" && <div className="auth-error" style={{ color: "var(--amber)", backgroundColor: "rgba(245, 158, 11, 0.1)" }}>Doctor emails must end with @doctor.com</div>}
                
                <input type="text" placeholder="Full name" value={registerForm.full_name} onChange={(e) => setRegisterForm((c) => ({ ...c, full_name: e.target.value }))} />
                <input type="email" placeholder="Email" value={registerForm.email} onChange={(e) => setRegisterForm((c) => ({ ...c, email: e.target.value }))} />
                <input type="password" placeholder="Password" value={registerForm.password} onChange={(e) => setRegisterForm((c) => ({ ...c, password: e.target.value }))} />
                {registerForm.role === "patient" && (
                  <>
                    <div className="double-fields">
                      <input type="number" placeholder="Age" value={registerForm.age} onChange={(e) => setRegisterForm((c) => ({ ...c, age: e.target.value }))} />
                      <select value={registerForm.gender} onChange={(e) => setRegisterForm((c) => ({ ...c, gender: e.target.value }))}>{GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}</select>
                    </div>
                    <select value={registerForm.blood_type} onChange={(e) => setRegisterForm((c) => ({ ...c, blood_type: e.target.value }))}>{BLOOD_TYPES.map((b) => <option key={b} value={b}>{b}</option>)}</select>
                    <textarea rows="2" placeholder="Allergies" value={registerForm.allergies} onChange={(e) => setRegisterForm((c) => ({ ...c, allergies: e.target.value }))} />
                    <textarea rows="2" placeholder="Current medications" value={registerForm.medications} onChange={(e) => setRegisterForm((c) => ({ ...c, medications: e.target.value }))} />
                  </>
                )}
                {authError && <div className="auth-error">{authError}</div>}
                <button className="primary-button full" type="submit" disabled={authLoading}>{authLoading ? "Creating..." : "Create account"}</button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
