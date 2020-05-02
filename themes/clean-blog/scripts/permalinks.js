'use strict';

const _ = require('lodash');

// I want to divide posts in folders by year but don't want that in the URL
hexo.extend.filter.register('post_permalink', function(data){
    var removedYearDirectory = data.replace(/(\d+\/\d+)\/\d+(\/.*)/, '$1$2');
    return removedYearDirectory;
});

// Make NodeJS act as if I'm in UTC, even on my development machine
hexo.extend.filter.register('after_init', function(){
    process.env.TZ = 'UTC';
});