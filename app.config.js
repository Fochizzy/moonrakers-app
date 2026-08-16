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
    // Typographic apostrophe on purpose. Expo writes this straight into
    // `strings.xml` with no Android escaping, and AAPT2 rejects an unescaped
    // ASCII `'` in a string resource. U+2019 has no special meaning there and
    // renders identically.
    name: 'Moonraker’s Analytics',
    slug: 'moonrakers-app',
    owner: 'fochizzy',
    version: pkg.version,
    orientation: 'portrait',
    userInterfaceStyle: 'automatic',
    scheme: 'moonrakers',
    icon: APP_ICON_PATH,
    // OTA updates: JS-only fixes ship straight to installed builds through EAS
    // Update. appVersion policy means each store release (1.0.2, 1.0.3, ...) is
    // its own update target, so an update never lands on an incompatible binary.
    runtimeVersion: {
      policy: 'appVersion'
    },
    updates: {
      url: 'https://u.expo.dev/2393165c-d58c-4414-8f95-c09d72a274cc'
    },
    plugins: [
      'expo-router',
      'expo-secure-store',
      'expo-sharing',
      'expo-status-bar',
      'expo-web-browser',
      [
        'expo-build-properties',
        {
          android: {
            // API 36 is required for Play submissions from 2026-08-31. Expo SDK 54
            // supplies the AGP/toolchain for 36, so this only needs the level bump.
            compileSdkVersion: 36,
            targetSdkVersion: 36,
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
