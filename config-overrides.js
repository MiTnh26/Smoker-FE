module.exports = function override(config, env) {
  // Fix source-map-loader issues with MUI
  config.module.rules = config.module.rules.map(rule => {
    if (rule.enforce === 'pre' && rule.use && Array.isArray(rule.use)) {
      const hasSourceMapLoader = rule.use.some(use => {
        const loader = typeof use === 'string' ? use : (use.loader || '');
        return loader.includes('source-map-loader');
      });
      
      if (hasSourceMapLoader) {
        return {
          ...rule,
          exclude: [
            ...(Array.isArray(rule.exclude) ? rule.exclude : rule.exclude ? [rule.exclude] : []),
            /node_modules\/@mui/,
          ],
        };
      }
    }
    return rule;
  });

  return config;
};

