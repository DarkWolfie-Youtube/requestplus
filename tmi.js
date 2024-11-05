const express = require("express");
const app = express();
const request = require('request');
const path = require("node:path");
const fs = require("node:fs");
const log = require("./logger.js");
const cors = require("cors");
const ejs = require('ejs');
const bodyParser = require('body-parser');
const cookieParser = require("cookie-parser");
var generateRandomString = function(length) {
    var text = '';
    var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  
    for (var i = 0; i < length; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  };
const querystring = require('node:querystring');


const { exchangeCode } = require('@twurple/auth');

app.listen(3000, async () => {
    log.info("Ready! Listening on port 3000");
})

var tcallback = 'https://requestplus.xyz/tcallback';
var config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
var clientId = config.options.twitch.client_id;
var clientSecret = config.options.twitch.client_secret;

app.get("/tcallback", async (req, res) => {
    res.header("Access-Control-Allow-Origin", "*");


    const code = req.query.code

    if (!code) {
        res.status(404).send({message: "No code provided", error: true})
        return
    }
    const tokenData = await exchangeCode(clientId, clientSecret, code, tcallback);
    fs.writeFileSync(`./token.json`, JSON.stringify(tokenData, null, 4), 'utf-8');

    res.send({message: "Token saved", error: false})


})