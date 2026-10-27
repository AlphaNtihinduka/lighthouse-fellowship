// Adds what app.json can't express: settings that depend on the EAS build profile.
//
// There is no domain until phase 6, so test builds call the API over plain HTTP
// (http://<VPS_IP>:8099). Android blocks that in release builds unless cleartext traffic
// is allowed. It is allowed only for non-production builds; a store build
// (profile "production") never allows it (secrets-and-config-management, AGENTS.md).
module.exports = ({ config }) => {
  const allowHttp = process.env.EAS_BUILD_PROFILE !== 'production'
  return {
    ...config,
    plugins: [...(config.plugins ?? []), ['expo-build-properties', { android: { usesCleartextTraffic: allowHttp } }]],
  }
}
