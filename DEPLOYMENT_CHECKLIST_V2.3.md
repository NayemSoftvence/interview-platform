# Deployment Checklist - v2.3

## Pre-Deployment

- [ ] Backup current system
  ```bash
  cp -r interview-platform interview-platform.backup
  ```

- [ ] Review FIXES_V2.3.md documentation

- [ ] Test locally (if applicable)
  ```bash
  php -S localhost:8000
  ```

## Files to Upload

### Core CSS/JS Files
- [ ] `css/style-modern.css` - Updated admin height
- [ ] `js/admin.js` - Theme storage, screen scrolling
- [ ] `js/app.js` - Theme application on page load
- [ ] `js/quiz.js` - Results display logic
- [ ] `js/auth.js` - Logout button visibility

### HTML Files
- [ ] `admin.html` - Logout button styling
- [ ] `index.html` - Clean URLs

### PHP Files
- [ ] `php/settings.php` - Auto-create columns

### New Configuration
- [ ] `.htaccess` - URL rewriting rules (NEW)

### Documentation
- [ ] `FIXES_V2.3.md` - Complete documentation

## Post-Upload Configuration

### Apache Setup
- [ ] Verify `mod_rewrite` is enabled
  ```bash
  sudo a2enmod rewrite
  ```

- [ ] Enable `.htaccess` in Apache config
  ```apache
  <Directory /var/www/html>
      AllowOverride All
  </Directory>
  ```

- [ ] Restart Apache
  ```bash
  sudo systemctl restart apache2
  ```

### File Permissions
- [ ] Ensure `.htaccess` has proper permissions
  ```bash
  chmod 644 .htaccess
  chmod 755 css/ js/ php/
  chmod 644 css/*.css js/*.js php/*.php
  ```

## Testing After Deployment

### Issue #1 - Admin Scrolling
- [ ] Login to admin panel
- [ ] Go to Settings tab
- [ ] Scroll down to see all settings ✓
- [ ] Go to Questions tab  
- [ ] Scroll down to view all questions ✓
- [ ] Go to Results tab
- [ ] Scroll down to see all results ✓

### Issue #2 - Dark Mode Theme
- [ ] Login to admin
- [ ] Go to Settings
- [ ] Select "Dark Mode Modern"
- [ ] Open new tab and go to home page
- [ ] Take interview on student interface
- [ ] Verify quiz uses dark theme colors ✓

### Issue #3 - Theme Changes Visible
- [ ] Change theme to "Professional Blue"
- [ ] Refresh student interface page
- [ ] Verify Professional Blue colors appear ✓
- [ ] Change theme to "Modern Violet"
- [ ] Verify Violet colors appear ✓

### Issue #4 - Logout Button
- [ ] Login to admin
- [ ] Verify logout button visible in sidebar ✓
- [ ] Click logout
- [ ] Verify button disappears ✓
- [ ] Verify login form shows again ✓

### Issue #5 - Results Display
- [ ] Register for interview
- [ ] Answer a few questions
- [ ] Click Finish on last question
- [ ] Verify score displays immediately ✓
- [ ] Verify result message shows ✓
- [ ] Wait a few seconds and verify admin can see result ✓

### Issue #6 - Clean URLs
- [ ] Visit `http://yourdomain.com/admin` (no .html)
- [ ] Should load admin panel ✓
- [ ] Visit `http://yourdomain.com`
- [ ] Should load home screen ✓
- [ ] Visit `http://yourdomain.com/index.html` 
- [ ] Should still work ✓

### Issue #7 - Welcome Content
- [ ] Login to admin
- [ ] Go to Settings
- [ ] Enter welcome title: "Test Title"
- [ ] Click Save Welcome Content
- [ ] Verify success message (no database errors) ✓
- [ ] Go to home screen
- [ ] Verify custom title displays ✓

## Performance Checks

- [ ] Check page load times (should be similar or faster)
- [ ] Check browser console for JavaScript errors
- [ ] Verify admin panel response time
- [ ] Check database query performance
- [ ] Monitor server CPU/memory usage

## Security Checks

- [ ] Verify `.env` file is not accessible via web
- [ ] Check that `php/` directory is not browsable
- [ ] Verify admin login still requires authentication
- [ ] Check that student data is protected

## Browser Compatibility

- [ ] Test in Chrome (latest)
- [ ] Test in Firefox (latest)
- [ ] Test in Safari (latest)
- [ ] Test in Edge (latest)
- [ ] Test on mobile (iPhone, Android)

## Final Verification

- [ ] All 7 issues resolved
- [ ] No new errors introduced
- [ ] Performance acceptable
- [ ] Database operations working
- [ ] Emails working (if applicable)
- [ ] Admin can manage all features
- [ ] Students can take interviews

## Rollback Plan

If issues occur:

1. Restore backup
   ```bash
   rm -rf interview-platform
   mv interview-platform.backup interview-platform
   ```

2. Restart Apache
   ```bash
   sudo systemctl restart apache2
   ```

3. Clear browser cache

## Documentation

- [ ] Update README.md with v2.3 notes
- [ ] Document any custom configuration
- [ ] Document deployment date and by whom
- [ ] Store deployment logs

## Sign-Off

- [ ] Deployment completed successfully
- [ ] All tests passed
- [ ] Users notified (if applicable)
- [ ] Documentation updated

**Deployment Date**: _______________  
**Deployed By**: _______________  
**Approved By**: _______________  

---

## Quick Reference

| Issue | Test Command | Expected Result |
|-------|--------------|-----------------|
| Scrolling | Login → Settings → Scroll | All content visible |
| Dark Mode | Select Dark Mode → Quiz | Dark colors show |
| Themes | Change theme → Refresh | New theme applies |
| Logout | Login → Click Logout | Button disappears |
| Results | Finish quiz | Score shows instantly |
| URLs | Visit /admin | No .html in URL |
| Database | Save welcome text | No errors |

---

**Version**: 2.3  
**Last Updated**: February 5, 2026  
**Status**: Ready for Deployment
