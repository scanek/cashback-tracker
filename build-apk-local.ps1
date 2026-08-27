# PowerShell скрипт локальной сборки Android APK
$ErrorActionPreference = "Stop"

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "   Сборка автономного Android APK (Мои Кэшбеки)" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

$ProjectDir = $PSScriptRoot
Set-Location $ProjectDir

if (-not $env:JAVA_HOME) {
    if (Test-Path "C:\Program Files\Microsoft\jdk-17.0.20.101-hotspot") {
        $env:JAVA_HOME = "C:\Program Files\Microsoft\jdk-17.0.20.101-hotspot"
        $env:PATH = "$env:JAVA_HOME\bin;$env:PATH"
    }
}

if (-not $env:ANDROID_HOME) {
    if (Test-Path "$env:LOCALAPPDATA\Android\Sdk") {
        $env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
        $env:PATH = "$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\cmdline-tools\latest\bin;$env:PATH"
    }
}

Write-Host "[1/4] Проверка окружения..." -ForegroundColor Yellow
if (-not $env:ANDROID_HOME) {
    Write-Host "[!] ВНИМАНИЕ: ANDROID_HOME не задан. Убедитесь, что установлен Android SDK." -ForegroundColor Red
} else {
    Write-Host "[v] Android SDK: $env:ANDROID_HOME" -ForegroundColor Green
}
Write-Host "[v] Java JDK: $env:JAVA_HOME" -ForegroundColor Green
Write-Host ""

Write-Host "[2/4] Генерация нативного Android проекта (Expo Prebuild)..." -ForegroundColor Yellow
npx expo prebuild --platform android --clean

if ($env:ANDROID_HOME) {
    $escapedPath = $env:ANDROID_HOME.Replace("\", "\\")
    Set-Content -Path "android\local.properties" -Value "sdk.dir=$escapedPath"
}

Write-Host ""
Write-Host "[3/4] Компиляция автономного Release APK через Gradle..." -ForegroundColor Yellow
Set-Location "android"
.\gradlew.bat assembleRelease --stacktrace
Set-Location $ProjectDir

Write-Host ""
Write-Host "[4/4] Поиск и сохранение готового APK..." -ForegroundColor Yellow
$apk = Get-ChildItem -Path "android\app\build\outputs\apk" -Filter "*.apk" -Recurse | Select-Object -First 1

if ($apk) {
    Copy-Item -Path $apk.FullName -Destination "$ProjectDir\Мои_Кэшбеки.apk" -Force
    Write-Host "[v] УСПЕШНО! Готовый файл: $ProjectDir\Мои_Кэшбеки.apk" -ForegroundColor Green
    explorer.exe /select,"$ProjectDir\Мои_Кэшбеки.apk"
} else {
    Write-Host "[X] APK файл не найден в папке сборки." -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "   Сборка завершена!" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
