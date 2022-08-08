const CracoLessPlugin = require('craco-less');

module.exports = {
  plugins: [
    {
      plugin: CracoLessPlugin,
      options: {
        lessLoaderOptions: {
          lessOptions: {
            modifyVars: { 
                // '@primary-color': 'red',
                // '@btn-ghost-bg': '#f0f000',
            },
            javascriptEnabled: true,
          },
        },
      },
    },
  ],
};