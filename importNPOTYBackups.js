const MongoClient = require("mongodb").MongoClient;
const { groupBy, find, forEach, filter } = require("lodash");
const assert = require("assert");
const MIGRATION_DIR = process.cwd() + "/NPOTY Backups/";
const { readFile } = require("fs");
const csv = require("csvtojson");
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

const categories = {
  2200: "Animal Behaviour",
  97: "Animal Portrait",
  98: "Botanical",
  99: "Landscape",
  2202: "Monochrome",
  103: "Our Impact",
  2199: "Animal Habitat",
  104: "Junior",
  102: "Interpretive",
  105: "Underwater",
  100: "Threatened Species"
  // 2198: "Portfolio Prize"
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
    _id: item.ID,
    title: item.Title,
    competitionId: "NPOTY",
    iterationId: detail.Year[0].StringValue,
    fileName: item.Image.split("/").pop(),
    photographer: detail.Photographer[0].StringValue,
    backupText: detail.Text[0].StringValue
  };

  if (entry.iterationId === "2018" || entry.iterationId === "2017") {
    console.log("exportImage -> entry.title", entry.title);
    console.log(
      "exportImage -> detail.Category[0].StringValue",
      detail.Category[0].StringValue
    );
    const splitCategories = detail.Category[0].StringValue.split(",");
    entry.category =
      categories[splitCategories[0]] || categories[splitCategories[1]];
    // entry.category = find(categories, c => {
    //   const regex = new RegExp(c, "gi");
    //   return entry.backupText.match(regex);
    // });
  } else if (detail.Text[0].StringValue.match(/OVERALL WINNER/gi))
    entry.category = "Overall Winner";
  else entry.category = item.Image.split("/")[4].replace("-", " ");

  entry.award = entry.backupText.match(/OVERALL WINNER/gi)
    ? "Overall Winner"
    : entry.backupText.match(/winner/gi)
    ? `${entry.category} Winner`
    : entry.backupText.match(/Runner/gi)
    ? `${entry.category} Runner-up`
    : "";

  entry.portfolioPrize = entry.backupText.match(/PORTFOLIO PRIZE/gi)
    ? true
    : false;

  entry.path = `competition/NPOTY/${entry.iterationId}/${entry.category}/small/${entry.fileName}`;

  const pathToFile = `${MIGRATION_DIR}${item.Image}`.replace(
    ".jpg",
    "_gallery.jpg"
  );

  return readFile(pathToFile, (err, image) => {
    uploadImage(image, `images/${entry.path}`).then(() => {
      return db.collection("competitionEntries").updateOne(
        { _id: entry._id },
        {
          $set: entry
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

  let promiseChain = Promise.resolve();
  return Promise.all([
    csv().fromFile(MIGRATION_DIR + "backupCSVs/n2Item.csv"),
    csv().fromFile(MIGRATION_DIR + "backupCSVs/n2Detail.csv")
  ]).then(([items, details]) => {
    details = groupBy(details, "ItemID");

    items = filter(items, i => i.Type === "GalleryPhotographPage");

    forEach(items, item => {
      const detail = groupBy(details[item.ID], "Name");
      if (detail.Year[0].StringValue === "2009") {
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
