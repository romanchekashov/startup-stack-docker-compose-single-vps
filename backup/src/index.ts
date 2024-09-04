import FirebaseApp from "./utils/FirebaseApp";

require('dotenv').config({path: '../.env.local'});

FirebaseApp.init(
    process.env.FIREBASE_PRIVATE_KEY_FILE ?? 'firebase-private-key.json',
    process.env.FIREBASE_PROJECT_ID ?? 'startup-stack-cd14f',
    process.env.FIREBASE_STORAGE_BUCKET ?? 'gs://startup-stack-cd14f.appspot.com'
);
// cron tasks
require('./scheduled-jobs/db-backup');

console.log('Devops manager running...');
