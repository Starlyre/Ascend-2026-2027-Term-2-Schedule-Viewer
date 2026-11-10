# ASCEND - NU Fairview Officer Schedule Availability Checker
**Academic Society of Computer Engineering Discipline (ASCEND)**  
*National University Fairview • AY 2026–2027 • Term 2*

A responsive, high-tech web application built using the classic **Web Trio (HTML5, CSS3, and Modern JavaScript)**, designed specifically for ASCEND officers to check member availability, discover optimal meeting windows, inspect individual timetables, and coordinate student council activities with zero scheduling conflicts.

---

## ⚡ Quick Start (How to Run)

### Method 1: Instant Launch (Zero Setup)
Simply double-click:
```
start-app.bat
```
*(Or double-click `index.html` directly in any web browser such as Chrome, Edge, Brave, or Firefox).*

### Method 2: Local Web Server
If you prefer running a local HTTP server:
```
start-server.bat
```
Or with Python:
```bash
python -m http.server 8080
```
Then navigate to: `http://localhost:8080`

### Method 3: Java Web Server (Optional)
If running via a standard Java SE environment:
```bash
javac Server.java
java Server
```

---

## 🚀 Key Features

1. **🎯 Meeting Finder & Best Times (Group Availability Engine)**
   - Automatically computes continuous windows where **100% of officers (or 90%+)** are completely free.
   - Filter by **Meeting Duration** (30 min, 1 hr, 1.5 hr, 2 hr, 3 hr), **Day of Week**, **Time Window** (Morning, Afternoon, Evening), and **Availability Threshold**.
   - One-click **"📋 Copy Proposal"** button that copies ready-to-paste announcements formatted for Discord, Messenger, or MS Teams with full attendee lists and conflict summaries.

2. **🗺️ Interactive Weekly Availability Heatmap**
   - Matrix showing every hour from **7:00 AM to 8:00 PM** across Monday to Saturday.
   - Color-coded by availability ratio:
     - 🟩 **Green (10/10)**: 100% Free
     - 🟩 **Teal (8-9/10)**: 80%–99% Free
     - 🟨 **Amber (6-7/10)**: 60%–79% Free
     - 🟧 **Orange (4-5/10)**: 40%–59% Free
     - 🟥 **Red (0-3/10)**: Severe Conflict
   - Clicking on any cell opens a modal breaking down the roster: who is available and who is in class (with subject title, room number, instructor, and F2F/Online mode).

3. **⚡ Instant Checker ("Who's Free Right Now?")**
   - Real-time status widget in the header syncing with system time.
   - Pick any custom Day and Time (with a **"⏱️ Use Current Time"** button).
   - Side-by-side view separating available officers from busy officers.

4. **👤 Individual Officer Timetables**
   - Detailed course schedule breakdown for each officer.
   - Displays subject codes, descriptions, section codes, rooms, mode (Face-to-Face vs Online), and unit counts.
   - Quick **"🖼️ View Sched Slip"** button opening their official enrollment schedule JPEG directly in a popup.

5. **⚖️ Side-by-Side Officer Comparison**
   - Compare 2 officers side-by-side to coordinate committee pairings, laboratory assistance, or event errands.

6. **🎨 Customization & Branding**
   - High-tech dark mode aesthetic designed for Computer Engineering students.
   - Official NU Fairview colors (Navy Blue & Gold) with cyber-cyan accents.
   - Light/Dark mode toggle.
   - Print stylesheet (`@media print`) for clean paper printing or PDF export.

---

## 📋 Officers & Term 2 Schedules Summary

| # | Officer | Total Units | Key Free Windows | Original Schedule File |
|---|---|---|---|---|
| 1 | **Albano** | 11.0 | Wed (all day), Tue morning, Sat (all day) | `ALBANO SCHED.jpg` |
| 2 | **Cajis** | 15.0 | Wed (all day), Sat (all day), Thu afternoon | `Cajis, Dandan, Diaz Sched.jpg` |
| 3 | **Dandan** | 15.0 | Wed (all day), Sat (all day), Thu afternoon | `Cajis, Dandan, Diaz Sched.jpg` |
| 4 | **Diaz** | 15.0 | Wed (all day), Sat (all day), Thu afternoon | `Cajis, Dandan, Diaz Sched.jpg` |
| 5 | **Carorocan** | 8.0 | Wed (all day), Fri after 8:20 AM, Sat (all day) | `Carorocan, Taneo Sched.jpg` |
| 6 | **Taneo** | 8.0 | Wed (all day), Fri after 8:20 AM, Sat (all day) | `Carorocan, Taneo Sched.jpg` |
| 7 | **Corpuz** | 16.0 | Wed (all day), Tue afternoon, Sat (all day) | `Corpuz Sched.jpg` |
| 8 | **Manuson** | 19.0 | Wed (all day), Tue morning, Fri morning | `Manuson Sched.jpg` |
| 9 | **Saraza** | 16.0 | Wed (all day), Tue afternoon, Sat (all day) | `SARAZA SCHED.jpg` |
| 10 | **Villanueva** | 18.0 | Wed (all day), Mon 9-1 PM, Sat (all day) | `Villanueva Sched.jpg` |
| 11 | **Tuazon** | 8.0 | Wed (all day), Tue (all day), Sat (all day) | `Tuazon.jpg` |

### 💡 Key Schedule Insights for Organization Planning:
- 🌟 **Golden Day (Wednesday)**: **100% of all 11 officers are completely free all day (7:00 AM – 8:00 PM)**! Ideal for ASCEND General Assemblies, major workshops, and executive committee sessions.
- 📅 **Secondary Window (Saturday)**: **100% free before 11:00 AM and after 3:00 PM for all 11 officers** (only Manuson has class from 11:00 AM – 3:00 PM).
- 🌙 **Evening Window (Weekdays 7:00 PM – 8:00 PM)**: All 11 officers are finished with classes every single day by 7:00 PM.

---

## 📁 File Structure

```text
Term 2 Scheduler/
├── index.html              # Main application web interface
├── style.css               # Modern CSS with NU Fairview theme, responsive grid & animations
├── app.js                  # Scheduling algorithm, availability engine & interactivity
├── data.js                 # Complete database of all 10 officers and their subjects
├── Server.java             # Standalone Java HTTP Server (optional)
├── start-app.bat           # 1-click launcher for Windows
├── start-server.bat        # 1-click web server runner
├── README.md               # Documentation and guide
└── *.jpg                   # 7 high-resolution schedule cards/enrollment slips
```

---
*Created for Organization ASCEND — Academic Society of Computer Engineering Discipline, National University Fairview.*
