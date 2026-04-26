const pkg = require('./package.json');
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? null;
const supabasePublishableKey =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? null;

module.exports = {
  expo: {
    name: 'Moonrakers',
    slug: 'moonrakers-app',
    owner: 'fochizzy',
    version: pkg.version,
    orientation: 'portrait',
    userInterfaceStyle: 'automatic',
    scheme: 'moonrakers',
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
      package: 'com.fochizzy87.moonrakers'
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
