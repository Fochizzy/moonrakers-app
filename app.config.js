const pkg = require('./package.json');

const DEFAULT_SUPABASE_URL = 'https://znpzawotdmkcdjpwjkds.supabase.co';
const DEFAULT_SUPABASE_PUBLISHABLE_KEY =
  'sb_publishable_U657t2wc1r6ParKopa6F8A_mp0VZFxW';
const APP_ICON_PATH = './assets/icon.png';

function resolveEnvString(value, fallback) {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : fallback;
}

const supabaseUrl = resolveEnvString(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  DEFAULT_SUPABASE_URL
);
const supabasePublishableKey = resolveEnvString(
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  DEFAULT_SUPABASE_PUBLISHABLE_KEY
);

module.exports = {
  expo: {
    name: 'Moonrakers',
    slug: 'moonrakers-app',
    owner: 'fochizzy',
    version: pkg.version,
    orientation: 'portrait',
    userInterfaceStyle: 'automatic',
    scheme: 'moonrakers',
    icon: APP_ICON_PATH,
    plugins: [
      'expo-router',
      'expo-secure-store',
      [
        'expo-build-properties',
        {
          android: {
            compileSdkVersion: 35,
            targetSdkVersion: 35,
            minSdkVersion: 24
          }
        }
      ]
    ],
    android: {
      package: 'com.fochizzy.moonrakers',
      adaptiveIcon: {
        foregroundImage: APP_ICON_PATH,
        backgroundColor: '#02030A'
      }
    },
    extra: {
      EXPO_PUBLIC_SUPABASE_URL: supabaseUrl,
      EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: supabasePublishableKey,
      eas: {
        projectId: '2393165c-d58c-4414-8f95-c09d72a274cc'
      }
    }
  }
};
