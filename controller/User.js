var Web3 = require('web3');
var web3 = new Web3();
var abi = require('./crowdsaleAbi.json');
var CryptoJS = require("crypto-js");
var CircularJSON = require('circular-json');
var keythereum = require('keythereum');
var fileSystem = require('fs');
var Tx = require('ethereumjs-tx');
var path = require('path');

// LALA Token Smart Contract Address.
const contractAddress = "0xBE86986ddc061F2d340Ab915ce5a7bc41F856604";

// New Web3 Instance for LALA Token Smart Contract
const contractInstance = new web3.eth.Contract(abi, contractAddress);

// Setting HTTP Provider as Ethereum Test Net using Infura for LALA Instance
contractInstance.setProvider(new Web3.providers.HttpProvider("https://ropsten.infura.io/YmYCywDkCUPHIqNSA1vk"));

// Web3 Provider
web3 = new Web3(new Web3.providers.HttpProvider("https://ropsten.infura.io/YmYCywDkCUPHIqNSA1vk"));

// create random ethereum public keyObject
// @param token used for encryption.
// @response privateKey and UTC file content.
exports.privateKey = function(request, response) {

  const token = request.body.token;
  const password = request.body.password;

  if (token == null) {
    response.json({
      "status": "0",
      "message": "Please Provide Token",
      "EncryptedPrivateKey": "NULL"
    });
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
  console.log(EncryptedPrivateKeyString);
  // const t= CircularJSON.parse(EncryptedPrivateKeyString);
  // const u= CryptoJS.AES.decrypt(t,token);
  // console.log("anurag");
  // console.log(u.toString(CryptoJS.enc.Utf8));
  if (EncryptedPrivateKey != null) {
    response.json({
      "status": "1",
      "message": "Request Successfully",
      "data": {
        "EncryptedPrivateKey": EncryptedPrivateKeyString.replace(/ /g, ''),
        "keyObject": keyObject,
        "etherAddress": etherAddress,
        "fileName": fileName,
        "apiPath": apiPath
      }
    });
  } else {
    response.json({
      "status": "0",
      "message": "Request Failed",
      "data": {}
    });
  }
}

// Download the UTC File.
// @param UTC file name.
exports.utcFile = function(request, response) {
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
}

// Getting the Ether Balance
// @param Ether Address.
// @response Ether Balance in ETH.
exports.etherBalance = function(request, response) {
  const ether_address = request.body.etherAddress;
  if (web3.utils.isAddress(ether_address)) {
    const amount = web3.eth.getBalance(ether_address).then(function(amount) {
      response.json({
        "status": "1",
        "message": "Request Successfully",
        "balance": web3.utils.fromWei(amount, 'ether')
      });
    });
  } else {
    response.json({
      "status": "0",
      "message": "Invalid Address",
      "balance": null
    });
  }
}


// Getting the LALA Balance
// @param Ether Address.
// @response LALA Balance.
exports.lalaBalance = function(request, response) {
  const ether_address = request.body.etherAddress;
  if (web3.utils.isAddress(ether_address)) {
    //console.log(contractInstance);
    contractInstance.methods.balanceOf(ether_address).call().then(function(res) {
      response.json({
        "status": "1",
        "message": "Request Successfully",
        "balance": res
      });
    });

  } else {
    response.json({
      "status": "0",
      "message": "Request Failed",
      "balance": null
    });

  }
}

// Sending Ether
// @param _to address, _amount, _password to sign transaction.
// @response transactionHash
exports.sendEther = function(request, response) {
  const to = request.body.to;
  const amount = request.body.amount;
  const password = request.body.password;
  const keyObject = request.body.keyObject;
  const privateKey = web3.eth.accounts.decrypt(keyObject, password).privateKey;
  const addressObject = web3.eth.accounts.privateKeyToAccount(privateKey);
  const from = addressObject.address;
  const tx = {
    from: from,
    gas: "21000",
    to: to,
    value: amount
  };

  web3.eth.accounts.signTransaction(tx, privateKey).then(function(res) {
    const rawtx = res.rawTransaction;

    web3.eth.sendSignedTransaction(rawtx)
      .once('transactionHash', function(hash) {
        response.json({
          "status": "1",
          "message": "Request Successfully",
          "txnHash": hash
        });
      }).on('error', function(error) {
        response.json({
          "status": "0",
          "message": "Request Failed",
          "data": error
        });
      });

  });
}

// Sending LALA
// @param _to address, _amount, _password to sign transaction.
// @response transactionHash
exports.sendLala = function(request, response) {

  const to = request.body.to;
  const amount = request.body.amount;
  const password = request.body.password;
  const keyObject = request.body.keyObject;
  const privateKey = web3.eth.accounts.decrypt(keyObject, password).privateKey;
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

    tran.once('transactionHash', function(hash) {
      response.json({
        "status": "1",
        "message": "Request Successfully",
        "txnHash": hash
      });
    });

    tran.on('error', error => {
      response.json({
        "status": "0",
        "message": "Request Failed",
        "data": null
      });
    });
  });
}

// Getting reciept
// @param transactionHash
// response reciept
exports.reciept = function(request, response) {
  const txnHash = request.body.txnHash;

  web3.eth.getTransactionReceipt(txnHash)
    .then(function(reciept) {

      if (reciept != null) {
        web3.eth.getBlockNumber().then(function(blockNumber) {
          const confirmationNumber = blockNumber - reciept.blockNumber;

          response.json({
            "status": "1",
            "message": "Request Successfully",
            "data": {
              "reciept": reciept,
              "confirmationNumber": confirmationNumber
            }
          });
        });

      } else {

        response.json({
          "status": "0",
          "message": "Your Transaction is Pending",
          "data": null
        });

      }
    });
}
