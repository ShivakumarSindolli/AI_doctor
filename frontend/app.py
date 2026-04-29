"""
AI Doctor Pro — Gradio Frontend
Talks to the FastAPI backend at http://127.0.0.1:8000
"""

import os
import uuid
import requests
import gradio as gr
from dotenv import load_dotenv

load_dotenv()

BACKEND_URL = os.environ.get("BACKEND_URL", "http://127.0.0.1:8000")

# ── Shared state ───────────────────────────────────────────────────────────────
_token      = {"value": None}
_session_id = {"value": str(uuid.uuid4())}


def _headers():
    if _token["value"]:
        return {"Authorization": f"Bearer {_token['value']}"}
    return {}


# ── Auth actions ───────────────────────────────────────────────────────────────

def register(email, full_name, password, age, gender, blood_type, allergies, medications):
    try:
        r = requests.post(f"{BACKEND_URL}/auth/register", json={
            "email": email, "full_name": full_name, "password": password,
            "age": int(age) if age else None, "gender": gender or None,
            "blood_type": blood_type or None,
            "allergies": allergies or None, "medications": medications or None,
        })
        data = r.json()
        if r.status_code == 200:
            _token["value"] = data["access_token"]
            return f"✅ Registered and logged in as {full_name}!"
        return f"❌ {data.get('detail', 'Registration failed.')}"
    except Exception as e:
        return f"❌ Error: {e}"


def login(email, password):
    try:
        r = requests.post(f"{BACKEND_URL}/auth/login",
                          data={"username": email, "password": password})
        data = r.json()
        if r.status_code == 200:
            _token["value"] = data["access_token"]
            _session_id["value"] = str(uuid.uuid4())
            return f"✅ Logged in successfully!"
        return f"❌ {data.get('detail', 'Login failed.')}"
    except Exception as e:
        return f"❌ Error: {e}"


def get_profile():
    try:
        r = requests.get(f"{BACKEND_URL}/patients/me", headers=_headers())
        if r.status_code == 200:
            p = r.json()
            return (
                f"👤 {p['full_name']}  |  📧 {p['email']}\n"
                f"🎂 Age: {p['age']}  |  ⚧ Gender: {p['gender']}  |  🩸 Blood: {p['blood_type']}\n"
                f"💊 Medications: {p['medications'] or 'None'}\n"
                f"⚠️ Allergies: {p['allergies'] or 'None'}"
            )
        return "❌ Please log in first."
    except Exception as e:
        return f"❌ Error: {e}"


# ── Consultation ───────────────────────────────────────────────────────────────

def new_session():
    _session_id["value"] = str(uuid.uuid4())
    return "🔄 New session started. You can now begin a fresh consultation."


def consult(audio_path, image_path):
    if not _token["value"]:
        return (
            "❌ Please log in first.",
            "", "", "", "", "", None
        )
    if not audio_path:
        return (
            "❌ Please record your voice first.",
            "", "", "", "", "", None
        )

    try:
        files = {"audio": open(audio_path, "rb")}
        if image_path:
            files["image"] = open(image_path, "rb")

        data = {"session_id": _session_id["value"]}

        r = requests.post(
            f"{BACKEND_URL}/consult/",
            files=files,
            data=data,
            headers=_headers(),
            timeout=60,
        )

        if r.status_code != 200:
            err = r.json().get("detail", "Unknown error")
            return f"❌ {err}", "", "", "", "", "", None

        res = r.json()

        # ── Format outputs ─────────────────────────────────────────────────────
        patient_text   = res.get("patient_text", "")
        specialist     = res.get("specialist", "").title()
        urgency        = res.get("urgency", "").title()
        doctor_response= res.get("doctor_response", "")
        confidence     = res.get("confidence", 0.0)
        flagged        = res.get("flagged", False)

        diag           = res.get("diagnosis", {})
        differentials  = diag.get("differential_diagnosis", [])
        tests          = diag.get("recommended_tests", [])
        red_flags      = diag.get("red_flags", [])
        advice         = diag.get("lifestyle_advice", [])

        diag_text = ""
        if differentials:
            diag_text += "Differential Diagnosis:\n"
            for d in differentials:
                diag_text += f"  • {d['condition']} ({d['likelihood']}) — {d['reasoning']}\n"
        if tests:
            diag_text += f"\nRecommended Tests:\n  • " + "\n  • ".join(tests)
        if red_flags:
            diag_text += f"\n\nRed Flags:\n  ⚠️ " + "\n  ⚠️ ".join(red_flags)
        if advice:
            diag_text += f"\n\nLifestyle Advice:\n  • " + "\n  • ".join(advice)

        meta = (
            f"Specialist: {specialist}  |  Urgency: {urgency}  |  "
            f"Confidence: {int(confidence*100)}%  |  "
            f"{'⚠️ Flagged for review' if flagged else '✅ No safety flags'}"
        )

        # Audio
        audio_out_path = res.get("audio_path")

        return patient_text, diag_text, doctor_response, meta, "", "", audio_out_path

    except Exception as e:
        return f"❌ Error: {e}", "", "", "", "", "", None


def load_history():
    if not _token["value"]:
        return "❌ Please log in first."
    try:
        r = requests.get(f"{BACKEND_URL}/history/", headers=_headers())
        if r.status_code != 200:
            return "❌ Could not load history."
        records = r.json().get("consultations", [])
        if not records:
            return "No consultations yet."
        out = []
        for rec in records:
            diag = rec.get("diagnosis", {})
            top  = ""
            if isinstance(diag, dict) and diag.get("differential_diagnosis"):
                top = diag["differential_diagnosis"][0].get("condition", "")
            out.append(
                f"📅 {rec['date'][:10]}  |  🩺 {rec['specialist'].title()}  |  "
                f"💬 {rec['patient_text'][:60]}...  |  🔬 {top}"
            )
        return "\n\n".join(out)
    except Exception as e:
        return f"❌ Error: {e}"


# ── Gradio UI ──────────────────────────────────────────────────────────────────

with gr.Blocks(
    title="🩺 AI Doctor Pro",
    theme=gr.themes.Soft(primary_hue="blue", secondary_hue="teal"),
) as demo:

    gr.Markdown("""
    # 🩺 AI Doctor Pro
    **AI-powered medical assistant** — Voice · Vision · RAG · Triage · Safety Guardrails
    > ⚠️ For educational purposes only. Always consult a qualified physician.
    """)

    # ── Tabs ───────────────────────────────────────────────────────────────────
    with gr.Tabs():

        # ── Tab 1: Consultation ────────────────────────────────────────────────
        with gr.Tab("🎙️ Consultation"):
            with gr.Row():
                with gr.Column(scale=1):
                    gr.Markdown("### Your Input")
                    audio_in   = gr.Audio(sources=["microphone"], type="filepath",
                                          label="Record your symptoms")
                    image_in   = gr.Image(type="filepath", label="Upload medical image (optional)")
                    with gr.Row():
                        submit_btn   = gr.Button("🔍 Consult Doctor", variant="primary")
                        new_sess_btn = gr.Button("🔄 New Session", variant="secondary")
                    session_msg = gr.Textbox(label="Session", interactive=False, lines=1)

                with gr.Column(scale=2):
                    gr.Markdown("### Doctor's Assessment")
                    stt_out    = gr.Textbox(label="📝 Your words (transcribed)", lines=2)
                    meta_out   = gr.Textbox(label="📊 Triage Summary", lines=2)
                    diag_out   = gr.Textbox(label="🔬 Diagnosis & Recommendations", lines=8)
                    resp_out   = gr.Textbox(label="💬 Doctor's Response", lines=4)
                    audio_out  = gr.Audio(label="🔊 Doctor's Voice", autoplay=True)

            hidden1 = gr.Textbox(visible=False)
            hidden2 = gr.Textbox(visible=False)

            submit_btn.click(
                fn=consult,
                inputs=[audio_in, image_in],
                outputs=[stt_out, diag_out, resp_out, meta_out, hidden1, hidden2, audio_out],
            )
            new_sess_btn.click(fn=new_session, outputs=[session_msg])

        # ── Tab 2: Auth ────────────────────────────────────────────────────────
        with gr.Tab("🔐 Login / Register"):
            with gr.Row():
                with gr.Column():
                    gr.Markdown("### Login")
                    login_email    = gr.Textbox(label="Email")
                    login_password = gr.Textbox(label="Password", type="password")
                    login_btn      = gr.Button("Login", variant="primary")
                    login_msg      = gr.Textbox(label="Status", interactive=False)
                    login_btn.click(fn=login,
                                    inputs=[login_email, login_password],
                                    outputs=[login_msg])

                with gr.Column():
                    gr.Markdown("### Register")
                    reg_email   = gr.Textbox(label="Email")
                    reg_name    = gr.Textbox(label="Full Name")
                    reg_pass    = gr.Textbox(label="Password", type="password")
                    reg_age     = gr.Number(label="Age", precision=0)
                    reg_gender  = gr.Dropdown(["Male", "Female", "Other"], label="Gender")
                    reg_blood   = gr.Dropdown(["A+","A-","B+","B-","O+","O-","AB+","AB-"],
                                              label="Blood Type")
                    reg_allergy = gr.Textbox(label="Allergies (optional)")
                    reg_meds    = gr.Textbox(label="Current Medications (optional)")
                    reg_btn     = gr.Button("Register", variant="primary")
                    reg_msg     = gr.Textbox(label="Status", interactive=False)
                    reg_btn.click(
                        fn=register,
                        inputs=[reg_email, reg_name, reg_pass, reg_age,
                                reg_gender, reg_blood, reg_allergy, reg_meds],
                        outputs=[reg_msg],
                    )

        # ── Tab 3: Profile ─────────────────────────────────────────────────────
        with gr.Tab("👤 My Profile"):
            profile_btn = gr.Button("Load Profile")
            profile_out = gr.Textbox(label="Profile", lines=5, interactive=False)
            profile_btn.click(fn=get_profile, outputs=[profile_out])

        # ── Tab 4: History ─────────────────────────────────────────────────────
        with gr.Tab("📋 History"):
            hist_btn = gr.Button("Load My Consultation History")
            hist_out = gr.Textbox(label="Past Consultations", lines=12, interactive=False)
            hist_btn.click(fn=load_history, outputs=[hist_out])


if __name__ == "__main__":
    demo.launch(debug=True, server_port=7860)
