# 🍽️ MessTrack - Mess Attendance Tracker

[![PWA](https://img.shields.io/badge/PWA-enabled-blue)](https://web.dev/progressive-web-apps/)
[![Offline First](https://img.shields.io/badge/Offline-First-green)](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Offline_Service_workers)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A modern, offline-first Progressive Web App (PWA) for tracking mess/cafeteria attendance. Perfect for hostel students, office cafeterias, or anyone who needs to track their meal attendance.

![MessTrack Banner](https://via.placeholder.com/1200x400/667eea/ffffff?text=MessTrack+-+Your+Mess+Attendance+Manager)

## ✨ Features

### 📱 Core Features
- **Quick Attendance Marking** - Mark lunch and dinner attendance with a single tap
- **Calendar View** - Visual monthly calendar showing attendance history
- **Weekly View** - Track your weekly meal patterns
- **Statistics Dashboard** - Comprehensive analytics with charts and insights
- **Offline First** - Works completely offline, no internet required
- **PWA Support** - Install as a native app on any device

### 🔔 Smart Notifications
- **Browser Notifications** - Receive reminders at meal times
- **Customizable Times** - Set your own lunch and dinner times
- **Multiple Reminders** - Get notified 30, 15, 5 minutes before and at meal time
- **Smart Skip** - Automatically skips notifications if meal already marked

### 📊 Advanced Features
- **Undo/Redo** - Undo any action with Ctrl+Z (last 50 actions)
- **Bulk Edit** - Edit multiple days at once
- **Date Range Selection** - View and export custom date ranges
- **Notes & Reasons** - Add notes or skip reasons for any day
- **Export Options** - Export data as CSV, JSON, or PDF
- **Backup & Restore** - Automatic backup reminders and easy restore

### 🎨 User Experience
- **Glassmorphism UI** - Beautiful, modern transparent design
- **Dark/Light Theme** - Automatic theme switching
- **Performance Modes** - Optimized for all devices (High/Balanced/Battery Saver)
- **Responsive Design** - Works perfectly on mobile, tablet, and desktop
- **Touch Optimized** - Smooth gestures and animations

### 📈 Analytics & Insights
- **Attendance Percentage** - Track your overall attendance
- **Streak Tracking** - Monitor your current and longest streaks
- **Meal Preferences** - See which meals you attend most
- **Monthly Trends** - Compare month-over-month performance
- **Visual Charts** - Pie charts, line graphs, and heatmaps

---

## 🚀 Quick Start

### Option 1: Use Online (Recommended)
1. Visit the live demo: [Your-GitHub-Pages-URL]
2. Click "Install" when prompted (optional)
3. Start tracking your meals!

### Option 2: Run Locally
```bash
# Clone the repository
git clone https://github.com/yourusername/messtrack.git

# Navigate to directory
cd messtrack

# Open in browser
# Simply open index.html in your browser
# Or use a local server:
python -m http.server 8000
# Then visit: http://localhost:8000
```

### Option 3: Install as PWA
1. Open the app in Chrome/Edge/Safari
2. Click the install icon in the address bar
3. App will be installed on your device
4. Access from home screen like a native app

---

## 📖 How to Use

### First Time Setup
1. **Open the app** - Visit the URL or open index.html
2. **Set meal times** - Go to Settings and set your lunch/dinner times
3. **Enable notifications** (optional) - Toggle "Daily Reminders" in Settings
4. **Start tracking** - Mark your meals from the Dashboard

### Daily Usage
1. **Mark Attendance** - Tap the Lunch or Dinner button on Dashboard
2. **View History** - Check the Calendar or Weekly view
3. **Check Stats** - See your attendance percentage in Statistics
4. **Export Data** - Export your records anytime from Statistics

### Advanced Usage
- **Bulk Edit** - Go to Weekly view → Click "Bulk Edit"
- **Add Notes** - Long press any day in Calendar to add notes
- **Undo Actions** - Press Ctrl+Z or click Undo in toast notification
- **Export Reports** - Statistics → Export & Share → Choose format
- **Backup Data** - Settings → Create Backup Now

---

## 🛠️ Technical Details

### Built With
- **HTML5** - Semantic markup
- **CSS3** - Modern styling with glassmorphism
- **Vanilla JavaScript** - No frameworks, pure JS
- **Service Worker** - Offline functionality
- **Web Notifications API** - Browser notifications
- **LocalStorage** - Data persistence
- **PWA Manifest** - App installation

### Browser Support
- ✅ Chrome 60+ (Recommended)
- ✅ Edge 79+
- ✅ Firefox 55+
- ✅ Safari 11+
- ✅ Opera 47+
- ⚠️ Mobile browsers (limited background notifications)

### Performance
- **Load Time** - < 1 second on 3G
- **App Size** - < 500 KB total
- **Offline** - 100% functional offline
- **Storage** - < 5 MB for 1 year of data
- **Battery** - Minimal impact (< 1% per day)

---

## 📂 Project Structure

```
messtrack/
├── index.html                          # Main HTML file
├── manifest.json                       # PWA manifest
├── sw.js                              # Service worker
├── app.js                             # Main application logic
├── notification-manager.js            # Notification system
├── statistics-manager.js              # Analytics & charts
├── undo-manager.js                    # Undo/redo functionality
├── backup-manager.js                  # Backup & restore
├── advanced-export.js                 # Export functionality
├── calendar-integration.js            # Calendar features
├── device-optimizer.js                # Performance optimization
├── app-fixes.js                       # Error handling & fixes
├── enhanced-core-functions.js         # Core utilities
├── enhanced-app-improvements.js       # App enhancements
├── enhanced-module-improvements.js    # Module enhancements
├── glass-ui-enhancer.js              # UI animations
├── glassmorphism-ui.css              # Glassmorphism styles
├── optimization-styles.css            # Performance styles
├── reduced-animations.css             # Animation optimizations
└── icons/                             # App icons (various sizes)
```

---

## 🎯 Key Features Explained

### Offline First Architecture
MessTrack works completely offline using:
- **Service Worker** - Caches all app files
- **LocalStorage** - Stores all attendance data locally
- **No Server Required** - Everything runs in your browser

### Smart Notifications
Notifications are sent at times YOU set:
1. Set lunch time (e.g., 12:00) in Settings
2. Set dinner time (e.g., 19:00) in Settings
3. Get 4 reminders per meal:
   - 30 minutes before
   - 15 minutes before
   - 5 minutes before
   - At exact time
4. Notifications auto-update when you change times

### Performance Modes
Choose the mode that fits your device:
- **🚀 High Performance** - Best for powerful devices (2020+)
- **⚡ Balanced** - Recommended for most users (2017-2020)
- **💾 Battery Saver** - Best for older devices (2015-2017)

### Data Privacy
- **100% Local** - All data stays on your device
- **No Tracking** - No analytics or tracking scripts
- **No Server** - No data sent to any server
- **Export Anytime** - Download your data whenever you want

---

## 🔧 Configuration

### Settings Available
- **Lunch Time** - Set your lunch time (default: 12:00)
- **Dinner Time** - Set your dinner time (default: 19:00)
- **Notifications** - Enable/disable meal reminders
- **Theme** - Light or Dark mode
- **Performance Mode** - High/Balanced/Battery Saver
- **Backup Frequency** - Auto-backup reminders

### Keyboard Shortcuts
- `Ctrl+Z` / `Cmd+Z` - Undo last action
- `Ctrl+Shift+Z` / `Cmd+Shift+Z` - Redo action
- `Ctrl+Y` / `Cmd+Y` - Redo (alternative)
- `Arrow Keys` - Navigate between pages

---

## 📊 Data Export Formats

### Available Formats
1. **CSV** - Excel-compatible spreadsheet
2. **JSON** - Complete data backup
3. **PDF** - Professional report with charts
4. **Excel** - Direct Excel format with summary
5. **Image** - Shareable PNG with statistics
6. **Email** - Pre-formatted email report
7. **Print** - Print-optimized layout

### What's Included
- All attendance records
- Notes and skip reasons
- Monthly statistics
- Attendance percentage
- Streak information
- Export timestamp

---

## 🐛 Troubleshooting

### Notifications Not Working?
1. Check browser notification permission
2. Verify times are set in Settings
3. Ensure notifications are enabled in Settings
4. Check browser is not in "Do Not Disturb" mode
5. Try disabling and re-enabling notifications

### Data Not Saving?
1. Check browser allows localStorage
2. Clear browser cache and reload
3. Check available storage space
4. Try exporting and re-importing data

### App Not Installing?
1. Use Chrome, Edge, or Safari
2. Ensure HTTPS or localhost
3. Check manifest.json is accessible
4. Clear browser cache and try again

### Performance Issues?
1. Switch to Battery Saver mode in Settings
2. Disable animations in Performance settings
3. Clear old data (export first!)
4. Use a modern browser

---

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

### Ways to Contribute
- 🐛 Report bugs
- 💡 Suggest new features
- 📝 Improve documentation
- 🔧 Submit pull requests
- ⭐ Star the repository

### Development Setup
```bash
# Fork and clone the repository
git clone https://github.com/yourusername/messtrack.git

# Create a new branch
git checkout -b feature/your-feature-name

# Make your changes
# Test thoroughly

# Commit your changes
git commit -m "Add: your feature description"

# Push to your fork
git push origin feature/your-feature-name

# Create a Pull Request
```

### Code Style
- Use ES6+ JavaScript
- Follow existing code structure
- Add comments for complex logic
- Test on multiple browsers
- Ensure offline functionality works

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

```
MIT License

Copyright (c) 2024 MessTrack

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
```

---

## 🙏 Acknowledgments

- **Tailwind CSS** - For utility-first CSS framework
- **Font Awesome** - For beautiful icons
- **jsPDF** - For PDF generation
- **QRCode.js** - For QR code generation
- **All Contributors** - Thank you for your contributions!

---

## 📞 Support

### Get Help
- 📖 [Documentation](https://github.com/yourusername/messtrack/wiki)
- 🐛 [Report Issues](https://github.com/yourusername/messtrack/issues)
- 💬 [Discussions](https://github.com/yourusername/messtrack/discussions)
- ⭐ [Star on GitHub](https://github.com/yourusername/messtrack)

### Contact
- **GitHub** - [@yourusername](https://github.com/yourusername)
- **Email** - your.email@example.com
- **Twitter** - [@yourhandle](https://twitter.com/yourhandle)

---

## 🗺️ Roadmap

### Planned Features
- [ ] Cloud sync (optional)
- [ ] Multi-user support
- [ ] Meal planning integration
- [ ] Nutrition tracking
- [ ] Social features (share stats)
- [ ] Widget support
- [ ] Desktop app (Electron)
- [ ] Mobile app (React Native)

### Recently Added
- ✅ Browser notifications with custom times
- ✅ Enhanced performance modes
- ✅ Comprehensive statistics dashboard
- ✅ Multiple export formats
- ✅ Undo/redo functionality
- ✅ Backup & restore system

---

## 📈 Stats

![GitHub stars](https://img.shields.io/github/stars/yourusername/messtrack?style=social)
![GitHub forks](https://img.shields.io/github/forks/yourusername/messtrack?style=social)
![GitHub issues](https://img.shields.io/github/issues/yourusername/messtrack)
![GitHub pull requests](https://img.shields.io/github/issues-pr/yourusername/messtrack)
![GitHub last commit](https://img.shields.io/github/last-commit/yourusername/messtrack)

---

## 🌟 Show Your Support

If you find MessTrack useful, please consider:
- ⭐ Starring the repository
- 🐛 Reporting bugs
- 💡 Suggesting features
- 📢 Sharing with friends
- ☕ [Buy me a coffee](https://www.buymeacoffee.com/yourusername)

---

<div align="center">

**Made with ❤️ for students and mess-goers everywhere**

[⬆ Back to Top](#-messtrack---mess-attendance-tracker)

</div>
