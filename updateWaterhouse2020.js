const { forEach } = require("lodash");
const MongoClient = require("mongodb").MongoClient;
const assert = require("assert");
const MIGRATION_DIR = process.cwd() + "/Waterhouse 2020/"; //process.cwd() + "/mongo/archiveMigration/"
const { readFile } = require("fs");
const excelToJson = require("convert-excel-to-json");
require("dotenv").config();

const sourceFile = MIGRATION_DIR + "2020 Waterhouse artwork info updated.xlsx";

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

  const jsonObj = excelToJson(csvConfig);

  let promiseChain = Promise.resolve();

  forEach(jsonObj, (entries, category) => {
    forEach(entries, entry => {
      entry.category = category;
      promiseChain = promiseChain.then(() => {
        return db.collection("competitionEntries").updateOne(
          { _id: `${entry.category}_${entry.title}` },
          {
            $set: {
              ...entry
              // recentlyUpdated: true
            }
          }
        );
      });
    });

    return promiseChain.then(() => {});
  });
});

const csvConfig = {
  sourceFile,
  header: {
    rows: 1
  },
  sheets: [
    {
      name: "Open Category",
      columnToKey: {
        A: "firstName",
        B: "surname",
        C: "title",
        // D: "salePrice",
        E: "material",
        G: "description"
      }
    },
    {
      name: "Emerging Artist",
      columnToKey: {
        A: "firstName",
        B: "surname",
        C: "title",
        // D: "salePrice",
        E: "material",
        G: "description"
      }
    }
  ]
};
