#!/bin/bash

# Flask
cd /home/admin/mlx90640-library
source env/bin/activate
echo "Starting Flask server..."
fuser -k 5000/tcp
fuser -k 5000/tcp
python3 thermal_api.py &

sleep 2 # Flask

# Django
cd /home/admin/mlx90640-library
source env/bin/activate
cd Django_Thermal_PI/
echo "Starting Django server..."
fuser -k 8001/tcp
fuser -k 8001/tcp
python manage.py runserver 0.0.0.0:8001 &

sleep 2  #Django

# thermal_worker.py
echo "Starting Thermal Worker..."
cd /home/admin/mlx90640-library
source env/bin/activate
pkill -f thermal_worker.py
cd Django_Thermal_PI/thermal
python3 thermal_worker.py &

echo " All services are running."

