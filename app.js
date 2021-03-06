const https = require('https');
const http = require('http');
const express = require("express");
const bodyParser = require("body-parser");
const res = require("express/lib/response");
const Promise = require('promise');
const distance = require('google-distance-matrix');
distance.key(process.env.MAP_API_KEY);
const app = express();
const router = express.Router();
const url = require('url');    

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

function filterWebhookRes(res)
{
	//console.log(res)
	var newData = {};
	if(res["template_key"]=="REQUEST_RECEIVED" && res["custom_fields"][0]["template_id"].split('_')[1]=="Pickup")
	{
		newData=res;
		console.log("New Pickup Order")
	}
	else if(res["template_key"]=="REQUEST_RECEIVED" && res["custom_fields"][0]["template_id"].split('_')[1]=="Delivery")
	{
		newData=res;

		console.log("New Delivery Order")
	}
	else if(res["template_key"]=="AGENT_STARTED" && res["custom_fields[0][template_id]"].split('_')[1]=="Pickup")
	{
		newData["job_id"]=res["job_id"]
		newData["order_id"]=res["order_id"]
		newData["started_datetime"]=res["started_datetime"]
		newData["job_state"]="Pickup Started"

		console.log("Pickup agent started")
	}
	else if(res["template_key"]=="AGENT_STARTED" && res["custom_fields[0][template_id]"].split('_')[1]=="Delivery")
	{
		newData["job_id"]=res["job_id"]
		newData["order_id"]=res["order_id"]
		newData["started_datetime"]=res["started_datetime"]
		newData["job_state"]="Delivery Started"
		console.log("Delivery agent started")
	}
	else if(res["template_key"]=="SUCCESSFUL" && res["custom_fields[0][template_id]"].split('_')[1]=="Pickup")
	{
		newData["job_id"]=res["job_id"]
		newData["order_id"]=res["order_id"]
		newData["completed_datetime"]=res["completed_datetime"]
		newData["job_state"]="Pickup Successful"
		console.log("Pickup SUCCESSFUL")
	}
	else if(res["template_key"]=="SUCCESSFUL" && res["custom_fields[0][template_id]"].split('_')[1]=="Delivery")
	{
		newData["job_id"]=res["job_id"]
		newData["order_id"]=res["order_id"]
		newData["completed_datetime"]=res["completed_datetime"]
		newData["job_state"]="Delivery Successful"
		console.log("Delivery SUCCESSFUL")
	}
	else if(res["template_key"]=="FAILED" && res["custom_fields[0][template_id]"].split('_')[1]=="Pickup")
	{
		newData["job_id"]=res["job_id"]
		newData["order_id"]=res["order_id"]
		newData["completed_datetime"]=res["arrived_datetime"]
		newData["job_state"]="Pickup Failed"
		console.log("Pickup FAILED")
	}
	else if(res["template_key"]=="FAILED" && res["custom_fields[0][template_id]"].split('_')[1]=="Delivery")
	{
		newData["job_id"]=res["job_id"]
		newData["order_id"]=res["order_id"]
		newData["completed_datetime"]=res["arrived_datetime"]
		newData["job_state"]="Delivery Failed"
		console.log("Delivery FAILED")
	}
	else if(res["template_key"]=="AGENT_ARRIVED" && res["custom_fields[0][template_id]"].split('_')[1]=="Delivery")
	{
		newData["job_id"]=res["job_id"]
		newData["order_id"]=res["order_id"]
		newData["arrived_datetime"]=res["arrived_datetime"]
		newData["job_state"]="Delivery Arrived"
		console.log("Delivery courier arrived")
	}

	return newData;
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
//TODO: Test performance when handling 1k concurrent webhooks
router.post('/push_webhook', async (request, response) => {
	
	var data = filterWebhookRes(request.body);

	//console.log("body" + JSON.stringify(request.body));
	for (var i = 0; i < db.length; i++) {
	
		try {

			//will throw error if url is not valid
			const myURL = new URL( db[i]);

			console.log("pushing webhook" +db[i]);
			await axios
			.post(db[i],  data)
			.then(res => {
	
				response.status(res.status);
				response.send(res.data);
			})
			.catch(error => {

				// if error , webhook url is invalid , no server is listening on it
				console.error(error)
				response.statusCode = 401;
				response.send(error);
			})

		  } catch (error) {
			console.log(`${Date().toString()}: ${error.input} is not a valid url`);
		  }

	}

});




app.use("/", router);

http.createServer(app).listen(80);
//https.createServer(options, app).listen(443);