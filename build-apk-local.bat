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
    )
)

if "%ANDROID_HOME%"=="" (
    if exist "C:\Users\657C~1\AppData\Local\Android\Sdk" (
        set "ANDROID_HOME=C:\Users\657C~1\AppData\Local\Android\Sdk"
    ) else if exist "%LOCALAPPDATA%\Android\Sdk" (
        for %%I in ("%LOCALAPPDATA%\Android\Sdk") do set "ANDROID_HOME=%%~sI"
    )
)

if "%GRADLE_USER_HOME%"=="" (
    set "GRADLE_USER_HOME=C:\.gradle"
)

set "PATH=%ANDROID_HOME%\platform-tools;%ANDROID_HOME%\cmake\3.22.1\bin;%JAVA_HOME%\bin;%PATH%"

echo [1/4] Проверка окружения...
if "%ANDROID_HOME%"=="" (
    echo [!] ПРЕДУПРЕЖДЕНИЕ: Переменная ANDROID_HOME не найдена.
) else (
    echo [v] Android SDK: %ANDROID_HOME%
)
echo [v] Java JDK: %JAVA_HOME%
echo [v] Gradle Home: %GRADLE_USER_HOME%
echo.

echo [2/4] Генерация нативного Android проекта (Expo Prebuild)...
call npx expo prebuild --platform android --clean
if errorlevel 1 (
    echo [X] Ошибка при выполнении expo prebuild!
    pause
    exit /b 1
)

if not "%ANDROID_HOME%"=="" (
    set "CLEAN_SDK=%ANDROID_HOME:\=/%"
    echo sdk.dir=%CLEAN_SDK% > android\local.properties
    echo cmake.dir=%CLEAN_SDK%/cmake/3.22.1 >> android\local.properties
    echo ndk.dir=%CLEAN_SDK%/ndk/27.1.12297006 >> android\local.properties
)

echo.
echo [3/4] Компиляция автономного Release APK через Gradle...
cd android
call gradlew.bat assembleRelease --stacktrace
if errorlevel 1 (
    echo.
    echo [X] Ошибка при сборке APK через Gradle.
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
