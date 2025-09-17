# Lab Project

Paper and material management system with Django backend and React frontend for quality control operations.

## Setup & Run

### Backend (Django)
```bash
cd Lab/v1
```

```bash
python -m venv venv
```

```bash
venv\Scripts\activate
```

```bash
pip install -r requirements.txt
```

```bash
python manage.py migrate
```

```bash
python manage.py runserver
```

### Frontend (React + Vite)
```bash
npm install
```

```bash
npm run dev
```

## Project Structure

```
Lab/v1/
├── account/          # User account management
├── logs/             # Logging system
├── material/         # Material management
├── paper/            # Paper management
├── paper_management/ # Main Django project
├── pulp/             # Pulp management
├── report/           # Report generation
├── src/              # React frontend source
├── fonts/            # Font assets
├── public/           # Static assets
├── manage.py         # Django management
├── requirements.txt  # Python dependencies
├── package.json      # Node.js dependencies
└── db.sqlite3        # SQLite database
```
