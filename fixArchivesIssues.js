const MongoClient = require("mongodb").MongoClient;
const assert = require("assert");

// const url =
//   "mongodb+srv://jake:1234@svelteshared.nes56.mongodb.net/test?retryWrites=true&w=majority";
const url = "mongodb://localhost:27017";
// const dbName = "sam_website_staging";
const dbName = "sam_website";

const client = new MongoClient(url);

// Use connect method to connect to the Server
client.connect(function(err) {
  assert.equal(null, err);
  console.log("Connected successfully to server");

  const db = client.db(dbName);

  //Series linked to AA 266 had a type in their PROV_ID
  return Promise.all([
    db
      .collection("Archive_series")
      .updateMany({ PROV_ID: "AA266" }, { $set: { PROV_ID: "AA 266" } }),
    db
      .collection("Archive_series")
      .updateMany({ PROV_ID: "AA60" }, { $set: { PROV_ID: "AA 60" } })
  ]);
});
