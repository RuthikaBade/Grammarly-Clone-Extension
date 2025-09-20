from fastapi import FastAPI
from pydantic import BaseModel
from typing import List
import os
import json
import difflib
import google.generativeai as genai
from dotenv import load_dotenv
import asyncio

app = FastAPI()

# --- Configure Gemini ---
GEMINI_KEY = "AIzaSyD94kQdwmAS_QFVOVU2MJhM0ttaP4oZ4Y0"
if not GEMINI_KEY:
    raise RuntimeError("Set GEMINI_API_KEY in environment")

genai.configure(api_key=GEMINI_KEY)
MODEL_NAME = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")
model = genai.GenerativeModel(MODEL_NAME)

# --- Data models ---
class CheckRequest(BaseModel):
    text: str
    language: str = "auto"

class Correction(BaseModel):
    start: int
    end: int
    original: str
    correction: str
    message: str = ""

class CheckResponse(BaseModel):
    corrections: List[Correction]

# --- Word-level diff helper ---
def word_diff(original: str, corrected: str) -> List[Correction]:
    orig_words = original.split()
    corr_words = corrected.split()
    s = difflib.SequenceMatcher(None, orig_words, corr_words)
    corrections: List[Correction] = []

    for tag, i1, i2, j1, j2 in s.get_opcodes():
        if tag == "equal":
            continue
        corrections.append(
            Correction(
                start=i1,
                end=i2,
                original=" ".join(orig_words[i1:i2]),
                correction=" ".join(corr_words[j1:j2]),
                message="Suggested change",
            )
        )
    return corrections

# --- API endpoint ---
@app.post("/check", response_model=CheckResponse)
async def check(req: CheckRequest):
    prompt = f"""
You are a grammar and spelling correction assistant.
Return ONLY a valid JSON like this:
{{"corrected": "<corrected sentence>"}}

Text: {req.text}
"""

    try:
        # Add timeout to prevent very slow requests
        response = await asyncio.wait_for(
            model.generate_content_async(prompt),
            timeout=10
        )

        raw = getattr(response, "text", None)
        if not raw and response.candidates:
            raw = response.candidates[0].content.parts[0].text
    except asyncio.TimeoutError:
        print("Gemini request timed out.")
        return CheckResponse(corrections=[])
    except Exception as e:
        print("Gemini error:", e)
        return CheckResponse(corrections=[])

    if not raw:
        return CheckResponse(corrections=[])

    raw = raw.strip()
    print("RAW:", repr(raw))

    # --- Strip code fences if Gemini returns JSON ---
    if raw.startswith("```"):
        raw = raw.strip("`")
        if raw.lower().startswith("json"):
            raw = raw[4:].strip()

    # --- Parse JSON safely ---
    try:
        data = json.loads(raw)
        corrected = data.get("corrected", "").strip()
    except Exception:
        corrected = raw.strip()

    original = req.text.strip()
    print("ORIGINAL:", repr(original))
    print("CORRECTED:", repr(corrected))

    if not corrected or corrected == original:
        return CheckResponse(corrections=[])

    corrections = word_diff(original, corrected)
    return CheckResponse(corrections=corrections)

# --- Run server ---
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=5000)
