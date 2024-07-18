const express = require("express");
const app = express();
const api = express()
const request = require('request');
const path = require("node:path");
const fs = require("node:fs");
const log = require("./logger.js");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const querystring = require('node:querystring');
const Sequelize = require('sequelize');
const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
const wait = require('node:timers/promises').setTimeout;
const data = new Sequelize('database', 'user', 'password', {
	host: 'localhost',
	dialect: 'sqlite',
	logging: false,
	// SQLite only
	storage: 'spotify_overlay_data.sqlite',
});
const DBEdit = data.define('spotify_data', {
	user: Sequelize.STRING,
    stoken: Sequelize.STRING,
    expires_at: Sequelize.DATE,
    srefresh_token: Sequelize.STRING,
    twitch_username: Sequelize.STRING,
    ttoken: Sequelize.STRING,
    trefresh_token: Sequelize.STRING

});
const sclient_id = config.options.spotify.client_id;
const sclient_secret = config.options.spotify.client_secret;
const tclient_id = config.options.twitch.client_id;
const tclient_secret = config.options.twitch.client_secret;
const DBEdit2 = data.define('spotify_data_temp', {
	user: Sequelize.STRING,
    token: Sequelize.STRING,
    expires_at: Sequelize.DATE,
    refresh_token: Sequelize.STRING,
    state: Sequelize.STRING

});
var stateKey = 'spotify_auth_state';
var redirect_uri1 = 'https://overlayapi.darkwolfie.com/scallback';
var redirect_uri2 = 'https://overlayapi.darkwolfie.com/tcallback';

// api.get("/overlay/nowplaying/:user", (req, res) => {
//     res.header("Access-Control-Allow-Origin", "*");
//     const user = req.params.user
//     log.info("User: " + user)

//     res.json({message: "Hello, " + user, error: false})

// })
var generateRandomString = function(length) {
    var text = '';
    var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  
    for (var i = 0; i < length; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  };


api.get("/signup", async (req, res) => {

        var state = generateRandomString(16);
      
        // your application requests authorization
        var scope = 'user-read-private user-read-email app-remote-control streaming user-read-playback-state user-modify-playback-state user-read-currently-playing';
        await DBEdit2.create({
          state: state
        })
        res.redirect('https://accounts.spotify.com/authorize?' +
          querystring.stringify({
            response_type: 'code',
            client_id: sclient_id,
            scope: scope,
            redirect_uri: redirect_uri1,
            state: state
          }));

});
api.get("/twitch_check", async (req, res) => {
    var state3 = req.query.state;
    var state = generateRandomString(16);
    var s1 = await DBEdit2.findOne({where: {state: state3}})
    console.log(s1)
    // your application requests authorization
    var scope = 'user:read:email';

    var s2 = await DBEdit2.update({state: state}, {where: {state: state3}})
    console.log(s2)

    res.redirect('https://id.twitch.tv/oauth2/authorize?' +
      querystring.stringify({
        response_type: 'code',
        client_id: tclient_id,
        scope: scope,
        redirect_uri: redirect_uri2,
        state: state
      }));

})


api.get("/scallback" , async (req, res) => {
    
    var code = req.query.code || null;
    var state = req.query.state || null;
    var s1 = await DBEdit2.findOne({where: {state: state}})
    if (!s1) {
        res.redirect('https://overlay.darkwolfie.com/#' +
        querystring.stringify({
            error: 'state_missing'
        }));
        return
    }
    var storedState = s1.state
    log.debug(state + " / " + storedState)
    
    if (state === null || state !== storedState) {
        res.redirect('https://overlay.darkwolfie.com/#' +
        querystring.stringify({
            error: 'state_mismatch'
        }));
    } else {
        res.clearCookie(stateKey);
        var authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      form: {
          code: code,
          redirect_uri: redirect_uri1,
          grant_type: 'authorization_code'
        },
        headers: {
            'Authorization': 'Basic ' + (new Buffer(sclient_id + ':' + sclient_secret).toString('base64'))
        },
        json: true
    };
    
    request.post(authOptions, function(error, response, body) {
        if (!error && response.statusCode === 200) {
            
            var access_token = body.access_token,
            refresh_token = body.refresh_token,
            expires_in = body.expires_in;
            
            
            DBEdit2.update({user: body.id, token: access_token, refresh_token: refresh_token, expires_at: new Date().setSeconds(new Date().getSeconds() + expires_in)}, {where: {state: state}})
            
            res.redirect('https://overlay.darkwolfie.com/twitch_check?state=' + state);
            
            // we can also pass the token to the browser to make requests from ther
            
        } else {
            res.redirect('/' +
            querystring.stringify({
                error: 'invalid_token'
            }));
        }
    });
}
})

api.get("/tcallback" , async (req, res) => {
    
    var code = req.query.code || null;
    var state = req.query.state || null;
    var s1 = await DBEdit2.findOne({where: {state: state}});
    if (!s1) {
      
    res.redirect('https://overlay.darkwolfie.com/#' +
    querystring.stringify({
        error: 'state_missing'
    }));
    return
}

var storedState = s1.state
log.debug(state + " / " + storedState)
if (state === null || state !== storedState) {
    res.redirect('https://overlay.darkwolfie.com/#' +
    querystring.stringify({
        error: 'state_mismatch'
    }));
} else {
    
    
    var authOptions = {
        url: 'https://id.twitch.tv/oauth2/token',
        
        form: {
            client_id: tclient_id,
            client_secret: tclient_secret,
            
            code: code,
            redirect_uri: redirect_uri2,
            grant_type: 'authorization_code'
        },
        json: true
    }
    
    request.post(authOptions, function(error, response, body) {
        if (!error && response.statusCode === 200) {
            console.log(body)
            var token = body.access_token
            var refresh_token = body.refresh_token
            
            var authOptions = {
                url: 'https://api.twitch.tv/helix/users',
                headers: {
                    'Client-ID': tclient_id,
                    'Authorization': 'Bearer ' + body.access_token
                }
            }
            request.get(authOptions, function(error, response, body) {
                    
                if (!error && response.statusCode === 200) {
                    console.log(body)
                    var body = JSON.parse(body)
                    DBEdit.create({user: s1.user, stoken: s1.token, srefresh_token: s1.refresh_token, expires_at: s1.expires_at, twitch_username: body.data[0].display_name, ttoken: token, trefresh_token: refresh_token})
                        res.redirect('https://overlay.darkwolfie.com/overlay?user=' + body.data[0].login);
                    }
                })

            }
        })
        
    }
    
    
})

api.get("/overlay/", async (req, res) => {
    res.header("Access-Control-Allow-Origin", "*");
    const user = req.query.user
    if (!user) {
        res.status(404).send({message: "No user provided", error: true})
        return
    }
    var dbuser = await DBEdit.findOne({where: {twitch_username: user}})
    log.debug(dbuser)
    if (!dbuser) {
        res.status(404).send({message: "No user exists", error: true})
        return
    }

    res.json({message: "Hello, " + user, error: false})

})


api.get("/nowplaying", async (req, res) => {
    res.header("Access-Control-Allow-Origin", "*");
    const user = req.query.user
    if (!user) {
        res.status(404).send({message: "No user provided", error: true})
        return
    }
    var dbuser = await DBEdit.findOne({where: {twitch_username: user}})
    if (!dbuser) {
        res.status(404).send({message: "No user exists", error: true})
        return
    }
    var requestOptions = {
        method: 'GET',
        url: 'https://api.spotify.com/v1/me/player/currently-playing',
        headers: {
            'Authorization': 'Bearer ' + dbuser.stoken
        }
    }
    request.get(requestOptions, function(error, response, body) {
        if (!error && response.statusCode === 200) {
            if (body)
            { 
                var body = JSON.parse(body)
                var song_name = body.item.name;
                var song_cover = body.item.album.images[0].url;
                var artists = body.item.artists;
                var progress = body.progress_ms,
                total = body.item.duration_ms;
                
                res.json({data: {song_name: song_name, song_cover: song_cover, artists: artists, progress: progress, totalMS: total}, error: false})}
            else {
                res.send({message: "No song playing", error: false})
            }
        } else {
            res.send({message: "Token is invalid or expired", error: true})
        }
    })

})
api.listen(3001, () => {
    log.info("Listening on port 3001 for API")
})


setInterval(() => {
    updateTokens()
}, 2000)

function updateTokens() {
    var data = DBEdit.findAll()
    data.then((data) => {
        for (var i = 0; i < data.length; i++) {
            var user = data[i].twitch_username
            var stoken = data[i].stoken
            var srefresh_token = data[i].srefresh_token
            var expires_at = data[i].expires_at
            var time = Date.now()

            if (time > expires_at) {
                refreshToken(user, srefresh_token) 
            }
        }
    })
}

function  refreshToken(user, srefresh_token) {
  var authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + (new Buffer.from(sclient_id + ':' + sclient_secret).toString('base64'))
    },
    form: {
      grant_type: 'refresh_token',
      refresh_token: srefresh_token
    },
    json: true
  };

  request.post(authOptions, function(error, response, body) {
    if (!error && response.statusCode === 200) {
      var access_token = body.access_token,
          refresh_token = body.refresh_token;
        DBEdit.update({stoken: access_token, srefresh_token: refresh_token, expires_at: Date.now() + 3600000}, {where: {twitch_username: user}})
    }
  });
};