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
});

app.get('/payload', function (req, res) {
    res.sendStatus(200);
});

app.post('/payload', function (req, res) {
	res.sendStatus(200);
	//verify that the payload is a push from the correct repo
	//verify repository.name == 'wackcoon-device' or repository.full_name = 'DanielEgan/wackcoon-device'
	const pushedBranch = req.body.ref.toString().split('/').slice(-1)[0];

	send(`<a href="${req.body.repository.html_url}">${req.body.repository.name}</a>
	<b>${req.body.pusher.name}</b> just pushed to <b>${req.body.ref}</b>
	<a href="${req.body.head_commit.url}">${req.body.head_commit.message}</a>`);
	if(pushedBranch !== 'master' && pushedBranch !== 'staging') return;
	switch (req.body.repository.name) {
		case 'fusion-web':
			build(branch,WEB_DIR_SOURCE,copyAssets);
			break;
		case 'fusion-backend':
			build(branch,API_DIR_SOURCE);
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

function build(branch, project_dir, afterBuildTask){
		exec(`git -C ${project_dir} checkout ${branch}`, execCallback);
		// reset any changes that have been made locally
		exec(`git -C ${project_dir} reset --hard`, execCallback);

		// and ditch any files that have been added locally too
		exec(`git -C ${project_dir} clean -df`, execCallback);
		// now pull down the latest
		exec(`git -C ${project_dir} pull -f`, execCallback);
	
		// and npm install with --production
		exec(`yarn --cwd ${project_dir} install`, execCallback);
		exec(`yarn --cwd ${project_dir} test`, execCallback);
		exec(`yarn --cwd ${project_dir} build`, afterBuildTask || execCallback);
		// and run tsc
		// exec('tsc', execCallback);
}
async function copyAssets(err, stdout, stderr){
	if(err || stderr){
		send(err || stderr);
	}
	await fsExtra.emptyDir(WEB_DIR_DIST).catch(err=>{
		send(err);
	});
			mv(WEB_DIR_SOURCE + '/build', WEB_DIR_DIST, function(err) {
				if(err){
					send(err);
					return;
					}
				// done. it first created all the necessary directories, and then
				// tried fs.rename, then falls back to using ncp to copy the dir
				// to dest and then rimraf to remove the source dir
				send(stdout);
				send('Build seccessful!')
			  });

			  
}

function send(msg){
	fetch(`https://api.telegram.org/bot1185907314:AAH4Q7wzTEY14jB4G7OVNRENNrbMm9kk7qA/sendMessage?chat_id=903764018&disable_web_page_preview=1&parse_mode=HTML&text=${encodeURIComponent(msg)}`)
}