/**
 * WordPress dependencies
 */
import { addFilter } from '@wordpress/hooks';

type BbPressAdapterOptions = {
	container: HTMLElement;
	settings: typeof wpBlocksEverywhere;
	textarea: HTMLTextAreaElement;
	services: EditorServices;
	serviceContext: EditorServiceContext;
	scopedApiFetch: ( options: Record< string, unknown > ) => Promise< unknown >;
	notifyService: (
		services: EditorServices,
		type: string,
		message: string,
		context: EditorServiceContext,
		details?: unknown
	) => void;
};

type EditorServiceContext = {
	container?: HTMLElement;
	editorType?: string;
	mode?: 'inline' | 'full-height' | 'modal' | 'compact';
	settings: typeof wpBlocksEverywhere;
	textarea?: HTMLTextAreaElement;
};

type EditorAutosaveService =
	| ( ( payload: Record< string, unknown >, context: EditorServiceContext ) => unknown )
	| {
			delay?: number;
			save?: ( payload: Record< string, unknown >, context: EditorServiceContext ) => unknown;
			cancel?: ( context: EditorServiceContext ) => void;
	  }
	| null;

type EditorNoticeService =
	| ( ( type: string, message: string, context: EditorServiceContext, details?: unknown ) => void )
	| {
			error?: ( message: string, context: EditorServiceContext, details?: unknown ) => void;
			success?: ( message: string, context: EditorServiceContext, details?: unknown ) => void;
			warning?: ( message: string, context: EditorServiceContext, details?: unknown ) => void;
			info?: ( message: string, context: EditorServiceContext, details?: unknown ) => void;
	  }
	| null;

type EditorPermissionsService = {
	can?: ( capability: string, context: EditorServiceContext ) => boolean | undefined;
	canUploadMedia?: boolean | ( ( context: EditorServiceContext ) => boolean | undefined );
} | null;

type EditorServices = {
	apiFetch?: ( options: Record< string, unknown > ) => Promise< unknown >;
	apiFetchMiddleware?: ( options: Record< string, unknown >, next: Function ) => unknown;
	apiFetchMiddlewares?: Array< ( options: Record< string, unknown >, next: Function ) => unknown >;
	autosave?: EditorAutosaveService;
	fetchLinkSuggestions?: ( search: string, searchOptions?: Record< string, unknown > ) => Promise< unknown >;
	mediaUpload?: Function | null;
	notices?: EditorNoticeService;
	permissions?: EditorPermissionsService;
};

let hasInstalledAutocompleteCompatibilityFilter = false;

function installAutocompleteCompatibilityFilter( settings: typeof wpBlocksEverywhere ) {
	if ( hasInstalledAutocompleteCompatibilityFilter || ! settings?.autocompleter ) {
		return;
	}

	// bbPress surfaces provide their own mention completers. The Gutenberg
	// default queries post authors via /wp/v2/users, which is not the right
	// suggestion set for forum topics/replies.
	addFilter(
		'editor.Autocomplete.completers',
		'blocks-everywhere/bbpress-strip-default-users-completer',
		( completers = [] ) => completers.filter( ( completer ) => completer.name !== 'users' )
	);

	hasInstalledAutocompleteCompatibilityFilter = true;
}

function getElementValue( element: Element | null ): string {
	return element && 'value' in element ? String( element.value || '' ) : '';
}

function getNumericElementValue( element: Element | null ): number {
	const numberValue = Number( getElementValue( element ) );
	return Number.isFinite( numberValue ) && numberValue >= 0 ? numberValue : 0;
}

function hasAnyDraftContent( draft: Record< string, unknown > ): boolean {
	return Boolean( String( draft?.content || '' ).trim() ) || Boolean( String( draft?.title || '' ).trim() );
}

function isEffectivelyEmptyBlockContent( value: unknown ): boolean {
	const content = String( value || '' ).trim();
	if ( ! content ) {
		return true;
	}

	const normalized = content
		.replace( /<!--\s+wp:paragraph\s+-->/g, '' )
		.replace( /<!--\s+\/wp:paragraph\s+-->/g, '' )
		.replace( /<p>(?:\s|&nbsp;|&#160;|<br\s*\/?>)*<\/p>/gi, '' )
		.replace( /\s+/g, '' );

	return normalized === '';
}

export function createBbPressAdapter( {
	container,
	settings,
	textarea,
	services,
	serviceContext,
	scopedApiFetch,
	notifyService,
}: BbPressAdapterOptions ) {
	const bbpress = settings?.bbpress || {};
	const isTopicEdit = Boolean( bbpress?.isTopicEdit );
	const isReplyEdit = Boolean( bbpress?.isReplyEdit );
	const topicId = bbpress?.topicId ? Number( bbpress.topicId ) : 0;
	const draftEndpoint = bbpress?.draftEndpoint || null;
	const mediaEndpoint = bbpress?.mediaEndpoint || settings?.blocksEverywhere?.mediaUploadEndpoint || null;
	const cleanupCallbacks: Array< () => void > = [];
	const draftRequestControllers = new Set< AbortController >();
	const hasInjectedAutosaveService = Object.prototype.hasOwnProperty.call( services, 'autosave' );
	const injectedAutosave = services?.autosave;

	let currentForumId = bbpress?.forumId ? Number( bbpress.forumId ) : 0;
	let autosaveTimer: ReturnType< typeof setTimeout > | null = null;
	let lastSavedPayload: string | null = null;
	let lastSerializedContent = '';
	let isSubmitting = false;
	let isContextSwitching = false;

	const configuredNonce = settings?.restNonce || window?.wpApiSettings?.nonce || null;
	const restHeaders = configuredNonce ? { 'X-WP-Nonce': configuredNonce } : {};

	const requestDraft = async ( method: string, payload?: Record< string, unknown > | null ) => {
		const controller = new AbortController();
		draftRequestControllers.add( controller );

		const restRoot = settings?.restUrl || window?.wpApiSettings?.root || null;
		if ( ! draftEndpoint && ! restRoot ) {
			throw new Error( 'Draft endpoint not configured.' );
		}

		const url = draftEndpoint ? new URL( draftEndpoint ) : new URL( restRoot as string );
		if ( ( method === 'DELETE' || method === 'GET' ) && payload && typeof payload === 'object' ) {
			Object.keys( payload ).forEach( ( key ) => {
				if ( payload[ key ] === undefined || payload[ key ] === null ) {
					return;
				}
				url.searchParams.set( key, String( payload[ key ] ) );
			} );
		}

		try {
			if ( services?.apiFetch || services?.apiFetchMiddleware || services?.apiFetchMiddlewares ) {
				return scopedApiFetch( {
					url: url.toString(),
					method,
					signal: controller.signal,
					headers: {
						...restHeaders,
						'Content-Type': 'application/json',
					},
					body:
						method === 'DELETE' || method === 'GET'
							? undefined
							: payload
							? JSON.stringify( payload )
							: undefined,
				} );
			}

			const response = await window.fetch( url.toString(), {
				method,
				credentials: 'same-origin',
				signal: controller.signal,
				headers: {
					...restHeaders,
					'Content-Type': 'application/json',
				},
				body:
					method === 'DELETE' || method === 'GET'
						? undefined
						: payload
						? JSON.stringify( payload )
						: undefined,
			} );

			if ( ! response.ok ) {
				throw new Error( 'Draft request failed.' );
			}

			return response.json();
		} finally {
			draftRequestControllers.delete( controller );
		}
	};

	const isTopicDraft = () => {
		if ( settings?.editorType !== 'bbpress' || isTopicEdit ) {
			return false;
		}

		return Boolean( textarea?.name === 'bbp_topic_content' || document.getElementById( 'bbp_topic_title' ) );
	};

	const isReplyDraft = () => {
		if ( settings?.editorType !== 'bbpress' || isReplyEdit ) {
			return false;
		}

		return Boolean( textarea?.name === 'bbp_reply_content' ) && topicId > 0;
	};

	const getTopicTitle = () => getElementValue( document.getElementById( 'bbp_topic_title' ) );
	const getForumIdFromDom = () => getNumericElementValue( document.getElementById( 'bbp_forum_id' ) );
	const getReplyToFromDom = () =>
		getNumericElementValue(
			textarea?.closest?.( 'form' )?.querySelector?.( 'input[name="bbp_reply_to"]' ) || null
		);

	const buildDraftPayload = ( contentOverride: string | null = null, forumIdOverride: number | null = null ) => {
		const content = typeof contentOverride === 'string' ? contentOverride : textarea?.value || '';

		if ( isReplyDraft() ) {
			return {
				type: 'reply',
				topic_id: topicId,
				reply_to: getReplyToFromDom(),
				content,
			};
		}

		if ( isTopicDraft() ) {
			const resolvedForumId = forumIdOverride !== null ? Number( forumIdOverride ) : currentForumId;
			return {
				type: 'topic',
				forum_id: resolvedForumId,
				title: getTopicTitle(),
				content,
			};
		}

		return null;
	};

	const getAutosaveDelay = () => {
		if ( injectedAutosave && typeof injectedAutosave === 'object' && typeof injectedAutosave.delay === 'number' ) {
			return injectedAutosave.delay;
		}

		return 800;
	};

	const saveWithInjectedAutosave = async ( payload: Record< string, unknown > ) => {
		if ( ! injectedAutosave ) {
			return;
		}

		if ( typeof injectedAutosave === 'function' ) {
			await injectedAutosave( payload, serviceContext );
			return;
		}

		await injectedAutosave.save?.( payload, serviceContext );
	};

	const shouldAutorestoreDraft = () => {
		if ( ! textarea ) {
			return false;
		}

		const hasContent = ! isEffectivelyEmptyBlockContent( textarea.value || '' );
		if ( hasContent ) {
			return false;
		}

		if ( isTopicDraft() ) {
			return getTopicTitle().trim() === '';
		}

		return isReplyDraft();
	};

	const clearAutosaveTimer = () => {
		if ( autosaveTimer ) {
			clearTimeout( autosaveTimer );
			autosaveTimer = null;
		}
	};

	const abortDraftRequests = () => {
		draftRequestControllers.forEach( ( controller ) => controller.abort() );
	};

	return {
		get mediaEndpoint() {
			return mediaEndpoint;
		},
		scheduleAutosave( serializedContent: unknown ) {
			if ( isSubmitting || isContextSwitching ) {
				return;
			}

			lastSerializedContent = typeof serializedContent === 'string' ? serializedContent : '';
			if ( hasInjectedAutosaveService ) {
				if ( injectedAutosave === null ) {
					return;
				}

				const draft = buildDraftPayload( lastSerializedContent );
				const payload = draft || {
					content: lastSerializedContent,
					editorType: settings?.editorType || '',
					textareaName: textarea?.name || '',
				};
				const payloadString = JSON.stringify( payload );

				if ( payloadString === lastSavedPayload ) {
					return;
				}

				clearAutosaveTimer();

				autosaveTimer = setTimeout( async () => {
					if ( isSubmitting || isContextSwitching ) {
						return;
					}

					try {
						await saveWithInjectedAutosave( payload );
						lastSavedPayload = payloadString;
					} catch ( error ) {
						if ( error?.name === 'AbortError' ) {
							return;
						}

						notifyService( services, 'error', 'Autosave failed.', serviceContext, error );
						// eslint-disable-next-line no-console
						console.error( 'Blocks Everywhere: injected autosave failed', error );
					}
				}, getAutosaveDelay() );
				return;
			}

			const draft = buildDraftPayload( lastSerializedContent );
			if ( ! draft || ! hasAnyDraftContent( draft ) ) {
				return;
			}

			const payloadString = JSON.stringify( draft );
			if ( payloadString === lastSavedPayload ) {
				return;
			}

			clearAutosaveTimer();

			autosaveTimer = setTimeout( async () => {
				if ( isSubmitting || isContextSwitching ) {
					return;
				}

				try {
					await requestDraft( 'POST', draft );
					lastSavedPayload = payloadString;
				} catch ( error ) {
					if ( error?.name === 'AbortError' ) {
						return;
					}
					// eslint-disable-next-line no-console
					console.error( 'Blocks Everywhere: bbPress draft autosave failed', error );
				}
			}, 800 );
		},
		async restoreDraftIfNeeded() {
			if ( ! shouldAutorestoreDraft() ) {
				return;
			}

			try {
				if ( isTopicDraft() ) {
					const response = await requestDraft( 'GET', {
						type: 'topic',
						forum_id: getForumIdFromDom(),
						prefer_unassigned: true,
					} );
					const draft = response?.draft;
					if ( ! draft ) {
						return;
					}

					const titleInput = document.getElementById( 'bbp_topic_title' );
					if ( titleInput && 'value' in titleInput && String( titleInput.value || '' ).trim() === '' ) {
						titleInput.value = String( draft?.title || '' );
					}

					if ( isEffectivelyEmptyBlockContent( textarea.value || '' ) ) {
						textarea.value = String( draft?.content || '' );
						lastSerializedContent = textarea.value;
					}
					return;
				}

				if ( isReplyDraft() && topicId ) {
					const response = await requestDraft( 'GET', {
						type: 'reply',
						topic_id: topicId,
						reply_to: getReplyToFromDom(),
					} );
					const draft = response?.draft;
					if ( ! draft ) {
						return;
					}

					if ( isEffectivelyEmptyBlockContent( textarea.value || '' ) ) {
						textarea.value = String( draft?.content || '' );
						lastSerializedContent = textarea.value;
					}
				}
			} catch ( error ) {
				if ( error?.name === 'AbortError' ) {
					return;
				}
				// eslint-disable-next-line no-console
				console.error( 'Blocks Everywhere: failed to restore bbPress draft', error );
			}
		},
		installHandlers() {
			installAutocompleteCompatibilityFilter( settings );

			if ( isTopicDraft() ) {
				const forumSelect = document.getElementById( 'bbp_forum_id' );
				if ( forumSelect && ! forumSelect.__blocksEverywhereDraftMoveInstalled ) {
					forumSelect.__blocksEverywhereDraftMoveInstalled = true;
					currentForumId = getForumIdFromDom();

					const titleInput = document.getElementById( 'bbp_topic_title' );
					if ( titleInput && ! titleInput.__blocksEverywhereDraftTitleInstalled ) {
						titleInput.__blocksEverywhereDraftTitleInstalled = true;
						const titleHandler = () => {
							this.scheduleAutosave( lastSerializedContent || textarea?.value || '' );
						};

						titleInput.addEventListener( 'input', titleHandler );
						cleanupCallbacks.push( () => {
							titleInput.removeEventListener( 'input', titleHandler );
							delete titleInput.__blocksEverywhereDraftTitleInstalled;
						} );
					}

					const forumHandler = async () => {
						if ( isSubmitting ) {
							return;
						}

						const nextForumId = getForumIdFromDom();
						const previousForumId = currentForumId;
						currentForumId = nextForumId;

						if ( previousForumId !== 0 || nextForumId <= 0 ) {
							return;
						}

						const draft = buildDraftPayload( lastSerializedContent || null, nextForumId );
						if ( ! draft || ! hasAnyDraftContent( draft ) ) {
							return;
						}

						try {
							await requestDraft( 'POST', draft );
							await requestDraft( 'DELETE', { type: 'topic', forum_id: 0 } );
							lastSavedPayload = JSON.stringify( draft );
						} catch ( error ) {
							if ( error?.name === 'AbortError' ) {
								return;
							}
							// eslint-disable-next-line no-console
							console.error( 'Blocks Everywhere: failed to move forum draft', error );
						}
					};

					forumSelect.addEventListener( 'change', forumHandler );
					cleanupCallbacks.push( () => {
						forumSelect.removeEventListener( 'change', forumHandler );
						delete forumSelect.__blocksEverywhereDraftMoveInstalled;
					} );
				}
			}

			if ( container && ! container.__blocksEverywhereDraftSubmitInstalled ) {
				const form = container.closest( 'form' );
				if ( form ) {
					container.__blocksEverywhereDraftSubmitInstalled = true;
					const submitHandler = ( event ) => {
						if ( event.submitter && event.submitter.closest( '.blocks-everywhere-editor' ) ) {
							return;
						}

						isSubmitting = true;
						clearAutosaveTimer();
						abortDraftRequests();
					};

					form.addEventListener( 'submit', submitHandler );
					cleanupCallbacks.push( () => {
						form.removeEventListener( 'submit', submitHandler );
						delete container.__blocksEverywhereDraftSubmitInstalled;
					} );
				}
			}

			if ( isReplyDraft() && container && ! container.__blocksEverywhereReplyDraftContextInstalled ) {
				container.__blocksEverywhereReplyDraftContextInstalled = true;

				const replyContextHandler = async ( event ) => {
					if ( ! event?.detail || event.detail.type !== 'reply' ) {
						return;
					}

					const eventTopicId = event.detail.topicId ? Number( event.detail.topicId ) : 0;
					if ( ! eventTopicId || eventTopicId !== topicId || isSubmitting ) {
						return;
					}

					const previousReplyTo = event.detail.previousReplyTo ? Number( event.detail.previousReplyTo ) : 0;
					const nextReplyTo = event.detail.nextReplyTo ? Number( event.detail.nextReplyTo ) : 0;

					if ( previousReplyTo === nextReplyTo ) {
						return;
					}

					isContextSwitching = true;
					clearAutosaveTimer();
					abortDraftRequests();

					try {
						const outgoingContent = String( lastSerializedContent || textarea?.value || '' );
						if ( outgoingContent.trim() ) {
							const outgoingPayload = {
								type: 'reply',
								topic_id: topicId,
								reply_to: previousReplyTo,
								content: outgoingContent,
							};
							await requestDraft( 'POST', outgoingPayload );
							lastSavedPayload = JSON.stringify( outgoingPayload );
						}

						lastSerializedContent = '';
						lastSavedPayload = null;

						const incoming = await requestDraft( 'GET', {
							type: 'reply',
							topic_id: topicId,
							reply_to: nextReplyTo,
						} );

						const incomingDraft = incoming?.draft;
						const incomingContent =
							incomingDraft && String( incomingDraft?.content || '' ).trim()
								? String( incomingDraft.content )
								: '';

						textarea?.__blocksEverywhereContentApi?.replaceContent( incomingContent );
						textarea.value = incomingContent;
						lastSerializedContent = incomingContent;
					} catch ( error ) {
						if ( error?.name === 'AbortError' ) {
							return;
						}
						// eslint-disable-next-line no-console
						console.error( 'Blocks Everywhere: failed to switch reply draft context', error );
					} finally {
						isContextSwitching = false;
					}
				};

				document.addEventListener( 'blocksEverywhere:bbpressDraftContextChange', replyContextHandler );
				cleanupCallbacks.push( () => {
					document.removeEventListener( 'blocksEverywhere:bbpressDraftContextChange', replyContextHandler );
					delete container.__blocksEverywhereReplyDraftContextInstalled;
				} );
			}
		},
		async uploadMedia( file: File ) {
			const formData = new FormData();
			formData.append( 'file', file );
			formData.append( 'context', 'content_embed' );
			if ( topicId ) {
				formData.append( 'target_id', String( topicId ) );
			}

			const uploadNonce = settings?.restNonce || window?.wpApiSettings?.nonce || null;
			const headers = uploadNonce ? { 'X-WP-Nonce': uploadNonce } : undefined;

			if ( ! mediaEndpoint ) {
				throw new Error( 'Media endpoint not configured.' );
			}

			const response = await window.fetch( new URL( mediaEndpoint, window.location.origin ).toString(), {
				method: 'POST',
				credentials: 'same-origin',
				headers,
				body: formData,
			} );

			if ( ! response.ok ) {
				let errorMessage = 'Upload failed.';
				try {
					const payload = await response.json();
					if ( payload?.message ) {
						errorMessage = payload.message;
					}
				} catch ( error ) {
					// Keep the generic fallback message when the error body is not JSON.
				}
				throw new Error( errorMessage );
			}

			return response.json();
		},
		cleanup() {
			clearAutosaveTimer();

			if ( injectedAutosave && typeof injectedAutosave === 'object' ) {
				injectedAutosave.cancel?.( serviceContext );
			}

			abortDraftRequests();
			cleanupCallbacks.forEach( ( cleanup ) => cleanup() );
		},
	};
}
