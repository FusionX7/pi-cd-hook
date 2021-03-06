var express = require('express');
var bodyParser = require('body-parser');
var app = express();
var exec = require('child_process').execSync;
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

app.post('/payload', async function (req, res) {
	res.sendStatus(200);
	//verify that the payload is a push from the correct repo
	//verify repository.name == 'wackcoon-device' or repository.full_name = 'DanielEgan/wackcoon-device'
	const pushedBranch = req.body.ref.toString().split('/').slice(-1)[0];

	await send(`<a href="${req.body.repository.html_url}">${req.body.repository.name}</a>
	<b>${req.body.pusher.name}</b> just pushed to <b>${req.body.ref}</b>
	<a href="${req.body.head_commit.url}">${req.body.head_commit.message}</a>`);
	if(pushedBranch === 'master' || pushedBranch === 'staging'){
		await send(`Deploying for branch ${pushedBranch}`);
		switch (req.body.repository.name) {
			case 'fusion-web':
				build(pushedBranch,WEB_DIR_SOURCE,copyAssets);
				break;
			case 'fusion-backend':
				build(pushedBranch,API_DIR_SOURCE);
				break;
			default:
				break;
		}
	}
});

app.listen(5000, function () {
	console.log('listening on port 5000')
});

async function build(branch, project_dir, afterBuildTask){
		executeSync(`git -C ${project_dir} fetch`);
		// reset any changes that have been made locally
		executeSync(`git -C ${project_dir} reset --hard`);
		executeSync(`git -C ${project_dir} checkout ${branch}`);
		// and ditch any files that have been added locally too
		executeSync(`git -C ${project_dir} clean -df`);
		// now pull down the latest
		await send(executeSync(`git -C ${project_dir} pull -f`));
		// and npm install with --production
		await send(executeSync(`yarn --cwd ${project_dir} install`));
		await send(executeSync(`yarn --cwd ${project_dir} test_ci`));
		await send(executeSync(`yarn --cwd ${project_dir} build`));
		afterBuildTask && afterBuildTask();
}
async function copyAssets(){
	try {
		await fsExtra.emptyDir(WEB_DIR_DIST)
	} catch (error) {
		send(error);
	}
	mv(WEB_DIR_SOURCE + '/build', WEB_DIR_DIST,async function(err) {
				if(err){
					send(err);
					return;
					}
				send('Deploy succeeded!')
			  });

			  
}

function send(msg){
	if(msg) return fetch(`https://api.telegram.org/bot1185907314:AAH4Q7wzTEY14jB4G7OVNRENNrbMm9kk7qA/sendMessage?chat_id=903764018&disable_web_page_preview=1&parse_mode=HTML&text=${encodeURIComponent(msg)}`)
}

function executeSync(command, options){
	try {
		const output = exec(command, {encoding: 'utf8',...options});
		return output.toString();
	} catch (error) {
		if(command.includes('test_ci')) send(`<b>Tests failed!</b>`);
		else send(error.message);
		throw new Error();
	}
}
