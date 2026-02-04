# Deployment Guide - Flutter Interview Platform

## Overview
This guide provides step-by-step instructions for deploying the Flutter Interview Platform to a live server.

---

## Prerequisites

### Required Software
- PHP 7.4+ with MySQLi extension
- MySQL 5.7+ or MariaDB 10.3+
- A web hosting account with FTP/SFTP access
- Git (optional, for version control)
- Composer (for dependency management)

### Required Knowledge
- Basic Linux/SSH commands
- FTP/SFTP usage
- Basic database management
- Web server configuration

---

## Step 1: Prepare Your Development Environment

### 1.1 Create Environment File

Create a `.env` file in the project root directory:

```bash
# Linux/Mac
touch .env

# Windows (PowerShell)
New-Item -ItemType File -Path .env
```

### 1.2 Configure Environment Variables

Edit `.env` and add the following configuration:

```env
# Environment Settings
APP_ENV=live
APP_DEBUG=false
APP_URL=https://yourdomain.com

# Database Configuration
DB_HOST=your_mysql_host
DB_PORT=3306
DB_DATABASE=interview_platform
DB_USER=your_db_username
DB_PASSWORD=your_db_password
DB_CHARSET=utf8mb4

# Server Configuration
SERVER_NAME=yourdomain.com
SERVER_ADMIN=admin@yourdomain.com

# Security
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_secure_password_here
SECRET_KEY=your_random_secret_key_here
```

### 1.3 Generate Security Keys

For the `SECRET_KEY`, use a secure random string:

```bash
# Linux/Mac
openssl rand -hex 32

# Or use PHP
php -r 'echo bin2hex(random_bytes(32));'
```

---

## Step 2: Update PHP Configuration

### 2.1 Create a config loader (if not using autoloader)

Update `php/config.php` to use environment variables:

```php
<?php
// php/config.php

// Load environment variables from .env file
function loadEnv() {
    $envFile = dirname(dirname(__FILE__)) . '/.env';
    if (file_exists($envFile)) {
        $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        foreach ($lines as $line) {
            if (strpos($line, '#') === 0) continue;
            if (strpos($line, '=') === false) continue;
            list($key, $value) = explode('=', $line, 2);
            $key = trim($key);
            $value = trim($value);
            putenv("$key=$value");
        }
    }
}

loadEnv();

// Database Configuration from environment
$db_host = getenv('DB_HOST') ?: 'localhost';
$db_user = getenv('DB_USER') ?: 'root';
$db_password = getenv('DB_PASSWORD') ?: '';
$db_name = getenv('DB_DATABASE') ?: 'interview_platform';
$app_env = getenv('APP_ENV') ?: 'development';

// MySQL connection
function getDBConnection() {
    global $db_host, $db_user, $db_password, $db_name;
    
    $conn = new mysqli($db_host, $db_user, $db_password, $db_name);
    
    if ($conn->connect_error) {
        // Log error securely
        error_log('Database Connection Failed: ' . $conn->connect_error);
        
        // Return user-friendly error in production
        if (getenv('APP_ENV') === 'live') {
            http_response_code(500);
            die(json_encode(['success' => false, 'message' => 'Server error']));
        } else {
            die('Connection failed: ' . $conn->connect_error);
        }
    }
    
    $conn->set_charset('utf8mb4');
    return $conn;
}

// Admin credentials
define('ADMIN_USERNAME', getenv('ADMIN_USERNAME') ?: 'admin');
define('ADMIN_PASSWORD_HASH', password_hash(getenv('ADMIN_PASSWORD') ?: 'password', PASSWORD_BCRYPT));
define('APP_ENV', $app_env);

?>
```

---

## Step 3: Prepare Database

### 3.1 Create Database and User

Connect to your MySQL server:

```bash
mysql -h your_mysql_host -u root -p
```

Execute in MySQL:

```sql
-- Create database
CREATE DATABASE interview_platform CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create user with strong password
CREATE USER 'interview_user'@'localhost' IDENTIFIED BY 'strong_password_here';

-- Grant privileges
GRANT ALL PRIVILEGES ON interview_platform.* TO 'interview_user'@'localhost';

-- Apply changes
FLUSH PRIVILEGES;
```

### 3.2 Create Tables

Run the SQL scripts to create necessary tables. The application will auto-create them on first run, but you can pre-create them:

```sql
-- Use the database
USE interview_platform;

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
    id INT(1) PRIMARY KEY DEFAULT 1,
    interview_time_minutes INT(3) NOT NULL DEFAULT 30,
    exam_status BOOLEAN NOT NULL DEFAULT TRUE,
    welcome_title VARCHAR(255),
    welcome_description TEXT,
    welcome_instructions TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Questions table
CREATE TABLE IF NOT EXISTS questions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    question TEXT NOT NULL,
    options JSON NOT NULL,
    correct_answer INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Students table
CREATE TABLE IF NOT EXISTS students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Results table
CREATE TABLE IF NOT EXISTS results (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    score INT NOT NULL,
    total_questions INT NOT NULL,
    percentage DECIMAL(5,2) NOT NULL,
    answers JSON,
    completion_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    KEY (completion_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Admin sessions table
CREATE TABLE IF NOT EXISTS admin_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id VARCHAR(255) UNIQUE,
    username VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

## Step 4: Zip and Upload

### 4.1 Prepare Project for Deployment

```bash
# Remove development files
rm -rf .git .gitignore node_modules

# Keep only necessary files
# Keep: index.html, admin.html, css/, js/, php/, vendor/
# Keep: composer.json (if using Composer)
# Remove: .env (will create new one on server), README.md, etc.
```

### 4.2 Create Deployment Archive

```bash
# Linux/Mac - Create zip
zip -r interview-platform.zip . -x ".git/*" "node_modules/*" ".env"

# Windows - Use built-in compression or 7-Zip
# Right-click folder > Send to > Compressed (zipped) folder
```

### 4.3 Upload to Server

Using FTP/SFTP:

```bash
# Connect to server
sftp your_username@your_domain.com

# Navigate to web directory
cd public_html
# or
cd www
# or
cd html

# Upload zip file
put interview-platform.zip

# Exit SFTP
quit
```

### 4.4 Extract on Server

Connect via SSH:

```bash
ssh your_username@your_domain.com

# Navigate to web directory
cd public_html

# Extract archive
unzip interview-platform.zip

# Remove zip file
rm interview-platform.zip

# Set proper permissions
chmod -R 755 .
chmod -R 777 php/
```

---

## Step 5: Configure on Live Server

### 5.1 Create .env File

SSH into server:

```bash
cd /path/to/your/interview-platform

# Create .env file
nano .env
```

Paste your production configuration:

```env
APP_ENV=live
APP_DEBUG=false
APP_URL=https://yourdomain.com

DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=interview_platform
DB_USER=interview_user
DB_PASSWORD=your_strong_password

ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_secure_admin_password
SECRET_KEY=your_random_secret_key
```

Save (Ctrl+X, then Y, then Enter)

### 5.2 Set File Permissions

```bash
# Set ownership
chown -R www-data:www-data /path/to/interview-platform

# Set permissions
chmod 755 /path/to/interview-platform
chmod 755 /path/to/interview-platform/php
chmod 644 /path/to/interview-platform/php/*.php
chmod 600 /path/to/interview-platform/.env

# Make sessions directory writable
mkdir -p /path/to/interview-platform/sessions
chmod 777 /path/to/interview-platform/sessions
```

### 5.3 Update PHP Configuration

Edit `php/config.php` with production settings:

```php
// Define session path
$session_path = dirname(__FILE__) . '/../sessions';
if (!is_dir($session_path)) {
    mkdir($session_path, 0777, true);
}
session_save_path($session_path);

// Start session with secure settings
session_set_cookie_params([
    'lifetime' => 3600,
    'path' => '/',
    'domain' => 'yourdomain.com',
    'secure' => true,  // Only send over HTTPS
    'httponly' => true, // Prevent JavaScript access
    'samesite' => 'Strict'
]);
session_start();
```

---

## Step 6: SSL/HTTPS Configuration

### 6.1 Obtain SSL Certificate

For free SSL, use Let's Encrypt:

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-apache

# Obtain certificate
sudo certbot certonly --webroot -w /path/to/interview-platform -d yourdomain.com

# Auto-renew
sudo certbot renew --dry-run
```

### 6.2 Force HTTPS in .htaccess

Create `.htaccess` in project root:

```apache
<IfModule mod_rewrite.c>
    RewriteEngine On
    
    # Force HTTPS
    RewriteCond %{HTTPS} off
    RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
    
    # Remove www if present
    RewriteCond %{HTTP_HOST} ^www\.
    RewriteRule ^(.*)$ https://%{HTTP_HOST:4}%{REQUEST_URI} [L,R=301]
    
    # Prevent access to sensitive files
    RewriteRule ^\.env$ - [F]
    RewriteRule ^\.git/ - [F]
    RewriteRule ^composer\.json$ - [F]
</IfModule>

# Block access to sensitive directories
<FilesMatch "^\.">
    Deny from all
</FilesMatch>
```

---

## Step 7: Security Hardening

### 7.1 Update php.ini

SSH into server and edit php.ini:

```bash
sudo nano /etc/php/7.4/apache2/php.ini
```

Add these security settings:

```ini
# Disable dangerous functions
disable_functions = exec,passthru,shell_exec,system,proc_open,popen,curl_exec,curl_multi_exec,parse_ini_file,show_source

# Hide PHP version
expose_php = Off

# Increase security
display_errors = Off
log_errors = On
error_log = /var/log/php-errors.log

# Session settings
session.use_only_cookies = 1
session.cookie_httponly = 1
session.cookie_secure = 1
session.cookie_samesite = Strict
```

### 7.2 Protect .env File

Add to `.htaccess`:

```apache
<Files ".env">
    Order allow,deny
    Deny from all
</Files>
```

---

## Step 8: Test Deployment

### 8.1 Basic Functionality Tests

1. **Visit Homepage**
   ```
   https://yourdomain.com/index.html
   ```
   - Verify welcome screen loads
   - Check that timer displays correctly

2. **Test Admin Login**
   ```
   https://yourdomain.com/admin.html
   ```
   - Login with credentials from .env
   - Add a test question
   - Verify it appears in database

3. **Take Test Quiz**
   - Register as student
   - Complete interview
   - Verify results are saved

### 8.2 Database Connectivity

Create a test file `php/test-db.php`:

```php
<?php
require 'config.php';

$conn = getDBConnection();
$result = $conn->query("SELECT 1");
if ($result) {
    echo json_encode(['success' => true, 'message' => 'Database connected']);
} else {
    echo json_encode(['success' => false, 'message' => 'Database error']);
}
$conn->close();
?>
```

Visit: `https://yourdomain.com/php/test-db.php`

### 8.3 SSL/HTTPS Test

Use SSL Labs:
1. Go to https://www.ssllabs.com/ssltest/
2. Enter your domain
3. Verify SSL certificate is valid

---

## Step 9: Backup Strategy

### 9.1 Regular Database Backups

Create backup script `backup.sh`:

```bash
#!/bin/bash

# Configuration
DB_USER="interview_user"
DB_PASSWORD="your_password"
DB_NAME="interview_platform"
BACKUP_DIR="/home/username/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
mysqldump -u $DB_USER -p$DB_PASSWORD $DB_NAME > $BACKUP_DIR/db_$DATE.sql

# Compress
gzip $BACKUP_DIR/db_$DATE.sql

# Keep only last 30 days
find $BACKUP_DIR -type f -mtime +30 -delete

echo "Backup completed: $BACKUP_DIR/db_$DATE.sql.gz"
```

### 9.2 Schedule Automated Backups

Add to crontab:

```bash
crontab -e

# Add this line (daily at 2 AM):
0 2 * * * /path/to/backup.sh >> /var/log/backup.log 2>&1
```

---

## Step 10: Monitoring & Logs

### 10.1 Enable Error Logging

In `php/config.php`:

```php
if (getenv('APP_ENV') === 'live') {
    ini_set('log_errors', 1);
    ini_set('error_log', '/var/log/php-interview-platform-errors.log');
}
```

### 10.2 Monitor Logs

```bash
# View recent errors
tail -f /var/log/php-interview-platform-errors.log

# Search for specific errors
grep "ERROR" /var/log/php-interview-platform-errors.log
```

---

## Troubleshooting

### Issue: Database Connection Failed

**Solution:**
1. Verify credentials in `.env`
2. Check MySQL is running: `sudo systemctl status mysql`
3. Test connection: `mysql -u interview_user -p database_name`
4. Check firewall: `sudo ufw status`

### Issue: Permission Denied

**Solution:**
```bash
sudo chown -R www-data:www-data /path/to/interview-platform
sudo chmod -R 755 /path/to/interview-platform
```

### Issue: HTTPS Mixed Content Warning

**Solution:**
- Update all URLs in JavaScript to use `https://`
- Ensure all external resources use HTTPS

### Issue: Session Not Persisting

**Solution:**
```bash
# Check session directory
ls -la /path/to/interview-platform/sessions/

# Fix permissions
chmod 777 /path/to/interview-platform/sessions/

# Check PHP session settings
php -i | grep session
```

---

## Production Checklist

- [ ] `.env` file created with production values
- [ ] Database created and user configured
- [ ] All tables created successfully
- [ ] SSL certificate installed and HTTPS enabled
- [ ] File permissions set correctly (755 for dirs, 644 for files)
- [ ] `.env` file permissions set to 600
- [ ] `php.ini` security settings applied
- [ ] `.htaccess` protecting sensitive files
- [ ] Backup strategy implemented
- [ ] Error logging configured
- [ ] Home page loads correctly
- [ ] Admin login works
- [ ] Quiz functionality works
- [ ] Results saved to database
- [ ] Email notifications working (if enabled)
- [ ] Database backup completed
- [ ] Monitoring tools configured

---

## Rollback Procedure

If something goes wrong:

```bash
# Stop the application
# (Move to maintenance mode)

# Restore from backup
mysql -u interview_user -p interview_platform < backup_file.sql

# Or revert code changes
git revert HEAD~1
git push

# Clear cache
rm -rf cache/*

# Restart services
sudo systemctl restart apache2
sudo systemctl restart mysql
```

---

## Support

For issues during deployment:
1. Check error logs: `/var/log/php-interview-platform-errors.log`
2. Check browser console (F12)
3. Review this guide's troubleshooting section
4. Contact your hosting provider's support

---

## Additional Resources

- [PHP Documentation](https://www.php.net/manual/)
- [MySQL Documentation](https://dev.mysql.com/doc/)
- [Let's Encrypt](https://letsencrypt.org/)
- [SSL Labs Best Practices](https://github.com/ssllabs/research/wiki/SSL-and-TLS-Deployment-Best-Practices)
- [OWASP Security Guidelines](https://owasp.org/)

---

**Last Updated**: February 5, 2026
**Version**: 1.0
