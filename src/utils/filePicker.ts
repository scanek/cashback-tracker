import { Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';

/**
 * Cross-platform file picker for reading JSON or text files.
 * Works seamlessly across Web, Android, and iOS without leaking DOM references.
 */
export async function pickJsonOrTextFile(): Promise<string | null> {
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,application/json,text/plain';
      input.style.display = 'none';
      document.body.appendChild(input);

      input.onchange = (e: any) => {
        const file = e.target?.files?.[0];
        if (!file) {
          document.body.removeChild(input);
          resolve(null);
          return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
          document.body.removeChild(input);
          resolve((event.target?.result as string) || null);
        };
        reader.onerror = () => {
          document.body.removeChild(input);
          resolve(null);
        };
        reader.readAsText(file);
      };

      input.click();
    });
  }

  // Native (Android / iOS)
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/json', 'text/plain', '*/*'],
      copyToCacheDirectory: true,
    });

    if (!result.canceled && result.assets && result.assets[0]) {
      const fileUri = result.assets[0].uri;
      const content = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      return content || null;
    }
  } catch (error) {
    console.error('File pick error:', error);
    return null;
  }
  return null;
}
