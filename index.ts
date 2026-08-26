import { registerRootComponent } from 'expo';
import { Platform } from 'react-native';
import App from './App';

// Register Android Home Screen Widget Background Task
if (Platform.OS === 'android') {
  try {
    const { registerWidgetTaskHandler } = require('react-native-android-widget');
    const { widgetTaskHandler } = require('./src/widgets/widget-task-handler');
    registerWidgetTaskHandler(widgetTaskHandler);
  } catch (e) {
    console.warn('Failed to register widget task handler:', e);
  }
}

registerRootComponent(App);
