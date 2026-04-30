import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../utils/AuthContext";
import { GENDERS, BLOOD_TYPES } from "../utils/api";
import doctorHero from "../doctor.png";

export default function Landing() {
  const { login, register: doRegister, setToast } = useAuth();
  const navigate = useNavigate();
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [registerForm, setRegisterForm] = useState({
    email: "", full_name: "", password: "", age: "", gender: "Male", blood_type: "O+", allergies: "", medications: "",
  });

  function openAuth(mode) { setAuthMode(mode); setShowAuth(true); setAuthError(""); }

  async function handleLogin(e) {
    e.preventDefault(); setAuthLoading(true); setAuthError("");
    try {
      await login(loginForm.email, loginForm.password);
      setShowAuth(false); navigate("/consult/new");
      setToast("Welcome back. Your clinical workspace is ready.");
    } catch (err) { setAuthError(err.message); } finally { setAuthLoading(false); }
  }

  async function handleRegister(e) {
    e.preventDefault(); setAuthLoading(true); setAuthError("");
    try {
      await doRegister(registerForm);
      setShowAuth(false); navigate("/consult/new");
      setToast("Account created. You are now signed in.");
    } catch (err) { setAuthError(err.message); } finally { setAuthLoading(false); }
  }

  return (
    <>
      <main className="landing-page">
        <header className="landing-nav">
          <div className="brand-mark">
            <div className="brand-pulse" />
            <div><strong>MediAI</strong><span>Clinical intelligence platform</span></div>
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
            <span className="hero-badge">New: Voice, vision, triage, RAG, and safety guardrails in one workflow</span>
            <h1>AI-powered <span>healthcare UX</span> for faster and better decisions.</h1>
            <p>Deliver an industry-grade patient experience with secure symptom recording, medical image analysis, differential diagnosis support, and clinician-ready summaries.</p>
            <div className="hero-buttons">
              <button className="primary-button large" onClick={() => openAuth("register")}>Launch dashboard</button>
              <button className="secondary-button large" onClick={() => document.getElementById("experience")?.scrollIntoView({ behavior: "smooth" })}>Preview product</button>
            </div>
            <div className="hero-stats">
              <div className="stat-card"><strong>98%</strong><span>Diagnostic confidence</span></div>
              <div className="stat-card"><strong>24/7</strong><span>Continuous intake</span></div>
              <div className="stat-card"><strong>1M+</strong><span>Knowledge records</span></div>
              <div className="stat-card"><strong>40%</strong><span>Faster workflows</span></div>
            </div>
          </div>
          <div className="hero-visual">
            <div className="hero-visual-card floating top"><span>System status</span><strong>Analysis complete</strong></div>
            <img src={doctorHero} alt="AI doctor" className="doctor-hero" />
            <div className="hero-visual-card floating bottom">
              <div className="avatar-stack"><span /><span /><span /></div>
              <div><strong>500+</strong><span>Expert doctors connected</span></div>
            </div>
          </div>
        </section>

        <section id="solutions" className="feature-section">
          <div className="section-heading"><span className="eyebrow">Why it feels premium</span><h2>Designed like a modern health-tech product, not a demo.</h2></div>
          <div className="feature-grid">
            <div className="feature-card"><strong>Voice-first consultation</strong><p>Microphone recording, upload fallback, audio playback, and structured medical outputs in one flow.</p></div>
            <div className="feature-card"><strong>Clinical image support</strong><p>Attach symptom photos or scans and review the vision model findings alongside triage and diagnosis.</p></div>
            <div className="feature-card"><strong>Operational dashboard</strong><p>Sidebar history, patient profile management, urgency summary, confidence, and chat-style results.</p></div>
          </div>
        </section>

        <section id="experience" className="preview-section">
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
                <h3>Welcome to MediAI</h3>
                <p>Describe what you want to assess and the assistant will handle the rest.</p>
                <div className="preview-actions"><span>Generate diagnosis</span><span>Review image</span><span>Improve prompt</span><span>Dashboard design</span></div>
              </div>
              <div className="preview-composer"><span>Describe symptoms, attach files, or start voice capture...</span><button type="button">Send</button></div>
            </div>
          </div>
        </section>

        <section id="features" className="cta-section">
          <div><span className="eyebrow">Ready to modernize?</span><h2>Ship a frontend experience that looks enterprise-grade from day one.</h2></div>
          <button className="primary-button large" onClick={() => openAuth("register")}>Start using the dashboard</button>
        </section>
      </main>

      {showAuth && (
        <div className="auth-backdrop" onClick={() => setShowAuth(false)}>
          <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
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
                <p>Set up a patient profile and start a voice-powered diagnosis flow.</p>
                <input type="text" placeholder="Full name" value={registerForm.full_name} onChange={(e) => setRegisterForm((c) => ({ ...c, full_name: e.target.value }))} />
                <input type="email" placeholder="Email" value={registerForm.email} onChange={(e) => setRegisterForm((c) => ({ ...c, email: e.target.value }))} />
                <input type="password" placeholder="Password" value={registerForm.password} onChange={(e) => setRegisterForm((c) => ({ ...c, password: e.target.value }))} />
                <div className="double-fields">
                  <input type="number" placeholder="Age" value={registerForm.age} onChange={(e) => setRegisterForm((c) => ({ ...c, age: e.target.value }))} />
                  <select value={registerForm.gender} onChange={(e) => setRegisterForm((c) => ({ ...c, gender: e.target.value }))}>{GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}</select>
                </div>
                <select value={registerForm.blood_type} onChange={(e) => setRegisterForm((c) => ({ ...c, blood_type: e.target.value }))}>{BLOOD_TYPES.map((b) => <option key={b} value={b}>{b}</option>)}</select>
                <textarea rows="2" placeholder="Allergies" value={registerForm.allergies} onChange={(e) => setRegisterForm((c) => ({ ...c, allergies: e.target.value }))} />
                <textarea rows="2" placeholder="Current medications" value={registerForm.medications} onChange={(e) => setRegisterForm((c) => ({ ...c, medications: e.target.value }))} />
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
