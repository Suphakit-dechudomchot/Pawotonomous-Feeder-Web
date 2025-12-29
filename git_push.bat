@echo off
chcp 65001 >nul
echo ========================================
echo   Git Push - Pawotonomous Feeder
echo ========================================
echo.

echo [1/4] Adding files...
git add .

echo [2/4] Committing changes...
git commit -m "Update: Check device status and prevent meal conflicts"

echo [3/4] Pulling latest changes...
git pull origin main --rebase

if errorlevel 1 goto conflict

echo [4/4] Pushing to remote...
git push origin main

if errorlevel 1 goto failed

echo.
echo ========================================
echo   Push Complete!
echo ========================================
goto end

:conflict
echo.
echo ========================================
echo   Merge conflict detected!
echo ========================================
echo Please resolve conflicts manually:
echo   1. git rebase --continue
echo   2. git push origin main
goto end

:failed
echo.
echo ========================================
echo   Push Failed!
echo ========================================
goto end

:end
pause
