var express = require('express');
var bodyParser = require('body-parser');
var app = express();
var exec = require('child_process').exec;
const mv = require('mv');
const fsExtra = require('fs-extra');
const fetch = require("node-fetch");
const WEB_DIR_SOURCE = '/home/pi/projects/fusion-web'
const API_DIR_SOURCE = '/home/pi/projects/fusion-backend'
const WEB_DIR_DIST = '/var/www/html'

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.htm');
	console.log('get /');
});

app.get('/payload', function (req, res) {
    res.sendStatus(200);
	console.log('get /payload');
});

app.post('/payload', function (req, res) {
	//verify that the payload is a push from the correct repo
	//verify repository.name == 'wackcoon-device' or repository.full_name = 'DanielEgan/wackcoon-device'
	console.log(req.body.pusher.name + ' just pushed to ' + req.body.repository.name);

	console.log('pulling code from GitHub...');
	switch (req.body.repository.name) {
		case 'fusion-web':
			build(WEB_DIR_SOURCE,copyAssets);
			break;
		case 'fusion-backend':
			build(API_DIR_SOURCE);
			break;
		default:
			break;
	}

});

app.listen(5000, function () {
	console.log('listening on port 5000')
});
function execCallback(err, stdout, stderr) {
	if(stdout) send(stdout);
	if(stderr) send(stderr);
}

function build(project_dir){
		// reset any changes that have been made locally
		exec(`git -C ${project_dir} reset --hard`, execCallback);

		// and ditch any files that have been added locally too
		exec(`git -C ${project_dir} clean -df`, execCallback);
		// now pull down the latest
		exec(`git -C ${project_dir} pull -f`, execCallback);
	
		// and npm install with --production
		exec(`yarn --cwd ${project_dir} install`, execCallback);
		exec(`yarn --cwd ${project_dir} test`, execCallback);
		exec(`yarn --cwd ${project_dir} build`, copyAssets || execCallback);
		// and run tsc
		// exec('tsc', execCallback);
}
function copyAssets(err, stdout, stderr){
	if(!err || !stderr){
		send(stderr);
	}
	fsExtra.emptyDirSync(WEB_DIR_DIST);
			mv(WEB_DIR_SOURCE + '/build', WEB_DIR_DIST, {mkdirp: true}, function(err) {
				console.log(err)
				// done. it first created all the necessary directories, and then
				// tried fs.rename, then falls back to using ncp to copy the dir
				// to dest and then rimraf to remove the source dir
			  });
			  send(stdout);
			  send('Build seccessful!')
}

function send(msg){
	fetch(`https://api.telegram.org/bot1185907314:AAH4Q7wzTEY14jB4G7OVNRENNrbMm9kk7qA/sendMessage?chat_id=903764018&disable_web_page_preview=1&parse_mode=Markdown&text=${encodeURIComponent(msg)}`)
}