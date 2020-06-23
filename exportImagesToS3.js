const { forEach, find } = require("lodash");
const MongoClient = require("mongodb").MongoClient;
const assert = require("assert");
const MIGRATION_DIR = process.cwd() + "/HDMS/"; //process.cwd() + "/mongo/archiveMigration/"
const { readFile, readdirSync, existsSync } = require("fs");
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

const uploadImage = function(fileBuffer, provenanceId, id) {
  const uploadImagePromise = new Promise((resolve, reject) => {
    s3.putObject(
      {
        Bucket: S3_BUCKET_NAME,
        Key: `images/archives/${provenanceId}/${id}`,
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

function exportTindaleImages() {
  readFile(`${MIGRATION_DIR}/../tindaleTribes.jpg`, (err, tindaleImage) => {
    if (tindaleImage) {
      uploadImage(tindaleImage, "tribes", "tindale_tribes");
    }
  });
  readFile(`${MIGRATION_DIR}/../boundariesMap.jpg`, (err, mapImage) => {
    if (mapImage) {
      uploadImage(mapImage, "tribes", "boundaries_map");
    }
  });
}

function exportImages(db, provenance) {
  const folderName = provenance.PROV_ID.replace(/\s/g, "");
  let hasArchiveImage = false;
  let hasHeroImage = false;
  console.log("exportImages -> folderName", folderName);
  readFile(
    `${MIGRATION_DIR}${folderName}/web/images/hero.jpg`,
    (err, heroImage) => {
      if (heroImage) {
        console.log("exportImages -> heroImage", heroImage);
        hasHeroImage = true;
        uploadImage(
          heroImage,
          provenance.PROV_ID,
          `${provenance.PROV_ID}_hero`
        );
      }
    }
  );
  if (existsSync(`${MIGRATION_DIR}${folderName}/Documentation`)) {
    const documentationFiles = readdirSync(
      `${MIGRATION_DIR}${folderName}/Documentation`,
      { withFileTypes: true }
    )
      .filter(dirent => dirent.isFile())
      .map(dirent => dirent.name);
    const provPageImage = find(documentationFiles, file =>
      file.match(/^archives/)
    );
    if (provPageImage) {
      hasArchiveImage = true;
      readFile(
        `${MIGRATION_DIR}${folderName}/Documentation/${provPageImage}`,
        (err, imageFile) => {
          uploadImage(
            imageFile,
            provenance.PROV_ID,
            `${provenance.PROV_ID}_archives`
          );
        }
      );
    }
  }

  if (hasArchiveImage || hasHeroImage) {
    return db
      .collection("Archive_provenance")
      .updateOne(
        { _id: provenance._id },
        { $set: { hasArchiveImage, hasHeroImage } }
      );
  }
  // if (provenance.HTMLPHOTOS && provenance.HTMLPHOTOS.length) {
  //   forEach(provenance.HTMLPHOTOS, image => {
  //     if (!image || !image.JPG) return;
  //     const imageUrl = `${MIGRATION_DIR}${provenance.PROV_ID}/web/${image.JPG}`;
  //     readFile(imageUrl, (err, imageFile) => {
  //       uploadImage(imageFile, image.JPG);
  //       console.log("exportImages -> imageUrl", imageUrl);
  //     });
  //   });
  // }
}
// }
// );

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
    .find({
      // $or: [{ PROV_ID: { $regex: /^A/i } }, { PROV_ID: { $regex: /^SAMA/i } }]
      PROV_ID: "AA1"
    })
    .toArray()
    .then(provenances => {
      console.log("provenances length", provenances.length);
      let promiseChain = Promise.resolve();
      promiseChain = promiseChain.then(() => {
        exportTindaleImages();
      });
      forEach(provenances, provenance => {
        promiseChain = promiseChain.then(() => {
          exportImages(db, provenance);
        });
      });

      return promiseChain.then(() => {
        client.close();
      });
    });
});
