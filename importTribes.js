const { forEach, toLower, merge } = require("lodash");
const MongoClient = require("mongodb").MongoClient;
const assert = require("assert");
const MIGRATION_DIR = process.cwd() + "/";
const { readdirSync } = require("fs");
const csv = require("csvtojson");
const slugify = require("slugify");
const uniqid = require("uniqid");

const $id = () => {
  return uniqid.process();
};

const getCsvFiles = source =>
  readdirSync(source, { withFileTypes: true })
    .filter(dirent => {
      return dirent.name.toLowerCase().substr(-3) === "csv";
    })
    .map(dirent => dirent.name);

// const url =
//   "mongodb+srv://jake:1234@svelteshared.nes56.mongodb.net/test?retryWrites=true&w=majority";
const url = "mongodb://localhost:27017";

// const dbName = "sam_website_staging";
const dbName = "sam_website";

const client = new MongoClient(url);

client.connect(function(err) {
  assert.equal(null, err);
  console.log("Connected successfully to server");

  const db = client.db(dbName);
  readAndExecute("HDMS/Data")
    .then(results => {
      forEach(results, doc => {
        db.collection("Archive_tribe").insertOne(
          {
            _id: $id(),
            ...doc,
            slug: `/collection/archives/language_groups/${slugify(
              toLower(doc.TTRIBE)
            )}`
          },
          {
            w: "majority",
            wtimeout: 10000,
            serializeFunctions: true
          },
          function(err, r) {
            assert.equal(null, err);
            assert.equal(1, r.insertedCount);
          }
        );
      });
      client.close();
    })
    .catch(err => {
      console.log(err);
    });
});

function readCsv(filePath) {
  return csv()
    .fromFile(filePath)
    .then(function(jsonArrayObj) {
      //when parse finished, result will be emitted here.
      //console.log(jsonArrayObj);
      return jsonArrayObj;
    })
    .catch(err => {
      console.log(filePath + " " + err);
    });
}

function readAndExecute(folder) {
  var masterJson = {};
  var promises = [];
  var fileArray = getCsvFiles(MIGRATION_DIR + folder);
  forEach(fileArray, fileName => {
    //console.log("HEELL");
    promises.push(readCsv(MIGRATION_DIR + folder + "/" + fileName));
  });
  return Promise.all(promises).then(results => {
    TindaleTribes = results[fileArray.indexOf("TindaleTribes.csv")];
    InventorySearch = results[fileArray.indexOf("InventorySearch.csv")];
    TindaleTribesIndex = results[fileArray.indexOf("TindaleTribesIndex.csv")];

    let merged = [];

    forEach(TindaleTribes, tribe => {
      tribe["inventory"] = TindaleTribesIndex.filter(
        itmInner => itmInner.Tribe === tribe.TTRIBE
      );
      forEach(tribe["inventory"], inventoryItem => {
        searchObject = InventorySearch.filter(
          itmInner => itmInner.ITEM_ID === inventoryItem.Item_id
        );
        // inventoryItem = {...inventoryItem, ...searchObject}
        merge(inventoryItem, ...searchObject);
      });
    });

    // for(let i=0; i<TindaleTribesIndex.length; i++) {
    //     merged.push({...TindaleTribesIndex[i], ...(TindaleTribes.find((itmInner) => itmInner.TTRIBE === TindaleTribesIndex[i].Tribe))});
    //     TindaleTribesIndex[i]["TribeInfo"] =
    // }

    // let merged2 = [];

    // for(let i=0; i<InventorySearch.length; i++) {
    //     merged2.push({...InventorySearch[i], ...(merged.find((itmInner) => itmInner.Item_id === InventorySearch[i].ITEM_ID))}
    //     );
    // }

    return TindaleTribes;
  });
}
