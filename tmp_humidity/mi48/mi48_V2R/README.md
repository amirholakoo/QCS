# MI48 V2R Changes

This document outlines the new features and changes introduced in Version 2R of the MI48 Thermal Sensor Project.

## 🆕 New Features

### Enhanced Probe Configuration System
- **ProbeConfiguration Model**: New Django model for storing probe configurations
- **Probe Data Management**: JSON-based storage for multiple probe positions and metadata
- **Checked Probes System**: Ability to select and track specific probes for analysis
- **Average Calculations**: Automatic calculation of averages for selected probes

### Advanced Data Models
- **ProbeData Model**: Enhanced data storage with probe count and configuration tracking
- **Jalali Date Support**: Full Persian calendar integration with timezone handling
- **JSON Field Support**: Modern Django JSONField for flexible data storage

### Improved User Interface
- **Simplified Static Assets**: Streamlined font and JavaScript dependencies
- **Enhanced Logging**: Improved thermal image logging with timestamps
- **Better Data Visualization**: Enhanced charts and graphs for probe data

## 🔧 Technical Improvements

### Backend Architecture Changes
- **Restructured Django Project**: Moved from complex Flask+Django hybrid to pure Django
- **Simplified Configuration**: Removed external C++ dependencies and examples
- **Enhanced Models**: 
  - `ProbeConfiguration` with automatic timestamp management
  - `ProbeData` with JSON storage for flexible probe data
- **Timezone Support**: Full Iran timezone (Asia/Tehran) integration
- **Persian Calendar**: Complete Jalali date conversion system

### Database Schema Updates
- **New Tables**: ProbeConfiguration and ProbeData models
- **JSON Storage**: Flexible probe data storage using Django's JSONField
- **Automatic Timestamps**: Built-in created_at and updated_at fields
- **Enhanced Relationships**: Better data organization and retrieval

### Removed Components
- **C++ Examples**: Removed complex example code and compilation requirements
- **External Libraries**: Eliminated pysenxor and other external dependencies
- **Shell Scripts**: Removed start.sh and stop.sh automation scripts
- **Flask API**: Consolidated into pure Django architecture

## 📁 New Directory Structure

```
mi48_V2R/
├── config/              # Django project configuration
│   ├── settings.py     # Main settings
│   ├── urls.py         # URL routing
│   └── wsgi.py         # WSGI configuration
├── thermal/            # Main thermal application
│   ├── models.py       # ProbeConfiguration & ProbeData models
│   ├── views.py        # API endpoints and views
│   ├── templates/      # HTML templates
│   └── management/     # Django management commands
├── sensor/             # Sensor interface application
├── static/             # Static assets (simplified)
│   ├── base/          # Core CSS/JS files
│   ├── logs/          # Thermal image logs
│   └── alarm.wav      # Alert sound
└── requirements.txt    # Python dependencies
```

## 🚀 Setup Changes

### Simplified Installation
No more C++ compilation or external library building required:

```bash
# Install Python dependencies only
pip install -r requirements.txt

# Run Django migrations
python manage.py migrate

# Start the server
python manage.py runserver 0.0.0.0:8001
```

### Removed Dependencies
- No more `make` commands
- No more C++ compilation
- No more Flask API server
- No more shell script automation

## 🎯 Usage

### Probe Configuration
- Configure multiple probes with positions and metadata
- Select specific probes for monitoring
- Calculate averages for selected probe groups
- Store and retrieve probe configurations

### Data Management
- Automatic timestamp management with Jalali calendar
- JSON-based flexible data storage
- Enhanced probe data tracking
- Improved data visualization

## 🔄 Migration from V1R

V2R represents a significant architectural change:
- **Simplified Setup**: No more complex C++ dependencies
- **Pure Django**: Consolidated from Flask+Django to Django-only
- **Enhanced Models**: New database schema with better data organization
- **Improved UI**: Streamlined interface with better user experience

## 📋 Version Info

- **Version**: 2R
- **Architecture**: Pure Django (removed Flask hybrid)
- **Focus**: Simplified deployment and enhanced probe management
- **Compatibility**: Database migration required from V1R
