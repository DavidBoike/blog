'use strict';

const _ = require('lodash');
const moment = require('moment');
const siteUrl = 'https://www.make-awesome.com';

hexo.extend.generator.register('sitemap', function (locals) {

    let posts = _(locals.posts.toArray())
        .filter(post => post.sitemap !== false)
        .orderBy('updated', 'desc')
        .map(post => {

            var lastmod = post.lastUpdated || post.date;

            if(moment.isMoment(lastmod)) {
                lastmod = lastmod.utc().format();
            }

            return {
                loc: post.permalink,
                lastmod: lastmod,
                changefreq: 'monthly',
                priority: 0.6
            };
        })
        .value();

    let pages = _(locals.pages.toArray())
        .reject(page => {
            return page.sitemap === false ||
                (!page.layout || page.layout === 'false');
        })
        .orderBy('updated', 'desc')
        .map(page => {
            return {
                loc: page.permalink,
                lastmod: page.updated.utc().format(),
                changefreq: 'weekly',
                priority: 0.8
            };
        })
        .value();

    let homepage = {
        loc: siteUrl,
        changefreq: 'weekly',
        priority: 0.8
    };

    let entries = _.flatten([homepage, posts, pages]);

    let data = '<?xml version="1.0" encoding="UTF-8"?>\n' +
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    _.each(entries, entry => {
        data += ' <url>\n';
        _.each(entry, (value, key) => {
            data += '  <' + key + '>' + value + '</' + key + '>\n';
        });
        data += ' </url>\n';
    });

    data += '</urlset>';

    return {
        path: 'sitemap.xml',
        data: data
    };

});