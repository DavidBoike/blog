'use strict';

const nunjucks = require('nunjucks');
const env = new nunjucks.Environment();
const pathFn = require('path');
const fs = require('fs');

env.addFilter('uriencode', function(str) {
  return encodeURI(str);
});

env.addFilter('noControlChars', function(str) {
  return str.replace(/[\x00-\x1F\x7F]/g, '');
});

let feedConfig = {
  path: 'feed.xml',
  limit: 20,
  content: true,
  content_limit: 140,
  content_limit_delim: ''
};

let tmplSrc = pathFn.join(__dirname, '../layout/atom.xml');
let template = nunjucks.compile(fs.readFileSync(tmplSrc, 'utf8'), env);

hexo.extend.generator.register('feed', function(locals) {
  var config = this.config;

  var posts = locals.posts.sort('-date');
  posts = posts.filter(function(post) {
    return post.draft !== true;
  });

  if (feedConfig.limit) posts = posts.limit(feedConfig.limit);

  var url = config.url;
  if (url[url.length - 1] !== '/') url += '/';

  var xml = template.render({
    config: config,
    feedConfig: feedConfig,
    url: url,
    posts: posts,
    feed_url: config.root + feedConfig.path
  });

  return {
    path: feedConfig.path,
    data: xml
  };
});