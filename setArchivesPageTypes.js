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

client.connect(function(err) {
  assert.equal(null, err);
  console.log("Connected successfully to server");
  const db = client.db(dbName);
  return Promise.all([
    db
      .collection("Archive_inventory")
      .updateMany({}, { $set: { pageType: "archivesItem" } })
  ]);
});

// the-museum/about/the-south-australian-museum
// the-museum/about/governance
// the-museum/about/aboriginal-heritage-repatriation
// visit/families-educators/teaching-resources
// information-resources/archives
// evolutionary-biology-research
// wk43r9ba1
// collection/biological-sciences/biological-tissues
// pk4djgccg
// collection/biological-sciences/parasites
// birds-research
// marine-invertebrates-research
// parasites-research
// mapping-family
// aurora-symposium
// mammal-ageing-facility
// /gecko-family-tree
// research/aboriginal-heritage-project
// research/biological-sciences/birds-research
// research/biological-sciences/marine-invertebrates-research
// research/biological-sciences/parasites-research
// collection/biological-sciences-collection
// collection/archives
