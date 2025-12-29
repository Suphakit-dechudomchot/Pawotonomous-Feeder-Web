@echo off
echo ========================================
echo   Git Push - Pawotonomous Feeder
echo ========================================
echo.

git add .
git commit -m "ตรวจสอบสถานะการทำงานและป้องกันการทับซ้อนกับมื้ออาหาร"
git push origin main

echo.
echo ========================================
echo   Push Complete!
echo ========================================
pause
