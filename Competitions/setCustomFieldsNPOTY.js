const MongoClient = require("mongodb").MongoClient;
const assert = require("assert");
const { forEach } = require("lodash");
require("dotenv").config();

// const url =
//   "mongodb+srv://jake:1234@svelteshared.nes56.mongodb.net/test?retryWrites=true&w=majority";
const url = "mongodb://localhost:27017?retryWrites=true&rs=true";
// const dbName = "sam_website_staging";
const dbName = "sam_website";

const client = new MongoClient(url);

const customFields = [
  {
    id: "capturedWith",
    name: "Captured With",
    type: "plainText"
  },
  {
    id: "species",
    name: "Species",
    type: "plainText"
  },
  {
    id: "location",
    name: "Location",
    type: "plainText"
  },
  {
    id: "conservationStatus",
    name: "Conservation Status",
    type: "plainText"
  },
  {
    id: "portfolioPrize",
    name: "Portfolio Prize",
    type: "boolean",
    categoryField: true,
    awardField: true
  },
  {
    id: "overallWinner",
    name: "Overall Winner",
    type: "boolean",
    categoryField: true,
    awardField: true
  }
];

client.connect(function(err) {
  assert.equal(null, err);
  console.log("Connected successfully to server");
  const db = client.db(dbName);
  return db
    .collection("competitions")
    .updateMany(
      { _id: "NPOTY" },
      { $set: { "iterations.$[].customFields": customFields } }
    );
});
