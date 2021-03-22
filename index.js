'use strict';


var moment = require('moment');
var stringify = require('csv-stringify');
var Datastore = require('nedb');
var db = new Datastore();


const fs = require('fs');

let rawdata = fs.readFileSync('data.json');
let data = JSON.parse(rawdata);
let messages = data.messages;
let logins = {};
let sessions = [];
for (const i in messages){
	const message = messages[i];
	const content = message.content;
	const timestamp = moment(message.timestamp);
	console.log(content + " " + timestamp.format());
	
	if (content.includes(" connected ")){
		var name = content.split(" connected ")[0];
		logins[name] = timestamp;
	} else if (content.includes(" disconnected ")){
		var name = content.split(" disconnected ")[0];
		
		if(name in logins){
			var start = logins[name];
			var end = timestamp;
			var duration = moment.duration(end.diff(start));
			var session = {name: name, start: start, duration: duration};
			db.insert(session, (err, doc) => console.log('Inserted', doc.name, 'with ID', doc._id))
			sessions.push(session);
			delete logins[name]
		} else {
			console.log("Disconnect for " + name + " found with no connect. Skipping...")
		}
	} else if (content.includes(" stopping")){
		for ( const name in logins){
			var start = logins[name];
			var end = timestamp;
			var duration = moment.duration(end.diff(start));
			var session = {name: name, start: start, duration: duration};
			db.insert(session, (err, doc) => console.log('Inserted', doc.name, 'with ID', doc._id))
			sessions.push(session);
			delete logins[name];
		}
		logins = {};
	}
}


