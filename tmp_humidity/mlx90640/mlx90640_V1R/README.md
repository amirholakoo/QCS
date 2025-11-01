# MLX90640 Thermal Sensor Project

Advanced thermal imaging system with MLX90640 sensor, compiled C++ libraries, Flask API, and Django web interface for professional temperature analysis.

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
sudo apt install build-essential python3-dev i2c-tools gcc g++
```

```bash
sudo raspi-config
```

### Build MLX90640 Library
```bash
make clean
```

```bash
make
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

## Project Structure

```
mlx90640/
├── Django_Thermal_PI/    # Django web interface
│   ├── manage.py         # Django management
│   ├── requirements.txt  # Python dependencies
│   └── db.sqlite3        # SQLite database
├── functions/            # MLX90640 C++ functions
├── headers/              # MLX90640 header files
├── python/               # Python utilities
├── thermal_api.py        # Flask API server
├── thermal_sensor.py     # Sensor interface
├── Makefile              # Build configuration
├── libMLX90640_API.a     # Static library
├── libMLX90640_API.so    # Shared library
└── LICENSE               # License file
```
