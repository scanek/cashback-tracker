import Constants from 'expo-constants';

export const APP_VERSION = Constants.expoConfig?.version || '1.8.0';
export const APP_BUILD = Constants.expoConfig?.android?.versionCode?.toString() || '18';
export const APP_NAME = 'Мои Кэшбеки';
export const APP_AUTHOR = 'Александр Щеголев';
export const APP_DEDICATION = 'Сделано для своей любимой жены Светик ❤️';
export const APP_RELEASE_STRING = `Версия ${APP_VERSION} (Сборка ${APP_BUILD})`;
