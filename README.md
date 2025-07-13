# Heart Rate Monitor – Real-Time Healthcare Data Visualization

## Overview
This web application provides interactive data visualization for healthcare, focusing on real-time heart rate monitoring. The app is built as a two-tier architecture: a backend emitting FHIR-compliant JSON via WebSockets, and a frontend using D3.js for rich, interactive visualization.

**Note:** The app currently uses demo (simulated) heart rate data for demonstration purposes. If connected to a real sensor, it can visualize true real-time data as well.

## Features
- **Real-time heart rate monitoring** with live updates via WebSockets
- **FHIR-compliant JSON** data format for interoperability
- **D3.js-based interactive charts** (line and bar)
- **Zoom and brush** features for advanced data exploration
- **Session statistics** (min, max, avg, trend) calculated and displayed in real time
- **CSV export** for session data
- **Responsive, accessible UI** with keyboard support
- **Cloud/Codespaces ready** (see below)

## Prerequisites
- Python 3.9 or higher
- Modern web browser with WebSocket support

## How to Run Locally

### 1. Backend Setup (Python FastAPI)

#### Option A: Using Virtual Environment (Recommended)
```sh
# Navigate to the backend directory
cd backend

# Create a virtual environment
python3 -m venv .venv

# Activate the virtual environment
# On macOS/Linux:
source .venv/bin/activate
# On Windows:
# .venv\Scripts\activate

# Upgrade pip
python3 -m pip install --upgrade pip

# Install dependencies
python3 -m pip install -r requirements.txt

# Install WebSocket support (required for real-time communication)
python3 -m pip install 'uvicorn[standard]'
```

#### Option B: Global Installation
```sh
cd backend
python3 -m pip install -r requirements.txt
python3 -m pip install 'uvicorn[standard]'
```

### 2. Start the Backend Server
```sh
# Make sure you're in the backend directory and virtual environment is activated
cd backend
source .venv/bin/activate  # Skip if using global installation

# Start the server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Expected Output:**
```
INFO:     Will watch for changes in these directories: ['/path/to/backend']
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process [xxxxx] using WatchFiles
INFO:     Started server process [xxxxx]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

### 3. Frontend Setup
- Open `frontend/index.html` in your web browser
- The frontend will automatically connect to the backend WebSocket at `ws://127.0.0.1:8000/ws`
- You should see real-time heart rate data visualization with interactive charts

## Troubleshooting

### Port Already in Use
If you get "Address already in use" error:
```sh
# Kill processes using port 8000
lsof -ti:8000 | xargs kill -9

# Then restart the server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### WebSocket Connection Issues
If you see "No supported WebSocket library detected":
```sh
# Install WebSocket support
python3 -m pip install 'uvicorn[standard]'
# or
python3 -m pip install websockets
```

### Python/pip Not Found
If `pip` command is not found:
```sh
# Use python3 -m pip instead
python3 -m pip install -r requirements.txt
```

### Virtual Environment Issues
If you encounter permission or path issues:
```sh
# Remove and recreate virtual environment
rm -rf .venv
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install --upgrade pip
python3 -m pip install -r requirements.txt
python3 -m pip install 'uvicorn[standard]'
```

## How to Run in GitHub Codespaces
1. Open this repository in GitHub Codespaces
2. The devcontainer will automatically install Python and dependencies
3. In the Codespaces terminal, run:
   ```sh
   cd backend
   python3 -m venv .venv
   source .venv/bin/activate
   python3 -m pip install -r requirements.txt
   python3 -m pip install 'uvicorn[standard]'
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```
4. Use the Codespaces port forwarding feature to access port 8000
5. Open `frontend/index.html` using the Codespaces file browser and "Preview" feature

## Project Structure
```
INCO2k25/
├── backend/
│   ├── main.py              # FastAPI server with WebSocket endpoints
│   ├── requirements.txt     # Python dependencies
│   └── .venv/              # Virtual environment (created during setup)
├── frontend/
│   ├── index.html          # Main HTML file
│   ├── main.js             # D3.js visualization logic
│   └── style.css           # Styling
└── README.md               # This file
```

## Technologies Used
- **Backend:** Python, FastAPI, WebSockets, FHIR JSON
- **Frontend:** HTML, CSS, JavaScript, D3.js
- **DevOps:** GitHub Codespaces compatible

## Course Alignment
- Follows the NCO - Innovation and Complexity Management course structure
- Backend emits FHIR-compliant JSON (can be extended to Rust/Actix)
- Frontend uses D3.js for all visualization (no high-level charting libs)
- Real-time, interactive, and user-focused design

## License
MIT (or as specified by your course) 