module.exports = function(grunt) {
    require('time-grunt')(grunt);
    require('load-grunt-tasks')(grunt);

    var assetHashes;

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        clean: {
            webapp: ['.tmp', 'out/hashwick-server'],
        },
        typescript: {
            server: {
                src: ['hashwick-server/server.ts'],
                dest: 'out',
                options: {
                    module: 'commonjs',
                    noImplicitAny: true,
                }
            },
            webapp: {
                src: ['hashwick-webapp/app.ts'],
                dest: '.tmp',
                options: {
                    module: 'commonjs',
                    noImplicitAny: true,
                }
            }
        },
        browserify: {
            webapp: {
                src: '.tmp/hashwick-webapp/app.js',
                dest: '.tmp/hashwick-webapp/app.js',
            }
        },
        shell: {
            compactWebapp: {
                command: 'node deploy/shortenModuleNames.js .tmp/hashwick-webapp/app.js'
            }
        },
        uglify: {
            webapp: {
                files: {
                    '.tmp/hashwick-server/static/compiled/app.js': '.tmp/hashwick-webapp/app.js',
                }
            }
        },
        stylus: {
            webapp: {
                options: {
                    use: [require('nib')],
                },
                files: {
                    '.tmp/hashwick-server/static/compiled/theme.bwhite.css': 'hashwick-webapp/theme.bwhite.styl',
                    '.tmp/hashwick-server/static/compiled/theme.bnight.css': 'hashwick-webapp/theme.bnight.styl',
                }
            }
        },
        cachebuster: {
            webapp: {
                options: {
                    basedir: '.tmp/hashwick-server',
                    length: 16,
                    complete: function (hashes) { return assetHashes = hashes; }
                },
                src: ['.tmp/hashwick-server/static/compiled/**'],
                dest: 'out/hashwick-server/assets.json',
            }
        },
        copy: {
            webappFiles: {
                files: [{
                    expand: true,
                    cwd: 'hashwick-server/templates',
                    src: '**',
                    dest: 'out/hashwick-server/templates',
                }, {
                    expand: true,
                    cwd: 'hashwick-server/static',
                    src: '**',
                    dest: 'out/hashwick-server/static',
                    filter: function (src) { return src.indexOf('compiled') === -1; },
                }]
            },
            webappAssets: {
                files: [{
                    expand: true,
                    cwd: '.tmp/hashwick-server',
                    src: 'static/compiled/**',
                    dest: 'out/hashwick-server/',
                    rename: function (dest, src) {
                        if (src in assetHashes)
                            src = src.replace(/^(.+?\/)?([^\/]+?)(\.[^.\/]+?)?$/,
                                '$1' + assetHashes[src] + '$3');
                        return dest + src;
                    }
                }]
            }
        }
    });

    grunt.registerTask('build-webapp', [
        'clean:webapp',
        'typescript:server',
        'typescript:webapp',
        'browserify:webapp',
        'shell:compactWebapp',
        'uglify:webapp',
        'stylus:webapp',
        'copy:webappFiles',
        'cachebuster:webapp',
        'copy:webappAssets',
    ]);
};
