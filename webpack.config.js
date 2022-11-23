const MiniCssExtractPlugin = require( 'mini-css-extract-plugin' );
const defaultConfig = require( '@wordpress/scripts/config/webpack.config' );

// Default @wordpress/scripts but output with .min in the filename
module.exports = {
	...defaultConfig,
	output: {
		...defaultConfig.output,
		filename: '[name].min.js',
	},
	entry: {
		index: './src/index.js',
		[ 'support-content-editor' ]: './src/support-content-block/index.tsx',
		[ 'support-content-view' ]: './src/support-content-block/view.ts',
	},
	plugins: [
		...defaultConfig.plugins.filter( ( item ) => ! ( item instanceof MiniCssExtractPlugin ) ),
		new MiniCssExtractPlugin( { filename: '[name].min.css' } ),
	],
};
