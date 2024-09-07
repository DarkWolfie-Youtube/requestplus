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
var session        = require('express-session');
var passport       = require('passport');
var OAuth2Strategy = require('passport-oauth').OAuth2Strategy;
const Sequelize = require('sequelize');
const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
const wait = require('node:timers/promises').setTimeout;
const tmi = require('tmi.js');
const { url } = require("node:inspector");
const { Console } = require("node:console");
const SESSION_SECRET = generateRandomString(32);
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
    stoken_renew: Sequelize.BOOLEAN,
    ttoken: Sequelize.STRING,
    trefresh_token: Sequelize.STRING,
    texpires_at: Sequelize.DATE

});
const DBEdit2 = data.define('state_data', {
    state: Sequelize.STRING,
    user: Sequelize.STRING,

});
const sclient_id = config.options.spotify.client_id;
const sclient_secret = config.options.spotify.client_secret;
const tclient_id = config.options.twitch.client_id;
const tclient_secret = config.options.twitch.client_secret;
const DBEdit3 = data.define('user_settings', {
	user: Sequelize.STRING,
    style: Sequelize.STRING,
    isRequestEnabled: Sequelize.BOOLEAN,
    botUsed: Sequelize.STRING,
    whitelisted: Sequelize.BOOLEAN


});


var stateKey = 'spotify_auth_state';
var scallback = 'https://requestplus.xyz/scallback';
var tcallback = 'https://requestplus.xyz/tcallback';
var testing = "http://localhost:3000/tcallback"
var testing2 = 'http://localhost:3000/scallback';
let channels = JSON.parse(fs.readFileSync('./channels.json', 'utf8')).channels;
async function getToken(){

    const data3 = await DBEdit.findOne({where: {user: 'requestplus'}}).then((data) => {
        if (data) {
            return data.dataValues.ttoken
        }
    })
    return data3
}

// Override passport profile function to get user profile from Twitch API
OAuth2Strategy.prototype.userProfile = function(accessToken, done) {
    var options = {
      url: 'https://api.twitch.tv/helix/users',
      method: 'GET',
      headers: {
        'Client-ID': tclient_id,
        'Accept': 'application/vnd.twitchtv.v5+json',
        'Authorization': 'Bearer ' + accessToken
      }
    };
  
    request(options, function (error, response, body) {
      if (response && response.statusCode == 200) {
        done(null, JSON.parse(body));
      } else {
        done(JSON.parse(body));
      }
    });
  }
  
  passport.serializeUser(function(user, done) {
      done(null, user);
  });
  
  passport.deserializeUser(function(user, done) {
      done(null, user);
  });
  passport.use('twitch', new OAuth2Strategy({
    authorizationURL: 'https://id.twitch.tv/oauth2/authorize',
    tokenURL: 'https://id.twitch.tv/oauth2/token',
    clientID: tclient_id,
    clientSecret: tclient_secret,
    callbackURL: tcallback,
    state: true
  },
  async function(accessToken, refreshToken, data, profile, done) {
    profile.accessToken = accessToken;
    profile.refreshToken = refreshToken;
    profile.expiresIn = data.expires_in

    // Securely store user profile in your DB
    //User.findOrCreate(..., function(err, user) {
    //  done(err, user);
    //});
    var found = await DBEdit.findOrCreate({where: {user: profile.data[0].login},
        defaults: {
            ttoken: accessToken,
            trefresh_token: refreshToken,
            texpires_at: new Date().setSeconds(new Date().getSeconds() + profile.expiresIn)
        }}
    )
    var found2 = await DBEdit3.findOrCreate({where: {user: profile.data[0].login},
        defaults: {
            user: profile.data[0].login,
            whitelisted: false,
            style: "default",
            botUsed: null
        }})
    if (found2) {
        DBEdit3.update({botUsed: null}, {where: {user: profile.data[0].login}})
    }
    if (found) {
        DBEdit.update({ttoken: accessToken, trefresh_token: refreshToken, texpires_at: new Date().setSeconds(new Date().getSeconds() + profile.expiresIn)}, {where: {user: profile.data[0].login}})
    }

    done(null, profile);
  }
));


app.use(express.static(path.join(__dirname, "public")))
.use(cors())
.use(cookieParser())
.use(session({secret: SESSION_SECRET, resave: false, saveUninitialized: false}))
.use(passport.initialize())
.use(passport.session())
.use(bodyParser.json())
.use(bodyParser.urlencoded({ extended: true }));

app.set("view engine", "ejs");

app.get("/", (req, res) => {
    if(req.session && req.session.passport && req.session.passport.user) {
        res.render("indexl");
      } else {
        res.render("index");
      }
})


app.get("/overlay", async (req, res) => {
    res.header("Access-Control-Allow-Origin", "*");
    const html = await ejs.renderFile("views/overlay.ejs", {req: req, DBEdit: DBEdit3}, {async: true});
    res.send(html)
})
let client;
app.listen(3000, async () => {
    log.info("Ready! Listening on port 3000");
    DBEdit.sync()
    DBEdit2.sync()
    DBEdit3.sync()


const bot_token = await getToken()

client = new tmi.Client({
	options: { debug: true },
	identity: {
		username: 'requestplus',
		password: bot_token
	},
	channels: channels
    
});

client.connect().then(() => {
    log.info('Connected to Twitch')
});

client.on('message', async (channel, tags, message, self) => {
	// Ignore echoed messages.
	if(self) return;

	if(message.toLowerCase().startsWith('!request') || message.toLowerCase().startsWith('!sr')) {
		var requesta = message.split(' ').splice(1).join(' ')
        if (requesta.includes("https://open.spotify.com")){
            var ida = requesta.split("https://open.spotify.com/track/")[1]
            var id = ida.split("?si=")[0]
            var broadcaster = channel.replace("#", "")

            var options = {
                url: `https://api.spotify.com/v1/tracks/${id}`,
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${await getUserSToken(broadcaster)}`
                }
            }
                request.get(options, async function(error, response, body) {
                    if (!error && response.statusCode === 200) {
                        var track = JSON.parse(body)
                        
                        var options  = {
                            url: `https://api.spotify.com/v1/me/player/queue?uri=${track.uri}`,
                            headers: {
                                'Authorization': `Bearer ${await getUserSToken(broadcaster)}`
                            }
                        }
                        request.post(options, function(error, response, body) {
                            if (!error && response.statusCode === 204) {
                                
                            }
                        })
                        client.say(channel, `Request+: ${track.name} by ${track.artists[0].name}, now queued.`)

                    }
                })

                    
            
                                  
        } else {
            client.say(channel, `Request+: Please provide a valid spotify link!`)
        }
	}
    });
})



app.get("/signup", async (req, res) => {
        res.redirect('/twitch_check')

});

app.get('/slogin', async (req, res) => {
    if(req.session && req.session.passport && req.session.passport.user) {
      
      
        var state = generateRandomString(16);
        var user = `${req.session.passport.user.data[0].login}`;
        var cool = await DBEdit2.create({state: state, user: user})
        // your application requests authorization
        var scope = 'user-read-private user-read-email user-modify-playback-state user-read-currently-playing';
        res.redirect('https://accounts.spotify.com/authorize?' +
          querystring.stringify({
            response_type: 'code',
            client_id: sclient_id,
            scope: scope,
            redirect_uri: scallback,
            state: state
          }));

        }
        else {
            res.status(401).send({message: "Unauthorized", error: true})
        }
})

app.get('/slogout', async (req, res) => {
    if (req.session && req.session.passport && req.session.passport.user) {
        res.redirect('/settings')
        DBEdit.update({stoken: null, srefresh_token: null, expires_at: null, stoken_renew: false}, {where: {user: req.session.passport.user.data[0].login}})}
    else {
        res.status(401).send({message: "Unauthorized", error: true})
    }
})
app.get("/twitch_check", passport.authenticate('twitch', { scope: ['user_read', "channel:manage:moderators"] }))
app.get("/login", passport.authenticate('twitch', { scope: ['user_read', "channel:manage:moderators"] }))


app.get("/scallback" , async (req, res) => {
    
    var code = req.query.code || null;
    var state = req.query.state || null;
    var s1 = await DBEdit2.findOne({where: {state: state}})
    if (!s1) {
        res.redirect('/settings#' +
        querystring.stringify({
            error: 'state_missing'
        }));
        return
    }
    var storedState = s1.state
    
    if (state === null || state !== storedState) {
        res.redirect('/settings#' +
        querystring.stringify({
            error: 'state_mismatch'
        }));
    } else {
        res.clearCookie(stateKey);
        var authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      form: {
          code: code,
          redirect_uri: scallback,
          grant_type: 'authorization_code'
        },
        headers: {
            'Authorization': 'Basic ' + (new Buffer(sclient_id + ':' + sclient_secret).toString('base64'))
        },
        json: true
    };
    
    request.post(authOptions, async function(error, response, body) {

        if (!error && response.statusCode === 200) {
            
            var access_token = body.access_token,
            refresh_token = body.refresh_token,
            expires_in = body.expires_in;
            
            await DBEdit.update({stoken: access_token, srefresh_token: refresh_token, expires_at: Date.now() + 3600000, stoken_renew: true}, {where: {user: s1.user}})
            
            await DBEdit2.destroy({where: {state: state}})
            res.redirect('/settings');
            
            // we can also pass the token to the browser to make requests from ther
            
        } else {
            res.redirect('/#' +
            querystring.stringify({
                error: 'invalid_token'
            }));
        }
    });
}
})

app.get("/tcallback" , passport.authenticate('twitch', { successRedirect: '/', failureRedirect: '/?error=login_error' }))

app.get("/overlayinfo/", async (req, res) => {
    res.header("Access-Control-Allow-Origin", "*");
    const user = req.query.user
    if (!user) {
        res.status(404).send({message: "No user provided", error: true})
        return
    }
    var dbuser = await DBEdit.findOne({where: {user: user}})
    if (!dbuser) {
        res.status(404).send({message: "No user exists", error: true})
        return
    }

    res.json({message: "Hello, " + user, error: false})

})


app.get("/nowplaying", async (req, res) => {
    res.header("Access-Control-Allow-Origin", "*");
    const user = req.query.user
    if (!user) {
        res.status(404).send({message: "No user provided", error: true})
        return
    }
    var dbuser = await DBEdit.findOne({where: {user: user}})
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
            // write the response to a file

            // console.error(body)
            //fs.appendFileSync('log.txt', `\n${body}`)

            if (body)
            { 
                
                var body = JSON.parse(body)

                if (body.is_playing) {
                    if (body.item) {
                        
                    
                    
                    if (!body.item.album.images[0]){

                        var song_name = body.item.name;
                        var song_cover = null;
                        var artists = null
                        var progress = body.progress_ms,
                        total = body.item.duration_ms;
                        res.json({data: {song_name: song_name, song_cover: song_cover, artists: artists, progress: progress, totalMS: total}, error: false})
                        
                    } else {
                    var song_name = body.item.name;
                    var song_cover = (body.item.album.images[0].url || null);
                    var artists = body.item.artists;
                    var progress = body.progress_ms,
                    total = body.item.duration_ms;
                    
                    res.json({data: {song_name: song_name, song_cover: song_cover, artists: artists, progress: progress, totalMS: total}, error: false})}
                    } else {
                        res.json({data: {song_name: "Up Next", song_cover: "/img/overlay/dj.jpg", artists: [{name: "DJ X"}], progress: 0, totalMS: 0}, error: false})
                    }
                } else {
                    res.send({message: "No song playing", error: false}) 
                }
        }

        }else if (response.statusCode === 204) {
            res.send({message: "No song playing", error: false})
        
        } else if (body == "Too many requests"){
            res.status(403).send({message: "Too many requests", error: true})
        } else{
            res.status(500).send({message: "Token is invalid or expired", error: true})
        }
    })

})

app.get("/logout", async (req, res) => {
    req.logout((err) => {
        if (err) {
            throw err
        }
        res.status(200).redirect('/');
    })
    
})

app.get("/settings", async (req, res) => {
    if(req.session && req.session.passport && req.session.passport.user) {
        var dbdata = await DBEdit3.findOne({where: {user: req.session.passport.user.data[0].login}})
        if (dbdata) {
            if (dbdata.whitelisted !== true) {
                const html = await ejs.renderFile("views/settingsnw.ejs", {user: req.session.passport.user, DBEdit: DBEdit, DBEdit3: DBEdit3}, {async: true});
                res.send(html)
        } else {
            if (req.query.error == "premium"){
                const html = await ejs.renderFile("views/settingse1.ejs", {user: req.session.passport.user, DBEdit: DBEdit, DBEdit3: DBEdit3}, {async: true});
                res.send(html)
            } else {
                const html = await ejs.renderFile("views/settings.ejs", {user: req.session.passport.user, DBEdit: DBEdit, DBEdit3: DBEdit3}, {async: true});
                res.send(html)
            }
            
        }}
      } else {
        res.status(401).redirect('/')
      }
})


app.post("/api/settings", async (req, res) => {
    const user = await req.body.user
    const enabledRequests = await req.body.enabledRequests
    const userMain = req.session.passport.user;
    const ttoken = req.session.passport.user.accessToken

    if(userMain) {
        if (user == userMain.data[0].login) {
            var DBdata = await DBEdit3.findOne({where: {user: user}})
            if (req.body.style) {
                
                if (DBdata) {
                var style = req.body.style;
                    DBEdit3.update({style: style}, {where: {user: user}})
                    res.redirect('/settings')
                    return
                } else {
                    DBEdit3.create({user: user, style: style})
                    res.redirect('/settings')
                    return
                }
    
            } else if (req.body.enabledRequests) {
                               
                if (req.body.enabledRequests == 1){

                    var dbdata2 = await DBEdit.findOne({where: {user: user}})
                    if (dbdata2) {
                        if (dbdata2.dataValues.stoken) {
                            var options= {
                                url: "https://api.spotify.com/v1/me",
                                headers: {
                                    'Authorization': 'Bearer ' + dbdata2.dataValues.stoken
                                }
                            }


                            request.get(options, function(error, response, body) {
                                if (!error && response.statusCode === 200) {
                                    if (body) {
                                        var body = JSON.parse(body)
                                        if (body.product == "free") {
                                            res.redirect('/settings?error=premium')
                                            return false;
                                        } else {
                                            if (DBdata) {
                                                DBEdit3.update({isRequestEnabled: enabledRequests}, {where: {user: user}})
                                            } else {
                                                DBEdit3.create({user: user, isRequestEnabled: enabledRequests})
                                            }
                                            channels.push("#" +userMain.data[0].login)
                                            fs.writeFileSync('./channels.json', `${JSON.stringify({channels})}`,  'utf8')
                                            client.join("#" +userMain.data[0].login)
                                            
                                            var options = {
                                                url: "https://api.twitch.tv/helix/moderation/moderators?broadcaster_id=" + userMain.data[0].id + "&user_id=1110775247",    
                                                headers: {
                                                    'Authorization': 'Bearer ' + ttoken,
                                                    "Client-ID": tclient_id
                                                }
                                            }
                                            request.post(options, function(error, response, body) {
                                                if (!error && response.statusCode === 204) {
                                                    if (DBdata) {
                                                        DBEdit3.update({botUsed: "RequestPlus"}, {where: {user: user}})
                                                    } else {
                                                        DBEdit3.create({user: user, botUsed: "RequestPlus"})
                                                    }
                                                } 
                                            })
                                            if (DBdata) {
                                                DBEdit3.update({isRequestEnabled: enabledRequests}, {where: {user: user}})
                                            } else {
                                                DBEdit3.create({user: user, isRequestEnabled: enabledRequests})
                                            }
                                            res.redirect('/settings')
                                        }
                                    }
                                } 
                            })
                        }
                    }
                } else if (req.body.enabledRequests == 0) {
                    channels = channels.filter(channel => channel !== ("#" +userMain.data[0].login))
                    
                    fs.writeFileSync('./channels.json', `${JSON.stringify({channels})}`,  'utf8')
                    client.part("#" +userMain.data[0].login)
                    var options = {
                        url: "https://api.twitch.tv/helix/moderation/moderators?broadcaster_id=" + req.session.passport.user.data[0].id + "&user_id=1110775247",    
                        headers: {
                            'Authorization': 'Bearer ' + ttoken,
                            "Client-ID": tclient_id
                        }
                    }
                    request.delete(options, function(error, response, body) {
                        if (!error && response.statusCode === 204) {
                            if (DBdata) {
                                DBEdit3.update({botUsed: null}, {where: {user: user}})
                            } else {
                                DBEdit3.create({user: user, botUsed: null})
                            }
                        } 
                    })
                    if (DBdata) {
                        DBEdit3.update({isRequestEnabled: enabledRequests}, {where: {user: user}})
                    } else {
                        DBEdit3.create({user: user, isRequestEnabled: enabledRequests})
                    }
                    res.redirect('/settings')
                }
            } 
            

            
        }

    } else {
        res.status(401).send({message: "Unauthorized", error: true})
    }
})


setInterval(() => {
    updateTokens()
}, 2000)
setInterval(() => {
    updateTTokens()
}, 360000)

function updateTokens() {
    var data = DBEdit.findAll()
    data.then((data) => {
        for (var i = 0; i < data.length; i++) {
            var user = data[i].user
            var srefresh_token = data[i].srefresh_token
            var expires_at = data[i].expires_at
            var reset = data[i].stoken_renew
            var time = Date.now()
            
            if (reset) {
           
                if (time > expires_at) {
                refreshToken(user, srefresh_token) 
            
            }

        
        }
        }
    })
}
function updateTTokens() {
    var data = DBEdit.findAll()
    data.then((data) => {
        for (var i = 0; i < data.length; i++) {
            var user = data[i].user
            var srefresh_token = data[i].trefresh_token
            var expires_at = data[i].texpires_at
            var time = Date.now()


           
                if (time > expires_at) {
                 
                refreshBotTToken(user, srefresh_token)

        
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
        DBEdit.update({stoken: access_token, srefresh_token: refresh_token, expires_at: Date.now() + 3600000}, {where: {user: user}})
    }
  });
};



function refreshBotTToken(user, trefresh_token) {
  var authOptions = {
    url: 'https://id.twitch.tv/oauth2/token',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
    },
    form: {
      grant_type: 'refresh_token',
      refresh_token: trefresh_token,
      client_id: tclient_id,
      client_secret: tclient_secret
    },
    json: true
  };

  request.post(authOptions, function(error, response, body) {
    if (!error && response.statusCode === 200) {
      var access_token = body.access_token,
          refresh_token = body.refresh_token;
        DBEdit.update({texpires_at: Date.now() + 3600000, ttoken: access_token, trefresh_token: refresh_token}, {where: {user: user}})
    }
  });
}

async function getToken(){

    const data3 = await DBEdit.findOne({where: {user: 'requestplus'}}).then((data) => {
        if (data) {
            return data.dataValues.ttoken
        }
    })
    return data3
}


async function getUserSToken(user){

    const data3 = await DBEdit.findOne({where: {user: user}}).then((data) => {
        if (data) {
            return data.dataValues.stoken
        }
    })
    return data3
}



// Admin Panel
app.get("/admin", async (req, res) => {
    if(req.session && req.session.passport && req.session.passport.user && req.session.passport.user.data[0].login == "darkwolfievt") {
        const html = await ejs.renderFile("views/admin.ejs", {user: req.params.user, admin: req.session.passport.user, DBEdit: DBEdit, DBEdit3: DBEdit3}, {async: true});
        res.send(html)
    } else {
        res.status(401).send({message: "Unauthorized", error: true})
    }
})

app.get("/admin/users/settings/:user", async (req, res) => {
    if(req.session && req.session.passport && req.session.passport.user && req.session.passport.user.data[0].login == "darkwolfievt") {
        const html = await ejs.renderFile("views/settingsa.ejs", {user: req.params.user, admin: req.session.passport.user, DBEdit: DBEdit, DBEdit3: DBEdit3}, {async: true});
        res.send(html)
    } else {
        res.status(401).send({message: "Unauthorized", error: true})
    }
})

app.post('/api/admin', async (req, res) => {
    const user = await req.body.user
    const whitelisted = await req.body.whitelist
    if(req.session && req.session.passport && req.session.passport.user && req.session.passport.user.data[0].login == "darkwolfievt") {
        
            var data = await DBEdit3.findOne({where: {user: user}})
            if (data){
                if (whitelisted == "true"){
                    await DBEdit3.update({whitelisted: true}, {where: {user: user}})
                } else {
                    await DBEdit3.update({whitelisted: false}, {where: {user: user}})
                    
                }
            }
        
    } else {
        res.status(401).send({message: "Unauthorized", error: true})
    }

    res.redirect('/admin')
})
