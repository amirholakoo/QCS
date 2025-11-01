#!/bin/bash

echo "Stopping Flask (port 5000)..."
fuser -k 5000/tcp

echo "Stopping Django (port 8000)..."
fuser -k 8001/tcp

echo "Stopping thermal_worker..."
pkill -f thermal_worker.py

echo "All services stopped."

