const MongoClient = require("mongodb").MongoClient;
const assert = require("assert");
require("dotenv").config();

// const url =
//   "mongodb+srv://jake:1234@svelteshared.nes56.mongodb.net/test?retryWrites=true&w=majority";
const url = "mongodb://localhost:27017?retryWrites=true&rs=true";
// const dbName = "sam_website_staging";
const dbName = "sam_website";

const client = new MongoClient(url);

client.connect(function(err) {
  assert.equal(null, err);
  console.log("Connected successfully to server");
  const db = client.db(dbName);
  return db
    .collection("competitionEntries")
    .updateMany(
      { backupText: { $exists: true, $ne: "" } },
      { $set: { fromBackup: true } }
    );
});
