'use-strict';

var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var cors = require('cors');
var Web3 = require('web3');
var web3 = new Web3();
var abi = require('./crowdsaleAbi.json');
var CryptoJS = require("crypto-js");
var CircularJSON = require('circular-json');
var keythereum = require('keythereum');
var fileSystem = require('fs');
var Tx = require('ethereumjs-tx');
var path = require('path');
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors());

const contractAddress = "0xBE86986ddc061F2d340Ab915ce5a7bc41F856604";

const contractInstance = new web3.eth.Contract(abi, contractAddress);
contractInstance.setProvider(new Web3.providers.HttpProvider("https://ropsten.infura.io/YmYCywDkCUPHIqNSA1vk"));
		 
// web3 provider
web3 = new Web3(new Web3.providers.HttpProvider("https://ropsten.infura.io/YmYCywDkCUPHIqNSA1vk"));


// Rest API for generating 

app.post('/api/v1/generatePrivateKey', (request, response) => {

	const token = request.body.token;

	const password = request.body.password;


	if (token == null) {
		response.json({ "status": "0", "message": "Please Provide Token", "EncryptedPrivateKey": "NULL" });
	}
	const account = web3.eth.accounts.create();
	const etherAddress = account.address;
	const privateKey = account.privateKey;

	const keyObject = web3.eth.accounts.encrypt(privateKey, password);
	//console.log(keyObject);
	const utcfile = keythereum.exportToFile(keyObject);

	const keystorePath=path.join(__dirname,utcfile);

	var arr = keystorePath.split("/");
	//console.log(arr);
	const fileName=arr[arr.length-1];
	
	const apiPath = "http://35.165.211.141:3002/api/v1/getUTCFile/"+fileName ;

	//console.log(privateKey);
	var EncryptedPrivateKey = CryptoJS.AES.encrypt(privateKey, token);
	var EncryptedPrivateKeyString = CircularJSON.stringify(EncryptedPrivateKey);

	if (EncryptedPrivateKey != null) {

		response.json({ "status": "1", "message": "Request Successfully","data":{ "EncryptedPrivateKey": EncryptedPrivateKeyString,"etherAddress": etherAddress , "keystorePath": keystorePath, "fileName":fileName, "apiPath":apiPath }});
	} else {
		response.json({ "status": "0", "message": "Request Failed", "data": {} });
	}

});

// Rest API for getting UTC file

app.get('/api/v1/getUTCFile/:fileName', (request, response)=>{

	var filePath = 'keystore/' + request.params.fileName;
	//console.log(filePath);
	var arr = filePath.split("/");
	//console.log(arr);
	const fileName = request.params.fileName;
	if(fileSystem.existsSync(filePath)) {
	var check = fileSystem.readFileSync(filePath);
        response.setHeader('Content-Type', 'application/json');
        response.setHeader('Content-Disposition', 'attachment; filename='+fileName);
        response.write(check, 'binary');
		response.end();
		//after sending... delete generated file
	}else{
		response.write("File not found");
        response.end();
	}
})

//  Rest API for checking Ether Balance

app.post('/api/v1/getEtherBalance', (request, response) => {


	const ether_address = request.body.etherAddress;
	if (web3.utils.isAddress(ether_address)) {
		const amount = web3.eth.getBalance(ether_address).then(function (amount) {
			response.json({ "status": "1", "message": "Request Successfully", "Balance": web3.utils.fromWei(amount, 'ether') });
		});

	} else {
		response.json({ "status": "0", "message": "Invalid Address", "Balance": null });

	}

});


// Rest API for checking LALA Balance
app.post('/api/v1/getLalaBalance', (request, response) => {

	const ether_address = request.body.etherAddress;
	if (web3.utils.isAddress(ether_address)) {
		//console.log(contractInstance);
		 contractInstance.methods.balanceOf(ether_address).call().then(function(res){
			response.json({ "status": "1", "message": "Request Successfully", "Balance":res });
		 });
	
	} else {
		response.json({ "status": "0", "message": "Request Failed", "Balance": null });

	}

});


// Rest API for sending ether 

app.post('/api/v1/sendEtherTransaction', (request, response) => {

	// const token = request.body.token;


	// if (token == null) {
	// 	response.json({ "status": "0", "message": "Please Provide Token", "from": null, "to": null, "amount": null, "EncryptedPrivateKeyString": null });
	// }


	const to = request.body.to;
	const amount = request.body.amount;
	 
	// const EncryptedPrivateKeyString = request.body.EncryptedPrivateKeyString;
	// const EncryptedPrivateKey = CircularJSON.parse(EncryptedPrivateKeyString);
	// const PrivateKey = CryptoJS.AES.decrypt(EncryptedPrivateKey, token);

	const privateKey = request.body.privateKey;
	//var privateKey = new Buffer(PrivateKey, 'hex')
	const addressObject = web3.eth.accounts.privateKeyToAccount(privateKey);
	const from = addressObject.address;

	const tx = {
		from: from,
		gas: "21000",
		to: to,
		value: amount 
	};

	web3.eth.accounts.signTransaction(tx, privateKey).then(function (res) {
		const rawtx = res.rawTransaction;

		web3.eth.sendSignedTransaction(rawtx)
			.once('receipt', function (receipt) {
				response.json({ "status": "1", "message": "Request Successfully", "data": receipt });
			}).on('error', function (error) { 
				response.json({ "status": "0", "message": "Request Failed", "data": null}); });

	});



});

// Rest API for Sending LALA token

app.post('/api/v1/sendLalaTransaction', (request, response) => {
	// const token = request.body.token;


	// if (token == null) {
	// 	response.json({ "status": "0", "message": "Please Provide Token", "from": null, "to": null, "amount": null, "EncryptedPrivateKeyString": null });
	// }

	//const from = request.body.from;
	const to = request.body.to;
	const amount = request.body.amount;
	// const EncryptedPrivateKeyString = request.body.EncryptedPrivateKeyString;
	// const EncryptedPrivateKey = CircularJSON.parse(EncryptedPrivateKeyString);
	// const PrivateKey = CryptoJS.AES.decrypt(EncryptedPrivateKey, token);
	// var privateKey = new Buffer(PrivateKey, 'hex')
	const privateKey = request.body.privateKey;
	const addressObject = web3.eth.accounts.privateKeyToAccount(privateKey);
	const from = addressObject.address;
	var encodedABI = contractInstance.methods.transfer(to, amount).encodeABI();
	var tx = {
		from: from,
		to: contractAddress,
		gas: 2000000,
		data: encodedABI
	  };
	  
	web3.eth.accounts.signTransaction(tx, privateKey).then(signed => {
		var tran = web3.eth.sendSignedTransaction(signed.rawTransaction);
	
		tran.on('receipt', receipt => {
			response.json({ "status": "1", "message": "Request Successfully", "data": receipt });
		});
	
		tran.on('error', error=>{
			response.json({ "status": "0", "message": "Request Failed", "data": null});
		});
	  });


});



const hostname = '0.0.0.0';
const port = 3002;

app.listen(port, hostname, () => {
	console.log(`server is running at http://${hostname}:${port}`);
})

