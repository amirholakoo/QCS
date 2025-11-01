# MI48 V3R Changes

This document outlines the new features and changes introduced in Version 3R of the MI48 Thermal Sensor Project.

## 🆕 New Features

### Advanced Configuration Management
- **Humidity Threshold Control**: Configurable humidity threshold monitoring (default: 7%)
- **Roll Number Management**: Automatic roll number tracking and management
- **Roll Duration Control**: Configurable roll duration settings (default: 40 minutes)
- **Auto Roll Change**: Optional automatic roll number increment system
- **Edge Threshold Detection**: Configurable edge detection threshold (default: 5)

### Enhanced Probe System
- **Extended ProbeConfiguration**: Additional fields for production control
- **Roll Tracking**: Integration of roll numbers with probe data
- **Production Monitoring**: Enhanced production line monitoring capabilities
- **Automated Workflows**: Smart automation for production processes

### Improved User Interface
- **Enhanced Font Support**: Complete Persian and English font family integration
- **Better Typography**: Full range of font weights (light, regular, bold)
- **Improved Styling**: Enhanced visual design with comprehensive font assets
- **Better Accessibility**: Improved readability and user experience

## 🔧 Technical Improvements

### Enhanced Data Models
- **Extended ProbeConfiguration**:
  - `humidity_threshold`: Configurable humidity monitoring
  - `roll_number`: Current roll number tracking (default: 3830)
  - `roll_Duration`: Roll duration in seconds (default: 2400s)
  - `roll_remainder`: Remaining time for current roll
  - `is_user_allowed_auto_change_roll_number`: Auto-increment permission
  - `edge_threshold`: Edge detection sensitivity

- **Enhanced ProbeData**:
  - `roll_number`: Roll number association for each data point
  - Better data correlation and tracking

### Advanced Static Assets
- **Complete Font Family**: Full IranYekan and Roboto font collections
- **Multiple Formats**: EOT, TTF, WOFF, WOFF2, and SVG font formats
- **Cross-Platform Support**: Enhanced compatibility across all browsers and devices
- **Better Performance**: Optimized font loading and rendering

### Production Integration
- **Roll Management**: Comprehensive roll tracking and management
- **Threshold Monitoring**: Advanced threshold-based alerting
- **Automated Processes**: Smart automation for production workflows
- **Enhanced Logging**: Better production data logging and analysis

## 📁 Enhanced Directory Structure

```
mi48_V3R/
├── config/              # Django project configuration
├── thermal/            # Main thermal application
│   ├── models.py       # Enhanced models with production features
│   ├── views.py        # Advanced API endpoints
│   ├── templates/      # Updated HTML templates
│   └── management/     # Enhanced management commands
├── sensor/             # Sensor interface application
├── static/             # Enhanced static assets
│   ├── base/
│   │   └── fonts/      # Complete font family
│   │       ├── eot/    # EOT font files
│   │       ├── ttf/    # TrueType fonts
│   │       ├── woff/   # WOFF fonts
│   │       ├── woff2/  # WOFF2 fonts
│   │       └── svg/    # SVG fonts
│   ├── logs/          # Thermal image logs
│   └── alarm.wav      # Alert sound
└── requirements.txt    # Python dependencies
```

## 🚀 New Configuration Options

### Production Settings
```python
# Default configuration values
HUMIDITY_THRESHOLD = 7.0          # Humidity monitoring threshold
ROLL_NUMBER = 3830               # Starting roll number
ROLL_DURATION = 2400             # Roll duration (40 minutes)
EDGE_THRESHOLD = 5.0             # Edge detection sensitivity
AUTO_ROLL_CHANGE = False         # Automatic roll increment
```

### Enhanced Features
- **Smart Thresholds**: Configurable monitoring thresholds
- **Production Tracking**: Comprehensive roll and production monitoring
- **Automated Alerts**: Threshold-based alerting system
- **Better Analytics**: Enhanced data analysis capabilities

## 🎯 Usage

### Production Monitoring
1. **Configure Thresholds**: Set humidity and edge detection thresholds
2. **Roll Management**: Track and manage production rolls
3. **Automated Monitoring**: Enable automatic threshold monitoring
4. **Data Analysis**: Enhanced production data analysis

### Advanced Configuration
- **Humidity Monitoring**: Set custom humidity thresholds for alerts
- **Roll Tracking**: Automatic or manual roll number management
- **Duration Control**: Configure roll duration and timing
- **Edge Detection**: Fine-tune edge detection sensitivity

## 🔄 Migration from V2R

V3R adds production-focused enhancements:
- **Database Migration**: New fields added to existing models
- **Enhanced Configuration**: Additional configuration options
- **Improved Assets**: Complete font family integration
- **Production Features**: Advanced production monitoring capabilities

### Migration Steps
```bash
# Run migrations for new model fields
python manage.py migrate

# Update static files
python manage.py collectstatic

# Configure new production settings as needed
```

## 📋 Version Info

- **Version**: 3R
- **Focus**: Production monitoring and enhanced user experience
- **New Features**: Roll management, threshold monitoring, complete font support
- **Compatibility**: Backward compatible with V2R (requires migration)
