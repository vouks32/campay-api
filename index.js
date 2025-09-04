
const https = require('node:https');
const express = require('express'); //Import the express dependency
var cors = require('cors');
const app = express();  //Instantiate an express app, the main work horse of this server
const port = 7872;  //Save the port number where your server will be listening
const cookieParser = require('cookie-parser');
const axios = require('axios');
const path = require('path');

app.use(cors({
  allowedHeaders: "*",
  origin: function (origin, callback) { // allow requests with no origin  // (like mobile apps or curl requests)
    return callback(null, true);
  },
  methods: ["GET", "POST"]
}));

app.use(cookieParser());


//get requests to the root ("/") will route here
//Idiomatic expression in express to route and respond to a client request
app.get('/api/getmoney', async (req, res) => {

  let request = req.query;

  console.log(request)
  if (!request["ext_ref"] || !request["number"]) {
    res.send({ status: "error", error: "data incomplete", request: request })
    console.log({ status: "error", error: "data incomplete" });
    return
  }

  // WARNING: For POST requests, body is set to null by browsers.
  var data = JSON.stringify({
    "amount": "2490",
    "from": request["number"],
    "description": "Achat d'une formation pdf Excel",
    "external_reference": request["ext_ref"]
  });

  let prom = new Promise(function (resolve, reject) {
    var xhr = new XMLHttpRequest();
    xhr.withCredentials = true;
    xhr.addEventListener("readystatechange", function () {
      if (this.readyState === 4) {
        console.log(this.responseText);
        resolve(this.responseText)
      }
    });
    xhr.open("POST", "https://demo.campay.net/api/collect/");
    xhr.setRequestHeader("Authorization", "Token 1d0845173b102b7ab33fa97b4067fc1839c30466");
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.send(data);
  });

  return await prom;
});

/////// //get requests to the root ("/") will route here
app.get('/api/checktransaction', async (req, res) => {

  let request = req.query;
  console.log(request)
  if (!request["ext_ref"]) {
    res.send({ status: "error", error: "data incomplete" })
    console.log({ status: "error", error: "data incomplete" });
    return
  }
  return;
});



const CLIENT_KEY = 'sbawichfdxmm1wsd4z';
const CLIENT_SECRET = 'AjwK8nzMegJOzmBZ7zg7zpUuO1NMZesw';
const REDIRECT_URI = 'https://campay-api.vercel.app/api/webhook'

//const dbServer = 'https://zvg5idmip4f1.share.zrok.io'
const dbServer = 'http://16.170.236.54'

/////// //get requests to the root ("/") will route here
app.get("/api/auth", async (req, res) => {
  const { email } = req.query
  const csrfState = Math.random().toString(36).substring(2);
  res.cookie('csrfState', csrfState, { maxAge: 60000 });

  let url = 'https://www.tiktok.com/v2/auth/authorize/';

  // the following params need to be in `application/x-www-form-urlencoded` format.
  url += '?client_key=' + CLIENT_KEY;
  url += '&scope=user.info.basic,video.list,user.info.profile,user.info.stats';
  url += '&response_type=code';
  url += '&redirect_uri=' + encodeURIComponent(REDIRECT_URI);
  url += '&state=' + csrfState + "--" + email;

  console.log("redirecting to", url)
  res.redirect(url);

});


// Récupération des données de la campagne
app.get("/api/webhook", async (req, res) => {
  const { code, scopes, state, error, error_description } = req.query;

  try {
    if (error) {
      console.log(error, error_description)
      res.redirect('/tiktokfail')
      return
    }
    console.log('')
    if (code) {
      const tiktokAuthCode = { code, scopes, state, date: Math.round(Date.now() / 1000) }
      const userMail = state.split('--')[1]
      console.log(code, state)

      const createResponse = await fetch(dbServer + '/api/users', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          "skip_zrok_interstitial": "true"
        },
        body: JSON.stringify({
          email: userMail,
          updates: { tiktokAuthCode }
        })
      });

      let updatedUser = await createResponse.json();

      if (updatedUser.error) {
        console.log("error saving code", updatedUser.error)
      }

      const tokenResponse = await axios.post(
        'https://open.tiktokapis.com/v2/oauth/token/',
        {
          client_key: CLIENT_KEY,
          client_secret: CLIENT_SECRET,
          code,
          grant_type: 'authorization_code',
          redirect_uri: REDIRECT_URI,
        },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
        }
      );

      const Tresponse = tokenResponse.data;
      if (!Tresponse.error) {
        const updateResponse = await fetch(dbServer + '/api/users', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            "skip_zrok_interstitial": "true"
          },
          body: JSON.stringify({
            email: userMail,
            updates: {
              tiktokToken: {
                ...Tresponse,
                access_token_date: Math.round(Date.now() / 1000),
                refresh_token_date: Math.round(Date.now() / 1000)
              }
            }
          })
        });

        let updatedUser = await updateResponse.json();
        if (updatedUser.error) {
          console.log("error saving Token", updatedUser.error)
          res.redirect('/tiktokfail')
        } else {
          res.redirect('/tiktoksuccess')
        }
      } else {
        console.log(Tresponse.error, Tresponse.error_description)
        res.redirect('/tiktokfail')
        return
      }

    } else {
      res.redirect('/tiktokfail')
    }
  } catch (error) {
    console.error('Erreur récupération du fiechier:', req.query, error);
    res.redirect('/tiktokfail')
  }
});

// Récupération des données de la campagne
app.get("/api/refresh_token", async (req, res) => {
  const { refresh_token, email } = req.query;

  try {

    if (refresh_token) {
      const tokenResponse = await axios.post(
        'https://open.tiktokapis.com/v2/oauth/token/',
        {
          client_key: CLIENT_KEY,
          client_secret: CLIENT_SECRET,
          grant_type: 'refresh_token',
          refresh_token
        },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
        }
      );

      const Tresponse = tokenResponse.data;
      if (!Tresponse.error) {
        const updateResponse = await fetch(dbServer + '/api/users', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            "skip_zrok_interstitial": "true"
          },
          body: JSON.stringify({
            email: email,
            updates: {
              tiktokToken: {
                ...Tresponse,
                access_token_date: Math.round(Date.now() / 1000)
              }
            }
          })
        });

        let updatedUser = await updateResponse.json();
        if (updatedUser.error) {
          console.log("error saving Token", updatedUser.error)
          res.status(500).json({ success: false })
        } else {
          res.status(201).json(updatedUser);
        }
      } else {
        console.log(Tresponse.error, Tresponse.error_description)
        res.status(500).json({ success: false })
        return
      }
    } else {
      res.status(500).json({ success: false })
    }
  } catch (error) {
    //console.error('Erreur récupération du fiechier:', req.query, error);
    res.status(500).json({ success: false })
  }
});



/////// //get requests to the root ("/") will route here
app.get("/tiktoksuccess", async (req, res) => {
  res.sendFile(path.join(__dirname, 'tiktoksuccess.html'));
});
app.get("/tiktokfail", async (req, res) => {
  res.sendFile(path.join(__dirname, 'tiktokfailure.html'));
});




/////// //get requests to the root ("/") will route here
app.get('/yo', async (req, res) => {
  let fullUrl = req.protocol + '://' + req.get('host');
  console.log(req.protocol, '://', req.get('host'), req.originalUrl)
  res.send("yooooooo => " + fullUrl);
  res.send("yooooooo => " + fullUrl);
  res.send("yooooooo => " + fullUrl);

});



app.listen(port, () => {            //server starts listening for any attempts from a client to connect at port: {port}
  console.log(`Now listening on port ${port}`);

});
