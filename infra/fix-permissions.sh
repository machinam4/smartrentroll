#!/bin/bash

# Script to fix nginx permissions for SmartRentRoll web app
# Run this script with sudo: sudo bash fix-permissions.sh

# Path to the web app dist directory
DIST_DIR="/home/machina/Kimjay/smartrentroll/apps/web/dist"

# Get nginx user (varies by system)
if id "www-data" &>/dev/null; then
    NGINX_USER="www-data"
elif id "nginx" &>/dev/null; then
    NGINX_USER="nginx"
else
    echo "Error: Could not find nginx user (www-data or nginx)"
    exit 1
fi

echo "Using nginx user: $NGINX_USER"
echo "Fixing permissions for: $DIST_DIR"

# Check if directory exists
if [ ! -d "$DIST_DIR" ]; then
    echo "Error: Directory $DIST_DIR does not exist!"
    echo "Please build the web app first: cd apps/web && npm run build"
    exit 1
fi

# Set ownership - make parent directories accessible
echo "Setting ownership of parent directories..."
sudo chown -R machina:www-data /home/machina/Kimjay/smartrentroll/apps/web

# Set directory permissions (755 = rwxr-xr-x)
echo "Setting directory permissions..."
find "$DIST_DIR" -type d -exec chmod 755 {} \;

# Set file permissions (644 = rw-r--r--)
echo "Setting file permissions..."
find "$DIST_DIR" -type f -exec chmod 644 {} \;

# Make sure nginx can traverse the path
echo "Setting execute permission on parent directories..."
sudo chmod +x /home/machina
sudo chmod +x /home/machina/Kimjay
sudo chmod +x /home/machina/Kimjay/smartrentroll
sudo chmod +x /home/machina/Kimjay/smartrentroll/apps
sudo chmod +x /home/machina/Kimjay/smartrentroll/apps/web

# Alternative: Add nginx user to machina's group (if preferred)
# sudo usermod -a -G machina $NGINX_USER

echo ""
echo "Permissions fixed!"
echo ""
echo "Verifying permissions..."
ls -la "$DIST_DIR" | head -5
echo ""
echo "If you still see permission errors, you may need to:"
echo "1. Check SELinux (if enabled): sudo setsebool -P httpd_read_user_content 1"
echo "2. Or move the dist folder to /var/www/smartrent/dist and update nginx.conf"
echo "3. Restart nginx: sudo systemctl restart nginx"

