const MongoClient = require("mongodb").MongoClient;
const { groupBy, startCase, forEach, filter } = require("lodash");
const assert = require("assert");
const MIGRATION_DIR = process.cwd() + "/Waterhouse Backups/";
const { readFile } = require("fs");
const csv = require("csvtojson");
const awsSDK = require("aws-sdk");
require("dotenv").config();

const S3_BUCKET_NAME = process.env.S3_BUCKET;
const S3_ACCESS_KEY_ID = process.env.S3_ACCESS_KEY_ID;
const S3_SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY;
const AWS_REGION = process.env.AWS_REGION || "ap-southeast-2";

let items = require(`${MIGRATION_DIR}items.js`);
let details = require(`${MIGRATION_DIR}itemDetails.js`);

awsSDK.config.update({
  accessKeyId: S3_ACCESS_KEY_ID,
  secretAccessKey: S3_SECRET_ACCESS_KEY,
  region: AWS_REGION
});

const s3 = new awsSDK.S3();

const categories = {
  556: "Youth Art Prize",
  555: "Sculpture and Objects",
  554: "Works on Paper",
  553: "Paintings"
};

const uploadImage = function(fileBuffer, id) {
  const uploadImagePromise = new Promise((resolve, reject) => {
    s3.putObject(
      {
        Bucket: S3_BUCKET_NAME,
        Key: id,
        Body: fileBuffer,
        ACL: "public-read",
        ContentEncoding: "base64"
      },
      (err, result) => {
        if (err) reject(err);
        resolve(result);
      }
    );
  });

  return uploadImagePromise.then(result => {
    return result;
  });
};

function exportImage(db, item, detail) {
  const entry = {
    _id: `Waterhouse_${item.ID}`,
    title: item.Title,
    competitionId: "Waterhouse",
    iterationId: detail.Year[0].StringValue,
    fileName: item.Image.split("/").pop(),
    photographer: detail.Photographer[0].StringValue,
    backupText: detail.Text[0].StringValue,
    fromBackup: true
  };

  if (entry.iterationId === "2018" || entry.iterationId === "2016") {
    if (entry.backupText.match(/Category: Open|Open Category/gi))
      entry.category = "Open Category";
    else if (entry.backupText.match(/Category: Emerging|Emerging Category/gi))
      entry.category = "Emerging Artist";
  } else {
    entry.category =
      detail.Category && detail.Category[0]
        ? categories[detail.Category[0].StringValue]
        : "";
  }

  entry.awardWinner =
    detail.IsAWinner && detail.IsAWinner[0].BoolValue === "True" ? true : false;

  entry.path = `competition/Waterhouse/${entry.iterationId}/${entry.category ||
    "None"}/small/${entry.fileName}`;

  const pathToFile = `${MIGRATION_DIR}${item.Image}`.replace(
    ".jpg",
    "_original.jpg"
  );

  return readFile(pathToFile, (err, image) => {
    if (!image) console.log("No Image Found for: ", entry.title);
    // uploadImage(image, `images/${entry.path}`).then(() => {
    return db.collection("competitionEntries").updateOne(
      { _id: entry._id },
      {
        $set: entry
      },
      { upsert: true }
    );
    // });
  });
}

const url =
  "mongodb+srv://jake:1234@svelteshared.nes56.mongodb.net/test?retryWrites=true&w=majority";
// const url = "mongodb://localhost:27017?retryWrites=true&rs=true";
const dbName = "sam_website_staging";
// const dbName = "sam_website";

const client = new MongoClient(url);

client.connect(function(err) {
  assert.equal(null, err);
  console.log("Connected successfully to server");
  const importYear = process.argv.slice(2)[0];

  if (!importYear)
    throw new Error("No Year Provided, provide via command line");

  const db = client.db(dbName);

  let promiseChain = Promise.resolve();

  details = groupBy(details, "ItemID");

  return db
    .collection("competitionEntries")
    .deleteMany({ competitionId: "Waterhouse", iterationId: `${importYear}` })
    .then(() => {
      forEach(items, item => {
        const detail = groupBy(details[item.ID], "Name");
        if (detail.Year[0].StringValue === importYear) {
          promiseChain = promiseChain.then(() => {
            exportImage(db, item, detail);
          });
        }
      });

      return promiseChain.then(() => {
        // client.close();
      });
    });
});
// });
