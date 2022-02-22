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

async function listenWebhook() {
	// webhook

	const dbRef = firestore.collection('customers');
	const observer = dbRef.onSnapshot(docSnapshot => {
		console.log(docSnapshot.data());

	}, err => {
		console.log(`Encountered error: ${err}`);
	});

}


async function getAllWebhooks() {
	const customersRef = firestore.collection('customers');
	const snapshot = await customersRef.get();
	if (snapshot.empty) {
		console.log('No matching documents.');
		return;
	} else {
		snapshot.forEach(async doc => {
			console.log(doc.id, '=>', doc.data()["webhook_url"]);
			return;
		});
	}
}

// refresh webhook db whenever theres a change in firestore
function updateWebhookDB() {
	//listenWebhook()
	//getAllWebhooks()
}

updateWebhookDB();


app.use(bodyParser.urlencoded({
	extended: false
}));
app.use(bodyParser.json());


//courrio get order API
router.get('/webhook', async (request, response) => {
console.log("triggered");

	response.status(200);
	response.send("triggered");

});




app.use("/", router);

http.createServer(app).listen(80);
//https.createServer(options, app).listen(443);