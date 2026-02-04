# Quick Start Guide - Flutter Interview Platform

## For Local Development

### 1. Initial Setup

```bash
# Clone or extract the project
cd interview-platform

# Create .env file from example
cp .env.example .env

# Edit .env with your local database details
# Database: interview_platform
# User: root
# Password: (your MySQL password or empty)
```

### 2. Start Development Server

```bash
# Using PHP built-in server
php -S localhost:8000

# Or use your local Apache/XAMPP/WAMP
# Start MySQL and Apache
# Access: http://localhost/interview-platform
```

### 3. Login to Admin

- Visit: `http://localhost:8000/admin.html`
- Username: `admin`
- Password: `password` (from .env file)

### 4. Add Questions

1. Go to "Questions" → "Add Question"
2. Enter question text
3. Add 4 options
4. Select correct answer
5. Click "Add Question"

### 5. Enable Exam

1. Go to Settings
2. Toggle "Exam Status" to ON
3. Click Save

### 6. Take Interview

1. Visit `http://localhost:8000/index.html`
2. Click "Register for Interview"
3. Fill in your details
4. Start the interview

---

## For Production Deployment

### Quick Deployment Steps

1. **Prepare Server**
   ```bash
   # Create database
   mysql -u root -p
   CREATE DATABASE interview_platform;
   CREATE USER 'interview_user'@'localhost' IDENTIFIED BY 'strong_password';
   GRANT ALL PRIVILEGES ON interview_platform.* TO 'interview_user'@'localhost';
   FLUSH PRIVILEGES;
   ```

2. **Upload Files**
   ```bash
   # Zip the project (excluding .env, .git)
   zip -r interview-platform.zip . -x ".env" ".git/*"
   
   # Upload via FTP/SFTP to public_html
   # Extract on server
   unzip interview-platform.zip
   ```

3. **Configure .env**
   ```bash
   # SSH into server
   ssh user@domain.com
   cd public_html/interview-platform
   
   # Create .env
   nano .env
   
   # Add production values:
   # APP_ENV=live
   # DB_HOST=localhost
   # DB_USER=interview_user
   # DB_PASSWORD=your_strong_password
   # DB_DATABASE=interview_platform
   # ADMIN_USERNAME=admin
   # ADMIN_PASSWORD=your_secure_password
   ```

4. **Set Permissions**
   ```bash
   chmod -R 755 .
   chmod -R 777 php/
   chmod 600 .env
   ```

5. **Install SSL**
   ```bash
   # Using Let's Encrypt
   sudo certbot certonly --webroot -w /path/to/site -d yourdomain.com
   ```

6. **Test**
   - Visit https://yourdomain.com/index.html
   - Login to admin
   - Add test question
   - Take test quiz

---

## Troubleshooting

### Database Connection Error

Check `php/config.php` and ensure:
- `DB_HOST` is correct
- `DB_USER` has correct privileges
- `DB_PASSWORD` matches
- `DB_DATABASE` exists

### Cannot Login

- Verify `ADMIN_USERNAME` and `ADMIN_PASSWORD` in `.env`
- Check if PHP sessions are enabled
- Clear browser cache/cookies

### Welcome Screen Not Loading

- Clear browser cache
- Check if `js/app.js` is loaded (F12 DevTools)
- Verify `php/settings.php` is accessible

### Quiz Not Starting

- Verify questions exist in database
- Check if exam status is enabled (Settings)
- Look at browser console for errors (F12)

### Results Not Saving

- Check database tables exist
- Verify `php/results.php` is accessible
- Check PHP error logs

---

## Useful Commands

### Check MySQL Connection
```bash
mysql -u interview_user -p interview_platform -e "SELECT 1;"
```

### View PHP Error Log
```bash
# Linux
tail -f /var/log/php-errors.log

# Or check directory
grep -r "ERROR" /path/to/interview-platform/
```

### Reset Admin Password
```php
<?php
require 'php/config.php';
$new_password = password_hash('new_password', PASSWORD_BCRYPT);
echo "Update ADMIN_PASSWORD in .env to: " . $new_password;
?>
```

### Clear All Data
```bash
# Backup first!
# Then delete records
mysql -u interview_user -p interview_platform << EOF
DELETE FROM results;
DELETE FROM students;
DELETE FROM questions;
TRUNCATE TABLE results;
TRUNCATE TABLE students;
TRUNCATE TABLE questions;
EOF
```

---

## Default Credentials

**Development:**
- Username: `admin`
- Password: `password`

**Production:**
- Username: From `ADMIN_USERNAME` in `.env`
- Password: From `ADMIN_PASSWORD` in `.env`

⚠️ **IMPORTANT**: Change these credentials in production!

---

## File Structure

```
interview-platform/
├── index.html              # Student interface
├── admin.html             # Admin dashboard
├── .env                   # Configuration (create from .env.example)
├── .env.example          # Example configuration
├── css/
│   ├── style.css         # Old stylesheet
│   └── style-modern.css  # Modern responsive stylesheet
├── js/
│   ├── app.js            # Main application controller
│   ├── auth.js           # Authentication functions
│   ├── admin.js          # Admin dashboard functions
│   └── quiz.js           # Quiz functionality
├── php/
│   ├── config.php        # Database configuration
│   ├── auth.php          # Student registration
│   ├── admin_auth.php    # Admin authentication
│   ├── check_session.php # Session checker
│   ├── questions.php     # Question management
│   ├── results.php       # Results management
│   ├── settings.php      # Settings management
│   └── error_log         # Error log
├── vendor/               # Composer dependencies
├── DEPLOYMENT.md         # Deployment guide
├── TEST_GUIDE.md        # Testing guide
└── README.md            # Project documentation
```

---

## Performance Tips

1. **Enable Caching**
   - Set proper cache headers in `.htaccess`
   - Use browser cache for static assets

2. **Database Optimization**
   - Create indexes on frequently queried columns
   - Archive old results

3. **Code Optimization**
   - Minify CSS and JavaScript
   - Optimize images
   - Use gzip compression

4. **Server Optimization**
   - Enable PHP OpCache
   - Increase PHP memory limit if needed
   - Use PHP-FPM for better performance

---

## Security Checklist

- [ ] Changed default admin password
- [ ] Set strong database password
- [ ] Enabled HTTPS/SSL
- [ ] Set proper file permissions
- [ ] Added `.env` to `.gitignore`
- [ ] Disabled error display in production
- [ ] Enabled error logging
- [ ] Set up regular backups
- [ ] Configured firewall rules
- [ ] Restricted admin access by IP (if possible)

---

## Support & Documentation

- **Main Documentation**: See `DEPLOYMENT.md` for detailed guide
- **Testing**: See `TEST_GUIDE.md` for testing procedures
- **Admin Features**: Check `admin.html` for feature descriptions

---

## Common Endpoints

```
Student Interface:
- http://yourdomain.com/index.html

Admin Dashboard:
- http://yourdomain.com/admin.html

API Endpoints:
- http://yourdomain.com/php/questions.php        (GET/POST)
- http://yourdomain.com/php/results.php          (POST)
- http://yourdomain.com/php/settings.php         (GET/POST)
- http://yourdomain.com/php/auth.php             (POST)
- http://yourdomain.com/php/admin_auth.php       (POST)
```

---

## Next Steps

1. ✅ Setup `.env` configuration
2. ✅ Create database and user
3. ✅ Add initial questions
4. ✅ Test student registration
5. ✅ Test quiz functionality
6. ✅ Deploy to production
7. ✅ Enable HTTPS
8. ✅ Setup backups
9. ✅ Monitor performance
10. ✅ Train administrators

---

**Version**: 1.0  
**Last Updated**: February 5, 2026
