'use strict';

const _ = require('lodash');
const fs = require('hexo-fs');

hexo.extend.generator.register('root-images', function (locals) {

    return fs.listDir('images').then(function (files) {
        return _.map(files, function (relativePath) {
            return {
                path: 'images/' + relativePath,
                data: function () {
                    return fs.createReadStream('images/' + relativePath);
                }
            };
        });
    });
});