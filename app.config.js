const pkg = require('./package.json');

module.exports = {
  expo: {
    name: 'Moonrakers',
    slug: 'moonrakers-app',
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
      eas: {
        projectId: '724b6832-956b-4116-aa20-24cc8b1f2d83'
      }
    }
  }
};
