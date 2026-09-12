const { AndroidConfig } = require("expo/config-plugins");
const devClientModule = require("expo-dev-client/app.plugin");
const withDevClient = devClientModule.default || devClientModule;

module.exports = function withAndroidRuntime(config) {
  // Apply the official dev-client plugin on a separate mods map and retain only
  // Android mods. Its run-once history also prevents Expo's automatic legacy
  // plugins from adding dev-client/launcher changes to iOS later in prebuild.
  const runtime = withDevClient({
    ...config,
    mods: { ...config.mods, ios: undefined }
  });
  config = {
    ...config,
    _internal: runtime._internal,
    mods: { ...config.mods, android: runtime.mods?.android }
  };

  // Google Sign-In Android autolinks normally; Expo's own Google Services mods
  // configure Firebase for FCM without installing Google's iOS config plugin.
  if (config.android?.googleServicesFile) {
    config = AndroidConfig.GoogleServices.withClassPath(config);
    config = AndroidConfig.GoogleServices.withApplyPlugin(config);
    config = AndroidConfig.GoogleServices.withGoogleServicesFile(config);
  }

  return config;
};
