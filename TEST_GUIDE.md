# Interview Platform - Testing Guide

## Overview
This document provides testing procedures for all features of the Flutter Mock Interview Platform.

---

## 1. Login & Logout Button Functionality

### Issue Fixed
The login button now works with both clicking and pressing Enter.

### Test Steps
1. Navigate to `admin.html`
2. Test **Method 1 - Click Button**:
   - Enter username: `admin`
   - Enter password: `password`
   - Click the "Login" button
   - Expected: Should log in and show admin dashboard
3. Test **Method 2 - Enter Key (Username field)**:
   - Clear the form
   - Enter username: `admin`
   - Press Tab to move to password field
   - Press Enter
   - Expected: Should log in and show admin dashboard
4. Test **Method 3 - Enter Key (Password field)**:
   - Clear the form
   - Enter username: `admin`
   - Enter password: `password`
   - Press Enter while in password field
   - Expected: Should log in and show admin dashboard

### Logout Test
1. After successful login, click "Logout" button
2. Expected: Should redirect to admin login page

---

## 2. Home Screen Text Control (Admin Dashboard)

### Feature Description
Admins can now customize the welcome screen text from the admin dashboard.

### Test Steps
1. Login to admin dashboard
2. Click "Settings" in the sidebar
3. Scroll to "Home Screen Content" section
4. Modify:
   - **Welcome Title**: Change to a custom title
   - **Welcome Description**: Enter a custom description
   - **Instructions**: Enter instructions (one per line)
5. Click "Save Welcome Content" button
6. Expected: Success message should appear
7. Navigate to `index.html` in a new tab
8. Expected: The welcome screen should display your custom text

### Example Content
- **Title**: "Advanced Flutter Certification Exam"
- **Description**: "Master Flutter development skills with our comprehensive interview exam."
- **Instructions**:
  - Carefully read each question before answering
  - Only one answer per question allowed
  - You cannot return to previous questions
  - Breaking focus will end the exam after 5 seconds
  - Time management is crucial

---

## 3. Responsive Design

### Mobile Test (Smartphones - 375px to 667px)

#### Welcome Screen
1. Open `index.html` on mobile device or use Chrome DevTools (iPhone SE/iPhone 6/7/8)
2. Verify:
   - Header text is readable (no overflow)
   - "Register for Interview" button is full-width and easy to tap
   - Instructions list is properly formatted
   - All text is legible

#### Registration Form
1. Click "Register for Interview"
2. Verify:
   - Form is centered and not too wide
   - Input fields are properly sized for mobile
   - Button is full-width and tappable
   - No horizontal scrolling needed

#### Quiz Screen
1. Register and start interview
2. Verify:
   - Question text is readable
   - Options (A, B, C, D) are full-width with good spacing
   - "Next" and "Previous" buttons are properly sized
   - Progress bar is visible
   - Timer is visible and readable

### Tablet Test (768px to 1024px)
1. Use Chrome DevTools (iPad)
2. Verify:
   - Admin dashboard sidebar collapses to horizontal nav
   - Dashboard stats are in 2-column grid
   - Quick action buttons are properly arranged
   - Results table scrolls horizontally if needed

### Desktop Test (1024px+)
1. Open both `index.html` and `admin.html`
2. Verify:
   - Sidebar is visible on left (admin)
   - Content area is properly spaced
   - All elements align correctly

---

## 4. Modern Design Features

### Visual Improvements
1. ✅ Modern color scheme (Indigo, Purple, Cyan)
2. ✅ Smooth gradients on buttons and header
3. ✅ Enhanced shadows and depth
4. ✅ Better spacing and typography
5. ✅ Smooth animations (fade-in, slide-up)
6. ✅ Modern form styling with focus states
7. ✅ Better hover effects on interactive elements
8. ✅ Professional admin dashboard layout

### Verify Design
1. Open `index.html` and `admin.html`
2. Check:
   - Color scheme is consistent (primary: indigo, secondary: purple)
   - Buttons have smooth gradients
   - Cards/sections have subtle shadows
   - Text is properly spaced
   - Forms have good visual hierarchy
   - Admin sidebar is visually appealing

---

## 5. Tab-Switching & Exam Window Lock Feature

### Feature Description
When a student switches browser tabs or clicks outside the exam window, the exam will close after 5 seconds of warning.

### Test Steps

#### Test 1: Tab Switching Detection
1. Navigate to `index.html`
2. Click "Register for Interview"
3. Fill in form and click "Register & Start Interview"
4. Interview starts, displaying a question
5. **Switch to another browser tab** (Alt+Tab or click another tab)
6. Expected:
   - ✅ Warning modal appears with message
   - ✅ Countdown timer shows 5 seconds
   - ✅ Counter displays remaining time
7. **Quickly return to the exam tab before countdown ends**
8. Expected:
   - ✅ Warning modal disappears
   - ✅ Interview continues normally
9. **Wait for countdown to finish**
10. Expected:
    - ✅ Exam closes automatically
    - ✅ Results screen displays
    - ✅ Student cannot answer more questions

#### Test 2: Window Blur Detection (Click Outside)
1. Start interview as above
2. **Click on the browser address bar** (blurs the window)
3. Expected:
   - ✅ Warning modal appears
   - ✅ 5-second countdown starts
4. **Click back in the exam window quickly**
5. Expected:
   - ✅ Warning disappears
   - ✅ Quiz continues
6. **Wait for countdown**
7. Expected:
   - ✅ Exam ends automatically

#### Test 3: Multiple Violations
1. Start interview
2. **First violation**: Switch tabs, wait 1 second, return before countdown
3. Expected:
   - ✅ Warning appears and disappears
   - ✅ Interview continues
4. **Second violation** (immediately after): Click outside again
5. Expected:
   - ✅ New warning appears
   - ✅ Countdown resets to 5
6. **Wait for this countdown to finish**
7. Expected:
   - ✅ Exam ends
   - ✅ Cannot continue

#### Test 4: Exam Closure Confirmation
1. After exam closes via warning:
2. Verify results screen shows:
   - ✅ Final score
   - ✅ Percentage
   - ✅ Performance message
   - ✅ All student data is saved

### What the Feature Prevents
- ✅ Prevents looking up answers while taking exam
- ✅ Prevents switching to another browser tab to research
- ✅ Prevents minimizing window to access other applications
- ✅ Prevents cheating by enforcing focused exam taking

---

## 6. Admin Features

### Add Questions
1. Login to admin
2. Go to "Questions" section
3. Click "Add Question" tab
4. Fill in:
   - Question text
   - Options A, B, C, D
   - Correct answer (0-3 for A-D)
5. Click "Add Question"
6. Expected: Question appears in list

### Edit Questions
1. In Questions section, click "Edit" on any question
2. Modify content
3. Click "Update Question"
4. Expected: Changes are saved

### View Results
1. Go to "Results" section
2. View table with:
   - Student name, email, phone
   - Score and percentage
   - Completion date/time
3. Click column headers to sort
4. Expected: Results sort in ascending/descending order

### Settings
1. Go to "Settings"
2. Modify:
   - Interview Duration (minutes)
   - Exam Status (toggle ON/OFF)
   - Home Screen Content
3. Click respective save buttons
4. Expected: Changes are persisted

---

## 7. Exam Configuration

### Change Interview Duration
1. Go to Settings
2. Change "Interview Duration" to e.g., 5 minutes
3. Click "Save"
4. Go to `index.html`
5. Verify timer shows "05:00" instead of "30:00"

### Enable/Disable Exam
1. Go to Settings
2. Toggle "Exam Status" to OFF
3. Go to `index.html` in new tab
4. Expected: "Interview Not Running" message appears
5. Toggle Exam Status back to ON
6. Refresh `index.html`
7. Expected: Welcome screen appears

---

## 8. Cross-Device Testing

### Test on Different Devices
1. **iPhone**: Test touch interactions, button sizes
2. **Android Phone**: Test with different screen sizes
3. **iPad**: Test tablet layout
4. **Desktop**: Test at various browser widths (1920px, 1440px, 1024px, 768px)

### Browser Compatibility
- ✅ Chrome/Chromium
- ✅ Firefox
- ✅ Safari
- ✅ Edge

---

## 9. Performance Testing

### Load Time
1. Open DevTools (F12)
2. Go to Performance tab
3. Refresh page
4. Expected: Page loads in < 2 seconds
5. Expected: No console errors

### Responsiveness
1. While quiz is running, verify:
   - Questions load instantly
   - Options respond to clicks immediately
   - Timer updates smoothly
   - No lag when switching questions

---

## 10. Data Persistence Testing

### Student Results
1. Complete a quiz
2. Logout and refresh admin
3. Go to "Results"
4. Expected: Your result is still there with correct score

### Admin Settings
1. Change interview time to 15 minutes
2. Logout
3. Login again
4. Go to Settings
5. Expected: Interview time still shows 15 minutes

### Questions
1. Add a question
2. Logout and wait
3. Login again
4. Go to Questions
5. Expected: Your question is still there

---

## Troubleshooting

### Login Not Working
- Clear browser cache
- Check if database connection is working
- Verify credentials in `php/admin_auth.php`

### Exam Not Closing After Tab Switch
- Check browser console for JavaScript errors (F12)
- Ensure `js/quiz.js` is properly loaded
- Test in a different browser

### Welcome Content Not Updating
- Clear browser cache
- Check database connection
- Verify `php/settings.php` is accessible

### Responsive Design Issues
- Clear browser cache
- Test in incognito/private window
- Check viewport meta tag in HTML

---

## Summary Checklist

- [ ] Login button works with click
- [ ] Login button works with Enter key
- [ ] Logout button works
- [ ] Can customize home screen text
- [ ] Changes persist after refresh
- [ ] Mobile layout works (< 768px)
- [ ] Tablet layout works (768px - 1024px)
- [ ] Desktop layout works (> 1024px)
- [ ] Modern design is visually appealing
- [ ] Tab-switching closes exam after 5 seconds
- [ ] Window blur closes exam after 5 seconds
- [ ] Multiple violations properly handled
- [ ] Admin features work (add, edit, view)
- [ ] Settings changes persist
- [ ] No console errors
- [ ] Performance is good (< 2s load)

---

## Contact
If you encounter any issues during testing, please document:
1. Device/Browser used
2. Steps to reproduce
3. Expected vs. actual result
4. Browser console errors (if any)
