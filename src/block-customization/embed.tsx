export default function customizeEmbed( settings ) {
	return {
		...settings,
		transforms: {
			...settings.transforms,
			from: wpBlocksEverywhere?.allowUrlEmbed ? settings.transforms.from : [],
		},
		variations: settings.variations.filter( ( embed ) => wpBlocksEverywhere?.iso?.allowEmbeds.indexOf( embed.name ) !== -1 ),
	};
}