import admin from 'firebase-admin';
import {getStorage} from 'firebase-admin/storage';
import {Storage} from 'firebase-admin/lib/storage/storage';
import path from 'path';
import {File} from '@google-cloud/storage/build/src/file';
import fs from "fs";

let firebaseApp;
let storage: Storage;

const init = (FIREBASE_PRIVATE_KEY_FILE: string, projectId: string, storageBucket: string) => {

    const pathToFirebasePrivateKey = path.resolve(__dirname, `../../private/${FIREBASE_PRIVATE_KEY_FILE}`);
    if (!fs.existsSync(pathToFirebasePrivateKey)) {
        console.error(`File not found: ${pathToFirebasePrivateKey}`);
    }
    const serviceAccount = require(pathToFirebasePrivateKey);

  // See: https://firebase.google.com/docs/web/learn-more#config-object
  firebaseApp = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId,
    storageBucket
  });

  // Initialize Cloud Storage and get a reference to the service
  storage = getStorage(firebaseApp);
};

const upload = (filePath: string, destination?: string): Promise<string> => {
    return storage
        .bucket()
        .upload(filePath, destination ? {destination} : {})
        .then(uploadResp => {
            return uploadResp[0]
                .getSignedUrl({
                    action: 'read',
                    expires: '03-09-2491'
                })
                .then(r => r[0]); // downloadUrl
        });
}

const getFiles = (): Promise<File[]> =>
  storage
    .bucket()
    .getFiles()
    .then(r => r[0]);

const deleteFile = (fileName: string): Promise<number> =>
  storage
    .bucket()
    .file(fileName)
    .delete()
    .then(r => r[0].statusCode);

const downloadFile = async (filePath: string, destination: string) => {
  try {
    await storage.bucket().file(filePath).download({ destination });
    console.log(`✅ File downloaded to ${destination}`);
  } catch (error) {
    console.error("❌ Error downloading file:", error);
  }
}

const FirebaseApp = {init, upload, getFiles, deleteFile, downloadFile};

export default FirebaseApp;
