const https = require('https');
var moment = require('moment-timezone');
const momentDefault = require('moment');
const http = require('http');
const express = require("express");
const bodyParser = require("body-parser");
const res = require("express/lib/response");
const Promise = require('promise');
const distance = require('google-distance-matrix');
distance.key(process.env.MAP_API_KEY);
const app = express();
const router = express.Router();

const axios = require('axios');

const {
	Firestore
} = require('@google-cloud/firestore');

// Create a new client
const firestore = new Firestore();
var db = [];

async function getAllWebhooks() {
	db = [];

	const webhookRef = firestore.collection('webhooks_db').doc('rbeKL9vwy412M1k7adr6');
	const doc = await webhookRef.get();
	if (!doc.exists) {
	console.log('No such document!');
	} else {
		//console.log('Document data:', doc.data());
		for (var i = 0; i < doc.data()["db"].length; i++) {
			console.log(doc.data()["db"][i]["webhook_url"]);
			db.push(doc.data()["db"][i]["webhook_url"]);
		}
	}
}


async function generateWebhookDB() {
	var db = [];
	const customersRef = firestore.collection('customers');
	const snapshot = await customersRef.get();
	if (snapshot.empty) {
		console.log('No matching documents.');
		return;
	} else {
		snapshot.forEach(async doc => {
			console.log(doc.id, '=>', doc.data()["webhook_url"]);
			db.push({"webhook_url":doc.data()["webhook_url"],"api_key":doc.data()["api_key"]})
			return;
		});

		createWebhooks(db);
	}
}

async function createWebhooks(db) {

	const res = await firestore.collection('webhooks_db').add({
		db
	});
  
  }

//generateWebhookDB();
getAllWebhooks();

app.use(bodyParser.urlencoded({
	extended: false
}));
app.use(bodyParser.json());


//update webhook db 
router.post('/webhook', async (request, response) => {
	console.log("updating webhook db");
	getAllWebhooks();

	response.status(200);
	response.send("updating webhook db");

});

//pushing webhook
router.post('/push_webhook', async (request, response) => {

	for (var i in db) {
		console.log("pushing webhook" + db["webhook_url"]);
		await axios
		.post(db["webhook_url"], {
			"data": response.body
		})
		.then(res => {

			response.status(res.status);
			response.send(res.data);
		})
		.catch(error => {
			console.error(error)
			response.statusCode = 401;
			response.send(error);
		})
	}

	response.status(200);
	response.send("triggered");

});


app.use("/", router);

http.createServer(app).listen(80);
//https.createServer(options, app).listen(443);