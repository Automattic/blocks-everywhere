export default {
    name: 'topicUsers',
    className: 'editor-autocompleters__user',
    triggerPrefix: '@',

    options: function() {
        const seen = [];
        const users = [];

        document.querySelectorAll('.topic > .bbp-topic-author, .topic > .bbp-reply-author').forEach(function (element) {
            let avatar = element.querySelector('img').src;
            let name = element.querySelector('.bbp-author-name').innerText;
            let slugElement = element.querySelector('.bbp-user-nicename');
            let slug = slugElement ? slugElement.innerText.replace(/[(@)]/g, '') : name;

            if (!seen.includes(slug)) {
                seen.push(slug);
                users.push({
                    avatar: avatar,
                    name: name,
                    slug: slug
                });
            }
        });

        return users;
    },
    getOptionKeywords: function( user ) {
        return [ user.slug ].concat( user.name.split( /\s+/ ) );
    },
    getOptionLabel: function( user ) {
        return wp.element.concatChildren( [
            wp.element.createElement(
                'img',
                {
                    className: 'editor-autocompleters__user-avatar',
                    src: user.avatar
                }
            ),
            wp.element.createElement(
                'span',
                {
                    className: 'editor-autocompleters__user-name'
                },
                user.name
            ),
            wp.element.createElement(
                'span',
                {
                    className: 'editor-autocompleters__user-slug'
                },
                user.slug
            )
        ] );
    },
    getOptionCompletion: function( user ) {
        return `@${ user.slug } `;
    },
};
