var gulp = require('gulp');

// Tools
var del = require('del');
var connect = require('gulp-connect');
var run = require('gulp-run-sequence');
var plumber = require('gulp-plumber');
var flatten = require('gulp-flatten');
var ftp = require('vinyl-ftp');
var args = require('yargs').argv;

// Compilation
var coffee = require('gulp-coffee');
var sass = require('gulp-sass');
var jade = require('gulp-jade');
var autoprefixer = require('gulp-autoprefixer');
var wiredep = require('wiredep').stream;

// Optimization
var minifyCss = require('gulp-minify-css');
var minifyJs = require('gulp-uglify');
var minifyImages = require('gulp-imagemin');
var rev = require('gulp-rev');
var usemin = require('gulp-usemin');

// Config
var paths = {
    views: 'src/**/*.jade',
    scripts: 'src/**/*.coffee',
    styles: 'src/**/*.scss',
    images: 'src/**/*.{png,jpeg,jpg,svg}',
    fonts: 'src/**/*.{otf,eot,svg,ttf,woff,woff2}',
    bower_fonts: 'bower_components/**/*.{otf,eot,svg,ttf,woff,woff2}',
    tmp: '.tmp',
    dest: '.dst'
};
var ports = {
    tmp: 21000,
    dest: 21001
};

// Compilation
gulp.task('clean', function () {
    del.sync(paths.tmp);
    del.sync(paths.dest);
});
gulp.task('scripts', function () {
    return gulp.src(paths.scripts)
        .pipe(plumber())
        .pipe(coffee())
        .pipe(gulp.dest(paths.tmp))
        .pipe(connect.reload());
});
gulp.task('styles', function () {
    return gulp.src(paths.styles)
        .pipe(plumber())
        .pipe(sass().on('error', sass.logError))
        .pipe(autoprefixer())
        .pipe(gulp.dest(paths.tmp))
        .pipe(connect.reload());
});
gulp.task('views', function () {
    return gulp.src(paths.views)
        .pipe(plumber())
        .pipe(jade({
            pretty: true
        }))
        .pipe(wiredep())
        .pipe(gulp.dest(paths.tmp))
        .pipe(connect.reload());
});
gulp.task('compile', function (cb) {
    run('clean', [
        'scripts',
        'styles',
        'views'
    ], cb);
});

// Fonts
gulp.task('fonts-tmp', function () {
    return gulp.src(paths.fonts)
        .pipe(gulp.dest(paths.tmp));
});
gulp.task('bower-fonts-dest', function () {
    return gulp.src(paths.bower_fonts)
        .pipe(flatten())
        .pipe(gulp.dest(paths.dest + '/fonts'));
});
gulp.task('fonts-dest', ['bower-fonts-dest'], function () {
    return gulp.src(paths.fonts)
        .pipe(gulp.dest(paths.dest));
});

// Images
gulp.task('images-tmp', function () {
    return gulp.src(paths.images)
        .pipe(gulp.dest(paths.tmp));
});
gulp.task('images-dest', function () {
    return gulp.src(paths.images)
        .pipe(minifyImages())
        .pipe(gulp.dest(paths.dest));
});

// Optimize
gulp.task('optimize', function() {
    return gulp.src(paths.tmp + '/**/index.html')
        .pipe(plumber())
        .pipe(usemin({
            css: [minifyCss(), 'concat'],
            js: [minifyJs(), rev()]
        }))
        .pipe(gulp.dest(paths.dest));
});

// Executable Tasks
gulp.task('build', ['compile', 'fonts-dest', 'images-dest'], function () {
    return gulp.src(paths.tmp + '/**/*.html')
        .pipe(plumber())
        .pipe(usemin({
            css: [minifyCss(), 'concat'],
            js: [minifyJs(), rev()]
        }))
        .pipe(gulp.dest(paths.dest));
});
gulp.task('serve', ['compile', 'fonts-tmp', 'images-tmp'], function () {
    // Add watches
    gulp.watch(paths.scripts, ['scripts']);
    gulp.watch(paths.styles, ['styles']);
    gulp.watch(paths.views, ['views']);

    // Connect to server
    connect.server({
        root: [paths.tmp, './'],
        port: ports.tmp,
        livereload: true
    });
});
gulp.task('serve-dest', ['build'], function () {
    // Connect to server
    connect.server({
        root: paths.dest,
        port: ports.dest
    });
});
gulp.task('deploy', ['build'], function () {
    // Deploy to ftp folder
    var conn = ftp.create({
        host: args.host,
        user: args.username,
        password: args.password
    });

    return gulp.src(paths.dest + '/**/*.*')
        .pipe(conn.newer('/domains/mjr.io/public_html/slides'))
        .pipe(conn.dest('/domains/mjr.io/public_html/slides'))
});

// Default Task
gulp.task('default', [
    'serve'
]);