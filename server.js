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
var bitcore = require('bitcore-lib');
var bitcoinTransaction = require('bitcoin-transaction');
var bitcoinjs = require('bitcoinjs-lib');
const Client = require('bitcoin-core');
const client = new Client({ network: 'regtest' });
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors());

const contractAddress = "0xBE86986ddc061F2d340Ab915ce5a7bc41F856604";

const contractInstance = new web3.eth.Contract(abi, contractAddress);
contractInstance.setProvider(new Web3.providers.HttpProvider("https://ropsten.infura.io/GyP8bkVWxmY9FNvv7IlJ"));

// web3 provider
web3 = new Web3(new Web3.providers.HttpProvider("https://ropsten.infura.io/GyP8bkVWxmY9FNvv7IlJ"));


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
	//console.log(privateKey);

	const keyObject = web3.eth.accounts.encrypt(privateKey, password);

	//console.log(keyObject);
	const utcfile = keythereum.exportToFile(keyObject);

	const keystorePath = path.join(__dirname, utcfile);

	var arr = keystorePath.split("/");
	//console.log(arr);
	const fileName = arr[arr.length - 1];

	const apiPath = "http://35.165.211.141:3002/api/v1/getUTCFile/" + fileName;

	//console.log(privateKey);
	const EncryptedPrivateKey = CryptoJS.AES.encrypt(privateKey, token);
	//console.log(EncryptedPrivateKey);
	const EncryptedPrivateKeyString = EncryptedPrivateKey.toString();
	//console.log(EncryptedPrivateKeyString);
	// const t= CircularJSON.parse(EncryptedPrivateKeyString);
	// const u= CryptoJS.AES.decrypt(t,token);
	// console.log("anurag");
	// console.log(u.toString(CryptoJS.enc.Utf8));

	if (EncryptedPrivateKey != null) {

		response.json({ "status": "1", "message": "Request Successfully", "data": { "EncryptedPrivateKey": EncryptedPrivateKeyString.replace(/ /g, ''), "keyObject": keyObject, "etherAddress": etherAddress, "fileName": fileName, "apiPath": apiPath } });
	} else {
		response.json({ "status": "0", "message": "Request Failed", "data": {} });
	}

});

// Rest API for getting UTC file

app.get('/api/v1/getUTCFile/:fileName', (request, response) => {

	var filePath = 'keystore/' + request.params.fileName;
	//console.log(filePath);
	var arr = filePath.split("/");
	//console.log(arr);
	const fileName = request.params.fileName;
	if (fileSystem.existsSync(filePath)) {
		var check = fileSystem.readFileSync(filePath);
		response.setHeader('Content-Type', 'application/json');
		response.setHeader('Content-Disposition', 'attachment; filename=' + fileName);
		response.write(check, 'binary');
		response.end();
		//after sending... delete generated file
	} else {
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
		contractInstance.methods.balanceOf(ether_address).call().then(function (res) {
			response.json({ "status": "1", "message": "Request Successfully", "Balance": res });
		});

	} else {
		response.json({ "status": "0", "message": "Request Failed", "Balance": null });

	}

});

// Rest API for sending ether 

app.post('/api/v1/sendEtherTransaction', (request, response) => {

	const to = request.body.to;
	const amount = request.body.amount;
	const password = request.body.password;
	const keyObject = request.body.keyObject;

	const privateKey = web3.eth.accounts.decrypt(keyObject, password).privateKey;

	const addressObject = web3.eth.accounts.privateKeyToAccount(privateKey);

	const from = addressObject.address;

	web3.eth.getTransactionCount(from, 'pending')
		.then(function (count) {
			//console.log(count);
			const tx = {
				from: from,
				gas: "300000",
				to: to,
				value: amount,
				nonce: count
			};

			web3.eth.accounts.signTransaction(tx, privateKey).then(function (res) {
				//console.log(res);
				const rawtx = res.rawTransaction;
				// console.log(rawtx);
				web3.eth.sendSignedTransaction(rawtx)
					.once('transactionHash', function (hash) {
						response.json({ "status": "1", "message": "Request Successfully", "txnHash": hash });
					})

			});
		});





});

// Rest API for Sending LALA token

app.post('/api/v1/sendLalaTransaction', (request, response) => {


	const to = request.body.to;
	const amount = request.body.amount;
	const password = request.body.password;
	const keyObject = request.body.keyObject;
	const privateKey = web3.eth.accounts.decrypt(keyObject, password).privateKey;

	const addressObject = web3.eth.accounts.privateKeyToAccount(privateKey);
	const from = addressObject.address;
	var encodedABI = contractInstance.methods.transfer(to, amount).encodeABI();


	web3.eth.getTransactionCount(from, 'pending')
		.then(function (count) {

			var tx = {
				from: from,
				to: contractAddress,
				gas: 2000000,
				data: encodedABI,
				nonce:count
			};

			web3.eth.accounts.signTransaction(tx, privateKey).then(signed => {
				var tran = web3.eth.sendSignedTransaction(signed.rawTransaction);

				tran.once('transactionHash', function (hash) {
					response.json({ "status": "1", "message": "Request Successfully", "txnHash": hash });
				});

				tran.on('error', error => {
					response.json({ "status": "0", "message": "Request Failed", "data": null });
				});
			});

		});


});

// Rest API to get Reciept 
app.post('/api/v1/getRecieptUsingTxnHash', (request, response) => {
	const txnHash = request.body.txnHash;

	web3.eth.getTransactionReceipt(txnHash)
		.then(function (reciept) {

			web3.eth.getBlockNumber().then(function (blockNumber) {
				const confirmationNumber = blockNumber - reciept.blockNumber;
				if (reciept == null) {
					response.json({ "status": "0", "message": "Your Transaction is Pending", "data": null });

				} else {
					response.json({ "status": "1", "message": "Request Successfully", "data": { "reciept": reciept, "confirmationNumber": confirmationNumber } });

				}
			})


		});
});

// Rest API for importing PrivateKey

app.post('/api/v1/importPrivateKey', (request, response) => {

	const token = request.body.token;

	if (token == null) {
		response.json({ "status": "0", "message": "Please Provide Token", "data": "NULL" });
	}

	const password = request.body.password;
	const EncryptedPrivateKeyString = request.body.EncryptedPrivateKeyString;
	const bytes = CryptoJS.AES.decrypt(EncryptedPrivateKeyString, token);
	const privateKey = bytes.toString(CryptoJS.enc.Utf8);

	const addressObject = web3.eth.accounts.privateKeyToAccount(privateKey);
	const keyObject = web3.eth.accounts.encrypt(privateKey, password);

	if (keyObject != null) {
		response.json({ "status": "1", "message": "Request Successfully", "data": { "keyObject": keyObject, "etherAddress": addressObject.address } });

	} else {
		response.json({ "status": "0", "message": "Request Failed", "data": {} });

	}



});


// Rest API for importing UTC file

app.post('/api/v1/importUTCFile', (request, response) => {

	const keyObject = request.body.keyObject;

	if (!keyObject) {
		response.json({ "status": "0", "message": "Please Provide UTC Content" });

	}
	const password = request.body.password;
	const privateKey = web3.eth.accounts.decrypt(keyObject, password).privateKey;
	const addressObject = web3.eth.accounts.privateKeyToAccount(privateKey);

	if (privateKey != null) {

		response.json({ "status": "1", "message": "Request Successfully", "data": { "keyObject": keyObject, "etherAddress": addressObject.address } });

	} else {
		response.json({ "status": "0", "message": "Request Failed", "data": {} });

	}



});


// Rest API for Generating Bitcoin Address

app.post('/api/v1/generateBitcoinKeys', (request, response) => {
	const password = request.body.password;
	const privateKey = new bitcore.PrivateKey();
	const address = privateKey.toAddress().toString();
	console.log(privateKey);
	const EncryptedPrivateKey = CryptoJS.AES.encrypt(privateKey.toWIF(), password);
	const EncryptedPrivateKeyString = EncryptedPrivateKey.toString();

	if (address != null) {
		response.json({ "status": "1", "message": "Request Successfully", "data": { "EncryptedPrivateKey": EncryptedPrivateKeyString, "bitcoinAddress": address } });
	} else {
		response.json({ "status": "0", "message": "Request Failed", "data": {} });
	}


});

// Rest API for checking Bitcoin Balance
app.post('/api/v1/checkBitcoinBalance', (request, response) => {

	const address = request.body.address;

	if (bitcore.Address.isValid(address)) {
		bitcoinTransaction.getBalance(address, { network: "testnet" }).then((balanceInBTC) => {
			response.json({ "status": "1", "message": "Request Successfully", "balance": balanceInBTC });
		});
	} else {
		response.json({ "status": "0", "message": "Invalid Address", "balance": null });
	}
});

// Rest Api for sending bitcoin transaction

// app.post('/api/v1/sendBitcoinTransaction', (request, response) => {

// 	var from = "myquJ14x6hsy36rM1Cd25E14zjwGJ1RiyM";
// 	var to = "mgPUfqJk4X6gE4P5Do5RfpkTFsYmsSjCya";
// 	var privKeyWIF = "4962e72408be771d4f002716635e0da30056351f6f1ff706b8df8181e27f050f";	//Private key in WIF form (Can generate this from bitcoinlib-js)
// 	var utxo = {
// 		"txId": "115e8f72f39fad874cfab0deed11a80f24f967a84079fb56ddf53ea02e308987",
// 		"outputIndex": 0,
// 		"address": from,
// 		"script": "76a91447862fe165e6121af80d5dde1ecb478ed170565b88ac",
// 		"satoshis": 50000
// 	};
// 	var transaction = new bitcore.Transaction()
// 		.from(utxo)
// 		.to(to, 1)
// 		.sign(privKeyWIF);

// 	client.sendRawTransaction(transaction.toString(), (error, response) => {
// 		if (error) console.log(error);
// 		console.log(response);
// 	});



// });


const hostname = '0.0.0.0';
const port = 3002;

app.listen(port, hostname, () => {
	console.log(`server is running at http://${hostname}:${port}`);
});

