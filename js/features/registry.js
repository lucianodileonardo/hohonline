/**
 * Feature registry.
 *
 * To add a new feature:
 *   1. Add its <section class="feature-panel" id="..."> to index.html
 *   2. Create js/features/<name>.js that calls SantaFeatures.register({...})
 *   3. Include the script in index.html (before js/main.js)
 *
 * Features with `comingSoon: true` show as a teaser card only.
 */
window.SantaFeatures = (function () {
  const features = [];

  return {
    register(feature) {
      features.push(feature);
    },
    all() {
      return features.slice();
    },
  };
})();
