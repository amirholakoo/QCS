# MI48 Thermal Sensor Project

Thermal imaging system using MLX90640 sensor with Flask API and Django web interface for temperature monitoring and data visualization.

## Setup & Run

### Install Python Dependencies
```bash
python -m venv env
```

**Linux/Mac:**
```bash
source env/bin/activate
```

**Windows:**
```bash
env\Scripts\activate
```

```bash
pip install -r Django_Thermal_PI/requirements.txt
```

### Install System Dependencies (Linux/Raspberry Pi)
```bash
sudo apt update
```

```bash
sudo apt install build-essential python3-dev i2c-tools
```

```bash
sudo raspi-config
```

### Run Flask API
```bash
python thermal_api.py
```

### Run Django Server (New Terminal)
```bash
cd Django_Thermal_PI
```

```bash
python manage.py migrate
```

```bash
python manage.py runserver 0.0.0.0:8001
```

### Auto Start (Linux)
```bash
chmod +x start.sh
```

```bash
./start.sh
```

## Project Structure

```
mi48/
├── Django_Thermal_PI/    # Django web interface
│   ├── manage.py         # Django management
│   ├── requirements.txt  # Python dependencies
│   └── db.sqlite3        # SQLite database
├── examples/             # Example code
├── functions/            # MLX90640 C++ functions
├── headers/              # MLX90640 header files
├── python/               # Python utilities
├── thermal_api.py        # Flask API server
├── thermal_sensor.py     # Sensor interface
├── start.sh              # Auto start script
└── stop.sh               # Stop script
```
