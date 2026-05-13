@echo off
setlocal EnableDelayedExpansion

REM Cambiar al directorio donde esta este script (raiz del proyecto)
cd /d "%~dp0"

echo.
echo ==========================================
echo   ONYRIA STUDIO - Presupuestos
echo   Iniciando aplicacion local
echo ==========================================
echo.

REM Verificar que node_modules existe
if not exist "node_modules" (
    echo [!] node_modules no encontrado. Instalando dependencias...
    echo     Esto puede tardar unos minutos la primera vez.
    echo.
    call npm install
    if errorlevel 1 (
        echo.
        echo [ERROR] Fallo la instalacion de dependencias.
        pause
        exit /b 1
    )
)

REM Preguntar al usuario por el pipeline
echo.
echo Elige el pipeline de IA a utilizar:
echo.
echo   [1] Pipeline NUEVO v2 (recomendado)
echo       - Embeddings locales con xenova/transformers
echo       - Busqueda semantica por cosine similarity
echo       - Validacion estricta contra catalogo (no inventa servicios)
echo.
echo   [2] Pipeline LEGACY
echo       - Solo Groq + fuzzy matching por palabras
echo.
set /p RESP="Tu eleccion [1/2] (default: 1): "

if "!RESP!"=="" set RESP=1

if "!RESP!"=="1" (
    set NPM_SCRIPT=dev:local:v2
    echo.
    echo [OK] Pipeline IA v2 ACTIVO
) else if "!RESP!"=="2" (
    set NPM_SCRIPT=dev:local
    echo.
    echo [OK] Pipeline IA LEGACY
) else (
    set NPM_SCRIPT=dev:local:v2
    echo.
    echo [!] Opcion invalida, usando pipeline v2 por defecto
)

echo.
echo ==========================================
echo   Backend:  http://localhost:3001
echo   Frontend: http://localhost:5173
echo ==========================================
echo.
echo La aplicacion se abrira en el navegador.
echo Presiona Ctrl+C en esta ventana para detener todo.
echo.

REM Abrir navegador despues de 10 segundos (en segundo plano)
start /b "" cmd /c "timeout /t 10 /nobreak >nul && start http://localhost:5173"

REM Levantar backend + frontend con concurrently (script segun pipeline elegido)
call npm run %NPM_SCRIPT%

echo.
echo Cerrando aplicacion...
endlocal
