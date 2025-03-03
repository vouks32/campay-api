
const https = require('node:https');
const express = require('express'); //Import the express dependency
var cors = require('cors');
const app = express();  //Instantiate an express app, the main work horse of this server
const port = 7872;  //Save the port number where your server will be listening

app.use(cors({
  allowedHeaders: "*",
  origin: function (origin, callback) { // allow requests with no origin  // (like mobile apps or curl requests)
        return callback(null, true);
    }
  methods: ["GET", "POST"]
}));


//get requests to the root ("/") will route here
//Idiomatic expression in express to route and respond to a client request
app.get('/api/getmoney', async (req, res) => {

  let request = req.query;

  console.log(request)
  if (!request["ext_ref"] || !request["number"]) {
    res.send({ status: "error", error: "data incomplete", request : request })
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

app.listen(port, () => {            //server starts listening for any attempts from a client to connect at port: {port}
  console.log(`Now listening on port ${port}`);

});
