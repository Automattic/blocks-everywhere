const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const defaultConfig = require( '@wordpress/scripts/config/webpack.config' );

// Default @wordpress/scripts but output with .min in the filename
module.exports = {
	...defaultConfig,
	output: {
		...defaultConfig.output,
		filename: '[name].min.js',
	},
	plugins: [
		...defaultConfig.plugins.filter( item => !( item instanceof MiniCssExtractPlugin ) ),
		new MiniCssExtractPlugin( { filename: 'style.min.css' } ),
	]
};
