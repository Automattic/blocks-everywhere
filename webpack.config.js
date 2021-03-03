const defaultConfig = require( '@wordpress/scripts/config/webpack.config' );

module.exports = {
	...defaultConfig,
	resolve: {
		...defaultConfig.resolve,
//		symlinks: false,
	},
};
