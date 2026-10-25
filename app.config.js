// Extends app.json. When EXPO_BASE_URL is set (the GitHub Pages build sets it
// to "/cdj-sim"), the web export is served from that sub-path.
module.exports = ({ config }) => {
  const baseUrl = process.env.EXPO_BASE_URL;
  if (!baseUrl) return config;
  return {
    ...config,
    experiments: { ...config.experiments, baseUrl },
  };
};
