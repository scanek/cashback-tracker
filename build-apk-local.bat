@echo off
chcp 65001 > nul
echo ========================================================
echo   Сборка автономного Android APK (Мои Кэшбеки)
echo ========================================================
echo.

set "PROJECT_DIR=%~dp0"
cd /d "%PROJECT_DIR%"

if "%JAVA_HOME%"=="" (
    if exist "C:\Program Files\Microsoft\jdk-17.0.20.101-hotspot" (
        set "JAVA_HOME=C:\Program Files\Microsoft\jdk-17.0.20.101-hotspot"
        set "PATH=%JAVA_HOME%\bin;%PATH%"
    )
)

if "%ANDROID_HOME%"=="" (
    if exist "%LOCALAPPDATA%\Android\Sdk" (
        set "ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk"
        set "PATH=%ANDROID_HOME%\platform-tools;%ANDROID_HOME%\cmdline-tools\latest\bin;%PATH%"
    )
)

echo [1/4] Проверка окружения...
if "%ANDROID_HOME%"=="" (
    echo [!] ПРЕДУПРЕЖДЕНИЕ: Переменная ANDROID_HOME не найдена.
    echo     Если у вас установлен Android Studio, укажите путь к SDK.
) else (
    echo [v] Android SDK: %ANDROID_HOME%
)
echo [v] Java JDK: %JAVA_HOME%
echo.

echo [2/4] Генерация нативного Android проекта (Expo Prebuild)...
call npx expo prebuild --platform android --clean
if errorlevel 1 (
    echo [X] Ошибка при выполнении expo prebuild!
    pause
    exit /b 1
)

if not "%ANDROID_HOME%"=="" (
    echo sdk.dir=%ANDROID_HOME:\=\\% > android\local.properties
)

echo.
echo [3/4] Компиляция автономного Release APK через Gradle...
cd android
call gradlew.bat assembleRelease --stacktrace
if errorlevel 1 (
    echo.
    echo [X] Ошибка при сборке APK через Gradle.
    echo     Убедитесь, что установлен Android SDK (через Android Studio или cmdline-tools).
    cd ..
    pause
    exit /b 1
)
cd ..

echo.
echo [4/4] Копирование готового файла...
if exist "android\app\build\outputs\apk\release\app-release.apk" (
    copy /y "android\app\build\outputs\apk\release\app-release.apk" "Мои_Кэшбеки.apk" > nul
    echo [v] УСПЕШНО! Готовый файл: %PROJECT_DIR%Мои_Кэшбеки.apk
    explorer /select,"Мои_Кэшбеки.apk"
) else (
    for /r android\app\build\outputs\apk %%F in (*.apk) do (
        copy /y "%%F" "Мои_Кэшбеки.apk" > nul
        echo [v] УСПЕШНО! Готовый файл: %PROJECT_DIR%Мои_Кэшбеки.apk
        explorer /select,"Мои_Кэшбеки.apk"
        goto :done
    )
)

:done
echo.
echo ========================================================
echo   Сборка завершена! Файл Мои_Кэшбеки.apk готов!
echo ========================================================
pause
