const { forEach, find, map } = require("lodash");
const MongoClient = require("mongodb").MongoClient;
const assert = require("assert");
const MIGRATION_DIR = process.cwd() + "/HDMS/"; //process.cwd() + "/mongo/archiveMigration/"
const { readFile, readFileSync, readdirSync, existsSync } = require("fs");
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
  console.log("exportImages -> provenance.PROV_ID", provenance.PROV_ID);
  const folderName = provenance.PROV_ID.replace(/\s/g, "");
  let hasArchiveImage = false;
  let inventoryImagesData = [];
  let hasHeroImage = false;
  readFile(
    `${MIGRATION_DIR}${folderName}/web/images/hero.jpg`,
    (err, heroImage) => {
      if (heroImage) {
        hasHeroImage = true;
        // uploadImage(
        //   heroImage,
        //   provenance.PROV_ID,
        //   `${provenance.PROV_ID}_hero`
        // );
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
          // uploadImage(
          //   imageFile,
          //   provenance.PROV_ID,
          //   `${provenance.PROV_ID}_archives`
          // );
        }
      );
    }
  }

  if (existsSync(`${MIGRATION_DIR}${folderName}/web/images`)) {
    const inventoryImages = readdirSync(
      `${MIGRATION_DIR}${folderName}/web/images`,
      { withFileTypes: true }
    )
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
    console.log("inventoryImages", inventoryImages);
    forEach(inventoryImages, imageFolder => {
      if (
        existsSync(
          `${MIGRATION_DIR}${folderName}/web/images/${imageFolder}/large`
        )
      ) {
        const largeImages = readdirSync(
          `${MIGRATION_DIR}${folderName}/web/images/${imageFolder}/large`,
          { withFileTypes: true }
        )
          .filter(dirent => dirent.isFile())
          .map(dirent => dirent.name);

        const currentImages = { id: imageFolder, images: [] };

        forEach(largeImages, imageName => {
          // console.log(
          //   "`${provenance.PROV_ID}/${imageFolder}`",
          //   `${provenance.PROV_ID}/${imageFolder}`
          // );
          // console.log("imageName", imageName);
          if (imageName.match(/(\.jpg)/gi)) {
            // readFile(
            //   `${MIGRATION_DIR}${folderName}/web/images/${imageFolder}/large/${imageName}`,
            //   (err, imageFile) => {
            //     console.log("imageName", imageName);

            //     if (imageFile) {
            //       currentImages.images.push(imageName);
            //       // uploadImage(
            //       //   imageFile,
            //       //   `${provenance.PROV_ID}/inventoryImages/${imageFolder}`,
            //       //   imageName
            //       // );
            //     }
            //   }
            // );
            const imageFile = readFileSync(
              `${MIGRATION_DIR}${folderName}/web/images/${imageFolder}/large/${imageName}`
            );
            console.log("imageName", imageName);

            if (imageFile) {
              currentImages.images.push(imageName);
              // uploadImage(
              //   imageFile,
              //   `${provenance.PROV_ID}/inventoryImages/${imageFolder}`,
              //   imageName
              // );
            }
          }
        });

        console.log("currentImages", currentImages);
        if (currentImages.images.length) {
          inventoryImagesData.push(currentImages);
        }
      }
    });
  }

  console.log("inventoryImagesData", inventoryImagesData);
  if (!hasArchiveImage) {
    return db
      .collection("Archive_provenance")
      .deleteOne({ _id: provenance._id });
  } else if (inventoryImagesData.length) {
    // console.log("Uploading images for: ", provenance.PROV_ID);
    // console.log("Count: ", inventoryImagesData.length);
    const ops = map(inventoryImagesData, i => {
      return {
        updateOne: {
          filter: { ITEM_ID: i.id },
          update: {
            $set: { images: i.images }
          }
        }
      };
    });

    if (ops && ops.length)
      return db
        .collection("Archive_inventory")
        .bulkWrite(ops, { ordered: false });
    else {
      return db
        .collection("Archive_inventory")
        .updateMany({ PROV_ID: provenance.PROV_ID }, { images: [] });
    }
  }
  // if (hasArchiveImage || hasHeroImage) {
  //   return db
  //     .collection("Archive_provenance")
  //     .updateOne(
  //       { _id: provenance._id },
  //       { $set: { hasArchiveImage, hasHeroImage } }
  //     );
  // }
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
//   "mongodb+srv://jake:1234@svelteshared.nes56.mongodb.net/test?retryWrites=true&w=majority";
const url = "mongodb://localhost:27017";
// const dbName = "sam_website_staging";
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
      // PROV_ID: "AA169"
    })
    .toArray()
    .then(provenances => {
      console.log("provenances length", provenances.length);
      let promiseChain = Promise.resolve();
      // promiseChain = promiseChain.then(() => {
      //   exportTindaleImages();
      // });
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
