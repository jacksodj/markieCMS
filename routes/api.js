var express = require('express');
var router = express.Router();
var Dropbox = require('dropbox');

var authredirect = "";

//override to allow code not token return
Dropbox.prototype.getAuthenticationUrl = function (redirectUri, state) {
  var AUTH_BASE_URL = 'https://www.dropbox.com/oauth2/authorize';
  var clientId = this.getClientId();
  var authUrl;
  if (!clientId) {
    throw new Error('A client id is required. You can set the client id using .setClientId().');
  }
  if (!redirectUri) {
    throw new Error('A redirect uri is required.');
  }

  authUrl = AUTH_BASE_URL + '?response_type=code&client_id=' + clientId;
  if (redirectUri) {
    authUrl = authUrl + '&redirect_uri=' + redirectUri;
  }
  if (state) {
    authUrl = authUrl + '&state=' + state;
  }
  return authUrl;
};

checkAccessToken = function(res){
    if (typeof process.env.accesstoken === 'undefined' || process.env.accesstoken === null){
        console.log("process.env.accesstoken IS NOT valid");
        res.redirect("authenticate").end();
    }
    else{
        console.log("process.env.accesstoken is valid: " + process.env.accesstoken );
    }
}

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

//initiate authentication sequence
router.get('/authenticate', function(req, res, next) {
    
    var dbx = new Dropbox({ clientId: process.env.dbclientid });
    authredirect = (req.hostname == "localhost")?"http":"https" + "://" + req.get('host') + "/api/authresponse";
    console.log(process.env.dbclientid);
    var authUrl = dbx.getAuthenticationUrl(authredirect);
    console.log(authUrl);
    res.redirect(authUrl);
});

//handle response from dropbox, and convert code into bearer token
router.get('/authresponse', function(req, res, next) {
    if (req.query.hasOwnProperty("code")) {
        process.env.tokencode = req.query.code;
        
        //create call to auth/token and return to token response
        
        //get url for end point
        var tokenURL = 'https://api.dropboxapi.com/1/oauth2/token';
        
        var rp = require('request-promise');
        var options = {
            method: 'POST',
            uri: tokenURL,
            form: {
                code: process.env.tokencode,
                grant_type: 'authorization_code',
                client_id: process.env.dbclientid,
                client_secret: process.env.dbappsecret,
                redirect_uri: authredirect
            },
            json: true // Automatically stringifies the body to JSON
        };

        rp(options)
          .then(function(response) {
            process.env.accesstoken = response.access_token;
            res.redirect('files');
          })
          .catch(function(error) {
            console.log(error);
            res.render('error', { title: 'Failed on Token' });
          });
    }
    else{
        res.render('error', { title: 'Code Missing' });
    }
});

// webhook end point
router.get('/change', function(req, res, next) {
    console.log(response);
    res.render('index', { title: 'Express' });
});

router.get('/files', function(req, res, next) {
    checkAccessToken(res);
    
    var dbx = new Dropbox({ accessToken: process.env.accesstoken });
    dbx.filesListFolder({path: ''})
      .then(function(response) {
        console.log(response);
      })
      .catch(function(error) {
        console.log(error);
      });
    
    res.render('index', { title: 'Express' });
});


module.exports = router;
