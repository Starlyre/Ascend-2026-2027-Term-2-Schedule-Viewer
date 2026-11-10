@echo off
title ASCEND Local Web Server
echo =====================================================================
echo  Organization ASCEND - Schedule Availability Checker Web Server
echo  Serving on: http://localhost:8080
echo =====================================================================
start "" http://localhost:8080
python -m http.server 8080
pause
