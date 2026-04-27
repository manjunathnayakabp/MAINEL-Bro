
# 🚌 BUS_KAR_BHAI : Real-Time Bus Allocation System

A comprehensive public transit management system and live-tracking dashboard. This project simulates real-time bus telemetry, manages routes and schedules using GTFS data, and provides an admin dashboard for live fleet monitoring.

## ✨ Features
* **Real-Time Fleet Tracking:** Live GPS coordinates and telemetry (speed, occupancy) via IoT simulation.
* **GTFS Integration:** Automated ingestion of static transit data (Routes, Stops, Schedules).
* **Dynamic Bus Allocation:** System to assign vehicles to schedules and handle edge cases like breakdowns.
* **Admin Command Center:** Live map visualization with bus health, capacity, and status indicators.

## 🛠️ Tech Stack
* **Backend:** Python, FastAPI, SQLAlchemy
* **Frontend:** Vite (React/Vue), Leaflet/Google Maps for live tracking
* **Database:** PostgreSQL 

---

## 🚀 Getting Started (Local Host Setup)

Follow these steps to run the project natively on your machine without Docker.

### Prerequisites
Ensure you have the following installed on your system:
* [Python 3.8+](https://www.python.org/downloads/)
* [Node.js & npm](https://nodejs.org/) (v16 or higher recommended)
* [PostgreSQL](https://www.postgresql.org/download/)

### 1. Clone the Repository
```bash
git clone [https://github.com/yourusername/moovit-chalo-clone.git](https://github.com/yourusername/moovit-chalo-clone.git)
cd moovit-chalo-clone
````

### 2\. Database Setup

1.  Open your PostgreSQL command line (`psql`) or pgAdmin.
2.  Create a new database for the project:
    ```sql
    CREATE DATABASE moovit_chalo;
    ```
3.  Update your backend `.env` file or `database.py` with your local PostgreSQL credentials:
    ```env
    DATABASE_URL=postgresql://your_postgres_user:your_password@localhost:5432/moovit_chalo
    ```

### 3\. Backend Setup

Open a terminal and navigate to the `backend` folder.

1.  **Create and activate a virtual environment:**
      * **Windows:**
        ```bash
        python -m venv venv
        venv\Scripts\activate
        ```
      * **Mac/Linux:**
        ```bash
        python3 -m venv venv
        source venv/bin/activate
        ```
2.  **Install Python dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

### 4\. Initialize Data (GTFS & Schedules)

Before starting the servers, you need to populate the database.

1.  Place your extracted GTFS `.txt` files (`routes.txt`, `stops.txt`, etc.) into a folder named `gtfs_data` inside the backend directory.
2.  Run the ingestion scripts:
    ```bash
    python import_gtfs.py
    python populate_schedules.py
    ```
    *(Wait for the success message: `✅ Successfully populated schedules!`)*

### 5\. Start the Services

You will need **three separate terminal windows** to run the full system.

**Terminal 1: Start the Backend API**

```bash
cd backend
# Ensure your virtual environment is activated
uvicorn app.main:app --reload --port 8000
```

**Terminal 2: Start the Frontend UI**

```bash
cd frontend
npm install
npm run dev
```

**Terminal 3: Start the IoT Simulator**

```bash
cd backend
# Ensure your virtual environment is activated
python app/services/etm_simulator.py
```

-----

## 🌐 Accessing the System

Once all three processes are running, you can access the system at:

  * **Frontend Dashboard (Live Map):** [http://localhost:5173](https://www.google.com/search?q=http://localhost:5173)
  * **Backend API (Swagger Docs):** [http://localhost:8000/docs](https://www.google.com/search?q=http://localhost:8000/docs)

-----

## 🛑 Troubleshooting

  * **Database Connection Error:** Double-check your `DATABASE_URL` string. Ensure the PostgreSQL service is actively running on your machine and the username/password match your local setup.
  * **Simulator not sending data:** Verify that the backend is running on port 8000. The simulator needs the API to be alive to push coordinates.
  * **CORS Errors in Browser Console:** Ensure your FastAPI backend has CORS middleware configured to accept requests from `http://localhost:5173`.

## 📄 License

This project is licensed under the MIT License.

```
```
