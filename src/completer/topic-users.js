export default {
    name: 'topicUsers',
    className: 'editor-autocompleters__user',
    triggerPrefix: '@',

    options: function() {
        return wpBlocksEverywhere.topicUsers || [];
    },
    getOptionKeywords: function( user ) {
        return user.nicename.split( /\s+/ );
    },
    getOptionLabel: function( user ) {
        return wp.element.concatChildren( [
            wp.element.createElement(
                'img',
                {
                    className: 'editor-autocompleters__user-avatar',
                    src: user.avatarUrl
                }
            ),
            wp.element.createElement(
                'span',
                {
                    className: 'editor-autocompleters__user-name'
                },
                user.nicename
            ),
        ] );
    },
    getOptionCompletion: function( user ) {
        return `@${ user.nicename } `;
    },
};
