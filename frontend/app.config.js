const fs = require("node:fs");
const path = require("node:path");

module.exports = ({ config }) => {
  const googleServicesFile = process.env.GOOGLE_SERVICES_JSON || "./google-services.json";
  const hasGoogleServices = fs.existsSync(path.resolve(__dirname, googleServicesFile));

  // Do not produce an Android EAS build that can never register with FCM.
  if (process.env.EAS_BUILD_PLATFORM === "android" && !hasGoogleServices) {
    throw new Error("Android requires google-services.json. Set GOOGLE_SERVICES_JSON to an EAS file variable or place the Firebase Android file in frontend/google-services.json.");
  }

  if (hasGoogleServices && process.env.EAS_BUILD_PLATFORM === "android") {
    const firebase = JSON.parse(fs.readFileSync(path.resolve(__dirname, googleServicesFile), "utf8"));
    const matchesPackage = firebase.client?.some((client) =>
      client.client_info?.android_client_info?.package_name === config.android?.package);
    if (!firebase.project_info?.project_number || !matchesPackage) {
      throw new Error("google-services.json must be the Firebase Android app config for " + config.android?.package);
    }
  }

  return {
    ...config,
    android: {
      ...config.android,
      ...(hasGoogleServices ? { googleServicesFile } : {})
    },
    plugins: [
      ...(config.plugins || []).map((plugin) => plugin === "expo-notifications"
        ? ["expo-notifications", { defaultChannel: "default" }]
        : plugin),
      "./plugins/with-android-runtime"
    ]
  };
};
