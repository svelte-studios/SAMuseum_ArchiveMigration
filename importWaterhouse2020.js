const { forEach, startCase, toLower } = require("lodash");
const MongoClient = require("mongodb").MongoClient;
const assert = require("assert");
const MIGRATION_DIR = process.cwd() + "/Waterhouse 2020/"; //process.cwd() + "/mongo/archiveMigration/"
const { readFile } = require("fs");
const excelToJson = require("convert-excel-to-json");
const awsSDK = require("aws-sdk");
require("dotenv").config();

const S3_BUCKET_NAME = process.env.S3_BUCKET;
const S3_ACCESS_KEY_ID = process.env.S3_ACCESS_KEY_ID;
const S3_SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY;
const AWS_REGION = process.env.AWS_REGION || "ap-southeast-2";

awsSDK.config.update({
  accessKeyId: S3_ACCESS_KEY_ID,
  secretAccessKey: S3_SECRET_ACCESS_KEY,
  region: AWS_REGION
});

const s3 = new awsSDK.S3();

const sourceFile = MIGRATION_DIR + "2020 Waterhouse artwork info.xlsx";

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

function exportImage(db, entry) {
  const pathToFile = `${MIGRATION_DIR}/Images ${entry.category}/${entry.fileName}`;

  const imagePath = `competition/Waterhouse/2020/${entry.category}/small/${entry.fileName}`;

  readFile(pathToFile, (err, image) => {
    if (entry.title === "Adrift (∆Asea-ice)")
      console.log("exportImage -> Video: ", image);
    if (!image) console.log("exportImage -> NO IMAGE: ", entry);
    uploadImage(image, `images/${imagePath}`).then(() => {
      return db.collection("competitionEntries").updateOne(
        { _id: `${entry.category}_${entry.title}` },
        {
          $set: {
            ...entry,
            path: imagePath,
            competitionId: "Waterhouse",
            iterationId: "2020"
          }
        },
        { upsert: true }
      );
    });
  });
}

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
      entry.photographer = `${entry.firstName} ${entry.surname}`;
      if (entry.fileName && entry.fileName.match(/mp4/)) entry.video = true;
      promiseChain = promiseChain.then(() => {
        exportImage(db, entry);
      });
    });
  });

  return promiseChain.then(() => {});
});

const csvConfig = {
  sourceFile,
  header: {
    rows: 1
  },
  sheets: [
    {
      name: "Open",
      columnToKey: {
        A: "firstName",
        B: "surname",
        C: "title",
        D: "material",
        E: "description",
        F: "fileName"
      }
    },
    {
      name: "Emerging Artist",
      columnToKey: {
        A: "firstName",
        B: "surname",
        C: "title",
        D: "material",
        E: "dimensions",
        F: "description",
        G: "fileName"
      }
    }
  ]
};
