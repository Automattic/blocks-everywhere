const getBootstrapSettings = () => ( typeof wpBlocksEverywhere !== 'undefined' ? wpBlocksEverywhere : null );

const getServerBootstrapSettings = () => {
	const settings = window.wpBlocksEverywhereSettings;
	return settings && typeof settings === 'object' ? settings : {};
};

const bootstrapSettingsRegistry = new Map< string, typeof wpBlocksEverywhere >();

const getBootstrapSettingKeys = ( settings: typeof wpBlocksEverywhere, explicitKey?: string ) => {
	return [
		explicitKey,
		settings?.blocksEverywhere?.settingsKey,
		settings?.blocksEverywhere?.contextId,
		settings?.blocksEverywhere?.context,
		settings?.saveTextarea,
	]
		.map( ( key ) => ( typeof key === 'string' ? key.trim() : '' ) )
		.filter( ( key, index, keys ) => key && keys.indexOf( key ) === index );
};

export const registerBootstrapSettings = ( key: string, settings: typeof wpBlocksEverywhere ) => {
	if ( ! settings ) {
		return null;
	}

	getBootstrapSettingKeys( settings, key ).forEach( ( settingKey ) => {
		bootstrapSettingsRegistry.set( settingKey, settings );
	} );

	return settings;
};

registerBootstrapSettings( 'default', getBootstrapSettings() );
Object.entries( getServerBootstrapSettings() ).forEach( ( [ key, settings ] ) => {
	registerBootstrapSettings( key, settings as typeof wpBlocksEverywhere );
} );

export const getRegisteredBootstrapSettings = () => Array.from( new Set( bootstrapSettingsRegistry.values() ) );

export const getBootstrapSetting = ( key = 'default' ) => bootstrapSettingsRegistry.get( key ) ?? null;

export const getBootstrapSettingsSummary = () => {
	const settings = getRegisteredBootstrapSettings();

	return {
		allowUrlEmbed: settings.some( ( setting ) => setting?.allowUrlEmbed ),
		allowEmbeds: Array.from(
			new Set( settings.flatMap( ( setting ) => setting?.blocksEverywhere?.allowEmbeds ?? [] ) )
		),
		allowHeading: settings.some( ( setting ) =>
			( setting?.blocksEverywhere?.blocks?.allowBlocks ?? [] ).includes( 'core/heading' )
		),
		hasBbpressEditor: settings.some( ( setting ) => setting?.editorType === 'bbpress' ),
		pastePlainText: settings.some( ( setting ) => setting?.pastePlainText ),
		patchEmoji: settings.some( ( setting ) => setting?.patchEmoji ),
		replaceParagraphCode: settings.some( ( setting ) => setting?.replaceParagraphCode ),
	};
};
