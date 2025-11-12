@echo off
chcp 65001 >nul
echo ========================================
echo Сборка проекта для деплоя
echo ========================================
echo.

REM Сохранение текущей директории и переход в корень проекта
set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"
echo Начальная директория: %CD%
echo.

echo [1/4] Установка зависимостей для мини-приложения...
cd miniapp
call npm install
if errorlevel 1 (
    echo Ошибка при установке зависимостей мини-приложения
    exit /b 1
)

echo.
echo [2/4] Сборка мини-приложения...
call npm run build
if errorlevel 1 (
    echo Ошибка при сборке мини-приложения
    exit /b 1
)
cd ..

echo.
echo [3/4] Установка зависимостей для API сервера...
cd miniapp\api-server
call npm install --production
if errorlevel 1 (
    echo Ошибка при установке зависимостей API сервера
    exit /b 1
)

echo.
echo [4/4] Компиляция TypeScript для API сервера...
call npm run build
if errorlevel 1 (
    echo Ошибка при компиляции API сервера
    exit /b 1
)
cd /d "%SCRIPT_DIR%"

echo.
echo [5/5] Подготовка файлов для деплоя...
echo Текущая директория: %CD%

REM Удаление старой папки, если существует
if exist deploy-package (
    echo Удаление старой папки deploy-package...
    rmdir /s /q deploy-package
)

REM Создание новой структуры папок
echo Создание структуры папок...
if not exist deploy-package mkdir deploy-package
if not exist deploy-package\www mkdir deploy-package\www
if not exist deploy-package\www\api-server mkdir deploy-package\www\api-server
if not exist deploy-package\www\api-server\dist mkdir deploy-package\www\api-server\dist
if not exist deploy-package\www\data mkdir deploy-package\www\data

REM Проверка и копирование статических файлов
echo Копирование статических файлов...
if exist miniapp\dist (
    xcopy /E /I /Y miniapp\dist\* deploy-package\www\ >nul
    if errorlevel 1 (
        echo Ошибка: не удалось скопировать статические файлы
        exit /b 1
    )
    echo   - Статические файлы скопированы
) else (
    echo Предупреждение: папка miniapp\dist не найдена
)

REM Проверка и копирование API сервера
echo Копирование API сервера...
if exist miniapp\api-server\dist (
    xcopy /E /I /Y miniapp\api-server\dist\* deploy-package\www\api-server\dist\ >nul
    if errorlevel 1 (
        echo Ошибка: не удалось скопировать API сервер
        exit /b 1
    )
    echo   - API сервер скопирован в api-server/dist/
) else (
    echo Ошибка: папка miniapp\api-server\dist не найдена
    exit /b 1
)

if exist miniapp\api-server\package.json (
    copy /Y miniapp\api-server\package.json deploy-package\www\api-server\ >nul
    echo   - package.json скопирован
) else (
    echo Ошибка: файл miniapp\api-server\package.json не найден
    exit /b 1
)

REM Копирование production package.json если существует
if exist miniapp\api-server\package.production.json (
    copy /Y miniapp\api-server\package.production.json deploy-package\www\api-server\ >nul
    echo   - package.production.json скопирован
)

REM Проверка и копирование данных
echo Копирование данных...
if exist data (
    xcopy /E /I /Y data\* deploy-package\www\data\ >nul
    if errorlevel 1 (
        echo Предупреждение: не удалось скопировать данные
    ) else (
        echo   - Данные скопированы
    )
) else (
    echo Предупреждение: папка data не найдена
)

REM Копирование скриптов и конфигурации
echo Копирование скриптов и конфигурации...
if exist .htaccess (
    copy /Y .htaccess deploy-package\www\ >nul
    echo   - .htaccess скопирован
) else (
    echo Предупреждение: файл .htaccess не найден
)

if exist deploy.sh (
    copy /Y deploy.sh deploy-package\www\ >nul
    echo   - deploy.sh скопирован
)
if exist quick-deploy.sh (
    copy /Y quick-deploy.sh deploy-package\www\ >nul
    echo   - quick-deploy.sh скопирован
)
if exist start-api.sh (
    copy /Y start-api.sh deploy-package\www\ >nul
    echo   - start-api.sh скопирован
)
if exist start-api-daemon.sh (
    copy /Y start-api-daemon.sh deploy-package\www\ >nul
    echo   - start-api-daemon.sh скопирован
)
if exist stop-api.sh (
    copy /Y stop-api.sh deploy-package\www\ >nul
    echo   - stop-api.sh скопирован
)
if exist check-files.sh (
    copy /Y check-files.sh deploy-package\www\ >nul
    echo   - check-files.sh скопирован
)
if exist fix-structure.sh (
    copy /Y fix-structure.sh deploy-package\www\ >nul
    echo   - fix-structure.sh скопирован
)
if exist watch-api.sh (
    copy /Y watch-api.sh deploy-package\www\ >nul
    echo   - watch-api.sh скопирован
)
if exist setup-autostart.sh (
    copy /Y setup-autostart.sh deploy-package\www\ >nul
    echo   - setup-autostart.sh скопирован
)
if exist start-on-reboot.sh (
    copy /Y start-on-reboot.sh deploy-package\www\ >nul
    echo   - start-on-reboot.sh скопирован
)
if exist setup-reboot.sh (
    copy /Y setup-reboot.sh deploy-package\www\ >nul
    echo   - setup-reboot.sh скопирован
)
if exist setup-full-autostart.sh (
    copy /Y setup-full-autostart.sh deploy-package\www\ >nul
    echo   - setup-full-autostart.sh скопирован
)

echo.
echo ========================================
echo Сборка завершена успешно!
echo ========================================
echo.
echo Собранные файлы:
echo   - miniapp\dist\ - статические файлы мини-приложения
echo   - miniapp\api-server\dist\ - скомпилированный API сервер
echo.
echo Пакет для деплоя:
echo   - deploy-package\www\ - все файлы для загрузки на сервер
echo.
echo Следующий шаг: 
echo   1. Загрузите содержимое папки deploy-package\www\ 
echo      в /www/maxhackathon.ru/ через ISPmanager
echo   2. Выполните на сервере: bash quick-deploy.sh
echo.

pause

