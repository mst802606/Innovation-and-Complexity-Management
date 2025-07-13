from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import asyncio
import random
import time
import os
import sys
import threading
import webbrowser

app = FastAPI()

# Allow CORS for local frontend (dev)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Store last session data
data_store = {
    "last_session": None
}

def open_frontend():
    # Only open browser if running locally (not in Codespaces or headless)
    if os.environ.get('CODESPACES') or os.environ.get('GITHUB_CODESPACE_TOKEN'):
        return
    # Try to open the frontend/index.html file
    frontend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'frontend', 'index.html'))
    if os.path.exists(frontend_path):
        webbrowser.open_new_tab('file://' + frontend_path)

@app.get("/")
def read_root():
    return {"message": "✅ Heart Rate Monitor Backend (FastAPI) is running!"}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    timer = 0
    session_data = []
    start_time = time.time()
    try:
        while True:
            # Simulate natural fluctuation in heart rate
            base = 80 + 20 * (random.random() - 0.5) + 20 * (random.random() - 0.5)
            noise = random.uniform(-5, 5)
            value = int(base + noise)

            # Store locally
            session_data.append({"time": timer, "value": value})

            # Aggregates
            values = [d["value"] for d in session_data]
            min_val = min(values)
            max_val = max(values)
            avg_val = round(sum(values) / len(values), 2)
            trend = values[-1] - values[0] if len(values) > 1 else 0

            # FHIR Observation for this value
            fhir_observation = {
                "resourceType": "Observation",
                "status": "final",
                "category": [{
                    "coding": [{
                        "system": "http://terminology.hl7.org/CodeSystem/observation-category",
                        "code": "vital-signs",
                        "display": "Vital Signs"
                    }]
                }],
                "code": {
                    "coding": [{
                        "system": "http://loinc.org",
                        "code": "8867-4",
                        "display": "Heart rate"
                    }],
                    "text": "Heart rate"
                },
                "valueQuantity": {
                    "value": value,
                    "unit": "beats/minute",
                    "system": "http://unitsofmeasure.org",
                    "code": "/min"
                },
                "effectiveDateTime": time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime(time.time()))
            }

            # Send to frontend: FHIR + aggregates
            await websocket.send_json({
                "time": timer,
                "observation": fhir_observation,
                "aggregates": {
                    "min": min_val,
                    "max": max_val,
                    "avg": avg_val,
                    "trend": trend
                }
            })

            timer += 1
            await asyncio.sleep(1)
    except WebSocketDisconnect:
        # On disconnect, save session data as FHIR-compliant JSON
        end_time = time.time()
        if session_data:
            values = [d["value"] for d in session_data]
            fhir_observation = {
                "resourceType": "Observation",
                "status": "final",
                "code": {
                    "coding": [
                        {
                            "system": "http://loinc.org",
                            "code": "8867-4",
                            "display": "Heart rate"
                        }
                    ],
                    "text": "Heart rate"
                },
                "valueQuantity": {
                    "value": values[-1],
                    "unit": "beats/minute",
                    "system": "http://unitsofmeasure.org",
                    "code": "/min"
                },
                "component": [
                    {"code": {"text": "min"}, "valueQuantity": {"value": min(values)}},
                    {"code": {"text": "max"}, "valueQuantity": {"value": max(values)}},
                    {"code": {"text": "avg"}, "valueQuantity": {"value": round(sum(values)/len(values), 2)}}
                ],
                "effectivePeriod": {
                    "start": time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime(start_time)),
                    "end": time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime(end_time)),
                    "duration_seconds": int(end_time - start_time)
                },
                "extension": [
                    {
                        "url": "http://example.org/sessionData",
                        "valueString": str(session_data)
                    }
                ]
            }
            data_store["last_session"] = fhir_observation

@app.get("/api/session")
def get_last_session():
    if data_store["last_session"]:
        return JSONResponse(content=data_store["last_session"])
    return JSONResponse(content={"error": "No session data available."}, status_code=404)

if __name__ == "__main__":
    # Start the backend server (uvicorn)
    # Open the frontend in a separate thread to avoid blocking
    threading.Timer(1.5, open_frontend).start()
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)