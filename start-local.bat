@echo off
chcp 65001 >nul
rem Локальный запуск: собирает фронтенд и бэкенд и стартует сервер на порту 4000
rem (встроенный Postgres, данные в backend\.pgdata). Телефон в той же Wi-Fi сети
rem открывает http://<IP-этого-компьютера>:4000
set "PATH=%PATH%;C:\Program Files\nodejs"
cd /d "%~dp0frontend"
set VITE_BASE=/
set VITE_API_BASE_URL=/api
call npm run build || exit /b 1
cd /d "%~dp0backend"
call npm run build || exit /b 1
echo.
echo Откройте на телефоне: http://%COMPUTERNAME%:4000  (или по IP из ipconfig)
call npm run local
