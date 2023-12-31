const express = require('express');
const router = express.Router();
const path = require('path');
router.use(express.static(path.join(__dirname, '../web', 'build')));

router.get('/', (req,res) => {
  res.sendFile(path.join(__dirname, '../web', 'build', 'index.html'));
});
/*
router.get('/', (req,res) => {
  res.send('hello, this is the web server!');
});
*/
module.exports = router;
