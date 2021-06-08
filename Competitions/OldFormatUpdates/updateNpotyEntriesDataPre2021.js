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
    db.collection("competitions").findOne({ _id: "NPOTY" }),
    db
      .collection("competitionEntries")
      .find({ competitionId: "NPOTY", iterationId: { $ne: "2021" } })
      // .find({ competitionId: "NPOTY", iterationId: "2020" })
      .toArray(),
  ]).then(([npotyComp, npotyEntries]) => {
    const iteration2021 = find(npotyComp.iterations, (i) => i._id === "2021");

    const formFields2021 = iteration2021.formFields;

    formFields2021.push({
      name: "Captured With",
      id: "capturedWith",
      display: true,
    });

    const ops = [];
    forEach(npotyEntries, (entry) => {
      const awardCategories = [entry.category];
      let iucnStatus = "";

      if (entry.portfolioPrize) awardCategories.push("Portfolio Prize");

      if (entry.overallWinner) awardCategories.push("Overall Winner");

      if (entry.conservationStatus) iucnStatus = entry.conservationStatus;

      ops.push({
        updateOne: {
          filter: { _id: entry._id },
          update: {
            $set: {
              awardCategories,
              iucnStatus,
            },
          },
        },
      });
    });

    const iterationIds = [
      "2019",
      "2018",
      "2017",
      "2016",
      "2015",
      "2014",
      "2013",
      "2012",
      "2011",
      "2010",
      "2009",
    ];

    const updateFormFieldsOps = map(iterationIds, (id) => {
      return {
        updateOne: {
          filter: { _id: "NPOTY", "iterations.id": id },
          update: { $set: { "iterations.$.formFields": formFields2021 } },
        },
      };
    });

    return db
      .collection("competitions")
      .bulkWrite(updateFormFieldsOps)
      .then(() => {
        return db
          .collection("competitionEntries")
          .bulkWrite(ops)
          .then(() => {
            client.close();
          });
      });
  });
});
