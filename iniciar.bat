@echo off
title FixLens · Óptica Premium
cd /d "%~dp0"
echo.
echo  ============================================
echo   FIXLENS · Óptica Premium
echo  ============================================
echo.
echo  Abre tu navegador en: http://localhost:8000
echo  Panel administrativo:  http://localhost:8000/admin
echo  Usuario: admin   Contrasena: fixlens123
echo.
echo  Presiona CTRL+C para detener el servidor.
echo.
python server.py
pause
