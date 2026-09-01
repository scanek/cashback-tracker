const fs = require('fs');
const path = require('path');
const { spawnSync, execSync } = require('child_process');

console.log('========================================================');
console.log('   Сборка автономного Android APK (Мои Кэшбеки)');
console.log('========================================================\n');

const projectRoot = path.resolve(__dirname, '..');
process.chdir(projectRoot);

// 1. Resolve JAVA_HOME
let javaHome = process.env.JAVA_HOME;
if (!javaHome || !fs.existsSync(javaHome)) {
  const defaultJdk = 'C:\\Program Files\\Microsoft\\jdk-17.0.20.101-hotspot';
  if (fs.existsSync(defaultJdk)) {
    javaHome = defaultJdk;
    process.env.JAVA_HOME = defaultJdk;
    process.env.PATH = `${path.join(defaultJdk, 'bin')};${process.env.PATH}`;
  }
}

// 2. Resolve ANDROID_HOME
let androidHome = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
if (!androidHome || !fs.existsSync(androidHome)) {
  const localAppData = process.env.LOCALAPPDATA || '';
  const standardSdk = path.join(localAppData, 'Android', 'Sdk');
  if (fs.existsSync(standardSdk)) {
    androidHome = standardSdk;
    process.env.ANDROID_HOME = standardSdk;
    process.env.PATH = `${path.join(standardSdk, 'platform-tools')};${path.join(standardSdk, 'cmdline-tools', 'latest', 'bin')};${process.env.PATH}`;
  }
}

if (!process.env.GRADLE_USER_HOME) {
  process.env.GRADLE_USER_HOME = 'C:\\.gradle';
}

console.log('[1/4] Проверка окружения...');
console.log(`  Java JDK:     ${javaHome || 'Не найдена (будет использована системная java)'}`);
if (androidHome && fs.existsSync(androidHome)) {
  console.log(`  Android SDK:  ${androidHome}`);
} else {
  console.log('  Android SDK:  Не найден в стандартной папке AppData\\Local\\Android\\Sdk');
  console.log('\n  [!] Для локальной компиляции на компьютере требуется Android SDK.');
  console.log('      Установите Android Studio (https://developer.android.com/studio).');
  console.log('      Либо скачивайте готовый APK с GitHub Releases (собирается в облаке бесплатно!).\n');
}

// 3. Run Expo Prebuild
console.log('[2/4] Генерация нативного Android проекта (Expo Prebuild)...');
const prebuild = spawnSync(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['expo', 'prebuild', '--platform', 'android', '--clean'],
  { stdio: 'inherit', shell: true }
);

if (prebuild.status !== 0) {
  console.error('\n[X] Ошибка на этапе expo prebuild.');
  process.exit(1);
}

// Write local.properties if Android SDK found
if (androidHome && fs.existsSync(androidHome)) {
  const localPropertiesPath = path.join(projectRoot, 'android', 'local.properties');
  const escapedSdk = androidHome.replace(/\\/g, '/');
  fs.writeFileSync(localPropertiesPath, `sdk.dir=${escapedSdk}\n`);
}

// 4. Run Gradle Build
console.log('\n[3/4] Компиляция Release APK через Gradle...');
const gradlewCmd = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
const androidDir = path.join(projectRoot, 'android');

const gradle = spawnSync(
  path.join(androidDir, gradlewCmd),
  ['assembleRelease', '--stacktrace'],
  {
    cwd: androidDir,
    stdio: 'inherit',
    shell: true,
  }
);

if (gradle.status !== 0) {
  console.error('\n[X] Ошибка при сборке APK через Gradle.');
  if (!androidHome) {
    console.error('    Причина: на компьютере не установлен Android SDK.');
    console.error('    Решение 1: Установите Android Studio (https://developer.android.com/studio)');
    console.error('    Решение 2: Скачивайте готовый APK из GitHub Releases (https://github.com/scanek/cashback-tracker/releases)');
  }
  process.exit(1);
}

// 5. Locate generated APK
console.log('\n[4/4] Сохранение готового файла...');
const apkOutputDir = path.join(androidDir, 'app', 'build', 'outputs', 'apk');

function findApk(dir) {
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      const found = findApk(fullPath);
      if (found) return found;
    } else if (file.endsWith('.apk')) {
      return fullPath;
    }
  }
  return null;
}

const foundApk = findApk(apkOutputDir);
const targetApk = path.join(projectRoot, 'Мои_Кэшбеки.apk');

if (foundApk) {
  fs.copyFileSync(foundApk, targetApk);
  console.log(`\n[v] УСПЕШНО! Готовый файл: ${targetApk}`);
  console.log('========================================================');
  console.log('   Сборка завершена! Можно устанавливать на телефон.');
  console.log('========================================================\n');

  if (process.platform === 'win32') {
    try {
      execSync(`explorer /select,"${targetApk}"`);
    } catch {}
  }
} else {
  console.error('[X] APK файл не найден в папке outputs.');
}
