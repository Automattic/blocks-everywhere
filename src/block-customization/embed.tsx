export default function customizeEmbed( settings ) {
	return {
		...settings,
		variations: settings.variations.filter( ( embed ) => wpBlocksEverywhere?.iso?.allowEmbeds.indexOf( embed.name ) !== -1 ),
	};
}