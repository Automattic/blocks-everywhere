/**
 * Internal dependencies
 */
import { getBootstrapSettingsSummary } from '../bootstrap-settings';

export default function customizeEmbed( settings ) {
	// Block registration is page-global, so embed transforms/variations use the
	// aggregate bootstrap settings summary rather than one editor instance.
	const bootstrapSettings = getBootstrapSettingsSummary();

	return {
		...settings,
		transforms: {
			...settings.transforms,
			from: bootstrapSettings.allowUrlEmbed ? settings.transforms.from : [],
		},
		variations: settings.variations.filter( ( embed ) => bootstrapSettings.allowEmbeds.includes( embed.name ) ),
	};
}
