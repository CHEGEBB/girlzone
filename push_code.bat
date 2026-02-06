@echo off
echo Checking git status...
git status
echo.
echo Adding all changes...
git add .
echo.
echo Committing changes...
git commit -m "Force update"
echo.
echo Force pushing to origin...
git push origin HEAD --force
echo.
echo Done.
pause
