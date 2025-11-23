# 🛰️ Aerospace Hackathon 2025: Space Debris Monitoring System

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python](https://img.shields.io/badge/Python-3.8+-3776AB?logo=python)](https://www.python.org/)
[![React](https://img.shields.io/badge/React-18.2.0-61DAFB?logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0.0-3178C6?logo=typescript)](https://www.typescriptlang.org/)

A comprehensive space debris monitoring and conjunction analysis system with a modern web interface and data processing tools.

## 🌟 Features

### Web Interface (ui-v2)
- 🌍 Interactive 3D visualization of satellites and space debris using CesiumJS
- 🚨 Real-time conjunction risk assessment with color-coded alerts
- 📊 Detailed satellite information and orbital parameters
- ⏱️ Time-based simulation with adjustable speed controls
- 🎯 Filterable view of conjunction events by risk level

### Python Tools
- 📊 `csv_2_json.py`: Converts raw CSV data into structured JSON format
- 🛰️ `csv_2_czml.py`: Generates CZML for 3D visualization in Cesium
- 🔄 Data processing pipeline for satellite conjunction analysis

## 🛠️ Tech Stack

### Frontend (ui-v2)
- **Framework**: React 18 with TypeScript
- **3D Visualization**: CesiumJS
- **Build Tool**: Vite
- **UI Components**: Shadcn UI with Tailwind CSS
- **State Management**: React Hooks

### Backend (Python)
- **Core**: Python 3.8+
- **Data Processing**: Pandas
- **Data Formats**: JSON, CZML, CSV

## 🚀 Getting Started

### Prerequisites

- Node.js 16+ and npm/yarn (for UI)
- Python 3.8+ and pip (for data processing)
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/aerospace-hackathon-2025.git
   cd aerospace-hackathon-2025
   ```

2. **Set up the Python environment**
   ```bash
   # Install required Python packages
   pip install pandas
   ```

3. **Set up the UI**
   ```bash
   cd ui-v2
   npm install
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:5173](http://localhost:5173) in your browser.

## 📂 Project Structure

```
.
├── data/                    # Data files (CSV, JSON, CZML)
├── scripts/
│   ├── csv_2_czml.py       # Converts CSV to CZML for 3D visualization
│   └── csv_2_json.py       # Processes CSV data into structured JSON
├── ui-v2/                  # Modern web interface
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── pages/          # Page components
│   │   └── utils/          # Utility functions
│   └── public/             # Static assets
└── README.md               # This file
```

## 🔧 Data Processing

### Convert CSV to JSON
```bash
python scripts/csv_2_json.py
```
Processes raw CSV data into structured JSON format for the web interface.

### Generate CZML for 3D Visualization
```bash
python scripts/csv_2_czml.py input.csv output.czml
```
Converts satellite position data into CZML format for Cesium visualization.

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- CelesTrak for satellite TLE data
- NASA for space debris tracking information
- The open-source community for amazing libraries and tools
