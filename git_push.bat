@echo off
echo ========================================
echo   Git Push - Pawotonomous Feeder
echo ========================================
echo.

git add .
git commit -m "feat: Add 15 audio sounds support and update documentation"
git push origin main

echo.
echo ========================================
echo   Push Complete!
echo ========================================
pause
