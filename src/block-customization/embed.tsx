export default function customizeEmbed( settings ) {
	return {
		...settings,
		transforms: {
			...settings.transforms,
			from: wpBlocksEverywhere?.allowUrlEmbed ? settings.transforms.from : [],
		},
		variations: settings.variations.filter(
			( embed ) => wpBlocksEverywhere?.blocksEverywhere?.allowEmbeds.indexOf( embed.name ) !== -1
		),
	};
}
