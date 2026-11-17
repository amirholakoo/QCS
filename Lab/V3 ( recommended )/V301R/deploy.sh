#!/bin/bash

echo "🚀 Deploying Lab Application..."

cd /home/admin/Lab

# Pull latest code (if using git)
# git pull origin main

# Activate virtual environment
source venv/bin/activate

# Install/update Python dependencies
pip install -r requirements.txt

# Install/update Node dependencies
npm install

# Build frontend
echo "📦 Building frontend..."
npm run build

# Collect static files
echo "📁 Collecting static files..."
python manage.py collectstatic --noinput --settings=paper_management.settings_prod

# Run migrations
echo "🗄️ Running database migrations..."
python manage.py migrate --settings=paper_management.settings_prod

# Restart services
echo "🔄 Restarting services..."
sudo systemctl restart Lab.service
sudo systemctl reload nginx

# Check status
echo "✅ Checking service status..."
sudo systemctl status Lab.service --no-pager

echo "✨ Deployment complete!"
