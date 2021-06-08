const MongoClient = require("mongodb").MongoClient;
const assert = require("assert");
const { forEach, find, map } = require("lodash");

require("dotenv").config();

// const url =
//   "mongodb+srv://jake:1234@svelteshared.nes56.mongodb.net/test?retryWrites=true&w=majority";
const url = "mongodb://localhost:27017?retryWrites=true&rs=true";
// const dbName = "sam_website_staging";
const dbName = "sam_website";

const client = new MongoClient(url);

client.connect(function (err) {
  assert.equal(null, err);
  console.log("Connected successfully to server");
  const db = client.db(dbName);

  return Promise.all([
    db.collection("competitions").findOne({ _id: "Waterhouse" }),
    db
      .collection("competitionEntries")
      .find({ competitionId: "Waterhouse", iterationId: { $ne: "2021" } })
      // .find({ competitionId: "Waterhouse", iterationId: "2014" })
      .toArray(),
  ]).then(([waterhouseComp, waterhouseEntries]) => {
    const iteration2020 = find(
      waterhouseComp.iterations,
      (i) => i.id === "2020"
    );

    const updateEntriesOps = [];

    forEach(waterhouseEntries, (entry) => {
      const awardCategories = [];
      if (entry.category) awardCategories.push(entry.category);

      if (entry.overallWinner) awardCategories.push("Overall Winner");

      updateEntriesOps.push({
        updateOne: {
          filter: { _id: entry._id },
          update: {
            $set: {
              awardCategories,
            },
          },
        },
      });
    });

    const iterationIds = [
      "2020",
      "2018",
      "2016",
      "2014",
      "2013",
      "2012",
      "2011",
      "2010",
      "2009",
      "2008",
      "2007",
      "2006",
      "2005",
      "2004",
      "2003",
    ];

    const updateFormFieldsOps = map(iterationIds, (id) => {
      return {
        updateOne: {
          filter: { _id: "Waterhouse", "iterations.id": id },
          update: {
            $set: { "iterations.$.formFields": iteration2020.customFields },
          },
        },
      };
    });

    return db
      .collection("competitions")
      .bulkWrite(updateFormFieldsOps)
      .then(() => {
        return db
          .collection("competitionEntries")
          .bulkWrite(updateEntriesOps)
          .then(() => {
            client.close();
          });
      });
  });
});
