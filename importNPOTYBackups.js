const MongoClient = require("mongodb").MongoClient;
const { groupBy, join, map, filter } = require("lodash");
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
  const pathToFile =
    entry.award && entry.award.match(/PORTFOLIO/gi)
      ? `${MIGRATION_DIR}Small watermarked/Portfolio watermarked/${entry.fileName}`
      : entry.award && entry.award.match(/OVERALL WINNER/gi)
      ? `${MIGRATION_DIR}Small watermarked/OW watermarked/${entry.fileName}`
      : `${MIGRATION_DIR}Small watermarked/${entry.category} watermarked/${entry.fileName}`;

  if (
    entry.award &&
    (entry.award.match(/PORTFOLIO/gi) || entry.award.match(/OVERALL WINNER/gi))
  )
    delete entry.award;

  const imagePath = `competition/NPOTY/2019/${entry.category}/small/${entry.fileName}`;

  return readFile(pathToFile, (err, image) => {
    // uploadImage(image, `images/${imagePath}`).then(() => {
    return db.collection("competitionEntries").updateOne(
      { _id: `${entry.category}_${entry.title}` },
      {
        $set: {
          ...entry,
          path: imagePath,
          competitionId: "NPOTY",
          iterationId: "2019"
        }
      },
      { upsert: true }
    );
    // });
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
    csv().fromFile(MIGRATION_DIR + "backupCSVs/Photograph.csv"),
    csv().fromFile(MIGRATION_DIR + "backupCSVs/SubmittedEntry.csv"),
    csv().fromFile(MIGRATION_DIR + "backupCSVs/UserProfile.csv"),
    csv().fromFile(MIGRATION_DIR + "backupCSVs/Category.csv")
  ]).then(([photographs, submittedEntries, profiles, categories]) => {
    submittedEntries = groupBy(submittedEntries, "Id");
    profiles = groupBy(profiles, "Id");
    categories = groupBy(categories, "Id");

    //TODO only use photographs that were finalists
    photographs = filter(photographs.slice(10, 15), p => p.SubmittedEntry_Id);

    const entries = map(photographs, entry => {
      const category = categories[entry.CategoryId][0];
      console.log("category", category);
      const submittedEntry = submittedEntries[entry.SubmittedEntry_Id][0];
      console.log("submittedEntry", submittedEntry);
      const profile = profiles[submittedEntry.User_Id][0];
      console.log("profile", profile);

      return {
        _id: submittedEntry.Id,
        category: category.Name,
        title: entry.Title,
        location: entry.WhereTaken,
        description: entry.OtherDetails,
        capturedWith: formatCapturedWith(entry),
        photographer: formatPhotographer(profile)
      };
    });
    console.log("entries", entries);

    return promiseChain.then(() => {
      // client.close();
    });
  });
});

function formatCapturedWith(entry) {
  const parts = [];
  if (entry.Camera && entry.Camera !== "Not sure") parts.push(entry.Camera);
  if (entry.Lens && entry.Lens !== "Not sure") parts.push(entry.Lens);
  if (entry.ShutterSpeed && entry.ShutterSpeed !== "Not sure")
    parts.push(entry.ShutterSpeed);
  if (entry.FStop && entry.FStop !== "Not sure") parts.push(entry.FStop);
  if (entry.ISO && entry.ISO !== "Not sure") parts.push(`ISO ${entry.ISO}`);

  return join(parts, ", ");
}

function formatPhotographer(profile) {
  return `${profile.FirstName} ${profile.Surname}, ${profile.StateTerritory}`;
}
