const { forEach } = require("lodash");
const MongoClient = require("mongodb").MongoClient;
const assert = require("assert");
const MIGRATION_DIR = process.cwd() + "/HDMS/"; //process.cwd() + "/mongo/archiveMigration/"
const fs = require("fs");
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
        Key: `images/archives/${id}`,
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

function exportImages(provenance) {
  fs.readFile(
    `${MIGRATION_DIR}${provenance.PROV_ID}/web/images/hero.jpg`,
    (err, heroImage) => {
      if (heroImage) {
        console.log("exportImages -> heroUrl", `${provenance.PROV_ID}_hero`);
        uploadImage(heroImage, `${provenance.PROV_ID}_hero.jpg`);
      }
      if (provenance.HTMLPHOTOS && provenance.HTMLPHOTOS.length) {
        forEach(provenance.HTMLPHOTOS, image => {
          if (!image || !image.JPG) return;
          const imageUrl = `${MIGRATION_DIR}${provenance.PROV_ID}/web/${image.JPG}`;
          fs.readFile(imageUrl, (err, imageFile) => {
            uploadImage(imageFile, image.JPG);
            console.log("exportImages -> imageUrl", imageUrl);
          });
        });
      }
    }
  );
}

// const url =
//   "mongodb+srv://jake:nSTpXARKE48oeRCU@svelteshared.nes56.mongodb.net/test?retryWrites=true&w=majority";
const url = "mongodb://localhost:27017";
const dbName = "sam_website";

const client = new MongoClient(url);

client.connect(function(err) {
  assert.equal(null, err);
  console.log("Connected successfully to server");

  const db = client.db(dbName);
  directoryPromise = [];

  return db
    .collection("Archive_provenance")
    .find({ PROV_ID: "AA207" })
    .toArray()
    .then(provenances => {
      console.log("provenances length", provenances.length);
      let promiseChain = Promise.resolve();
      forEach(provenances, provenance => {
        promiseChain = promiseChain.then(() => {
          exportImages(provenance);
        });
      });

      return promiseChain.then(() => {
        client.close();
      });
    });
});
