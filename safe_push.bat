@echo off
echo Adding all changes...
git add .
echo.
echo Committing changes...
git commit -m "Automated commit"
echo.
echo Pushing to origin...
git push
echo.
git add .
