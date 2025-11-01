# Version 2.0 Changes

This document outlines the new features and changes introduced in Version 2.0 of the Lab Project.

## 🆕 New Features

### Quality Control (QC) Module
- **Complete QC Workflow**: New comprehensive quality control system
- **Customer Management**: Customer database and management system
- **Loading Specifications**: Detailed loading specs management
- **QC Records**: Create, edit, and track quality control records
- **Print System**: QC record printing functionality with customizable fields
- **Multi-Paper Selection**: Ability to select multiple paper rolls for QC records

### Enhanced User Authentication
- **Custom User Model**: Extended user authentication with first/last name
- **Automatic Username Generation**: Usernames auto-generated from names
- **Simplified Login**: Password-optional authentication system

### New Components & UI
- **QC Workflow Interface**: Step-by-step QC record creation
- **QC List & View**: Browse and view existing QC records
- **QC Print Page**: Dedicated printing interface
- **Enhanced Dashboard**: Updated dashboard with QC integration

## 🔧 Technical Improvements

### Backend Changes
- **New QC App**: Complete Django app for quality control (`qc/`)
- **Enhanced Models**: 
  - `Customer` model for customer management
  - `Loading` model for loading specifications
  - `QCRecord` model linking papers, customers, and loading specs
- **Custom User Model**: Extended `CustomUser` with automatic username generation
- **Enhanced Paper Model**: Additional fields for production line, downtime tracking
- **Pulp Model Updates**: New production line field and improved data structure

### Frontend Enhancements
- **New QC Components**: 6 new React components for QC functionality
- **Enhanced Types**: Updated TypeScript interfaces for new features
- **Improved API Integration**: Extended API hooks for QC operations
- **Production Line Colors**: New utility for production line visualization

### Database Schema Updates
- **New QC Tables**: Customer, Loading, and QCRecord tables
- **Enhanced Paper Schema**: Additional fields for better tracking
- **Improved Relationships**: Many-to-many relationships between QC records and papers

## 📁 New Directory Structure

```
V2/V201R/
├── qc/                    # NEW: Quality Control module
│   ├── models.py         # Customer, Loading, QCRecord models
│   ├── views.py          # QC API endpoints
│   ├── serializers.py    # QC data serialization
│   └── migrations/       # QC database migrations
├── src/components/qc/     # NEW: QC React components
│   ├── QCWorkflow.tsx    # Main QC creation workflow
│   ├── QCList.tsx        # QC records listing
│   ├── QCView.tsx        # QC record viewing
│   └── QCPrintPage.tsx   # QC printing interface
└── paper_management/
    ├── pagination.py     # NEW: API pagination utilities
    └── settings_prod.py  # NEW: Production settings
```

## 🚀 Setup Changes

### Additional Dependencies
No new Python dependencies required - all new features use existing Django/DRF stack.

### Database Migration
Run migrations to create new QC tables:
```bash
python manage.py migrate
```

### New API Endpoints
- `/api/qc/customers/` - Customer management
- `/api/qc/loading/` - Loading specifications
- `/api/qc/qc-records/` - QC records CRUD operations

## 🎯 Usage

### Creating QC Records
1. Navigate to QC section in the application
2. Click "Create New QC Record"
3. Follow the step-by-step workflow:
   - Select customer or create new one
   - Define loading specifications
   - Choose paper rolls for quality control
   - Select custom fields for printing
   - Set print count and complete

### Managing Customers & Loading
- Customers and loading specifications are managed within the QC workflow
- Both can be created on-the-fly during QC record creation
- All data is stored and reusable for future QC records

## 🔄 Migration from V1

V2 is fully backward compatible with V1 data. All existing paper, pulp, material, and log records will continue to work without modification.

## 📋 Version Info

- **Version**: 2.0 (V201R)
- **Release Date**: November 2024
- **Compatibility**: Fully backward compatible with V1
- **Major Focus**: Quality Control System Implementation
