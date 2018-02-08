const express = require('express');
var router = express.Router();
var user = require('./controller/User');

router.route('/generatePrivateKey').post(user.privateKey);
router.route('/getUTCFile/:filename').get(user.utcFile);
router.route('/getEtherBalance').post(user.etherBalance);
router.route('/getLalaBalance').post(user.lalaBalance);
router.route('/sendEtherTransaction').post(user.sendEther);
router.route('/sendLalaTransaction').post(user.sendLala);
router.route('/getRecieptUsingTxnHash').post(user.reciept);

module.exports = router;
