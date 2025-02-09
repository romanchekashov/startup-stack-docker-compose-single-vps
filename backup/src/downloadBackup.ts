import * as shell from 'shelljs';
import FirebaseApp from "./utils/FirebaseApp";

require('dotenv').config({path: '../.env.local'});

FirebaseApp.init(
    process.env.FIREBASE_PRIVATE_KEY_FILE ?? 'firebase-private-key.json',
    process.env.FIREBASE_PROJECT_ID ?? 'startup-stack-cd14f',
    process.env.FIREBASE_STORAGE_BUCKET ?? 'gs://startup-stack-cd14f.appspot.com'
);

const include = process.argv[process.argv.length - 1];
console.log(include);
// process.argv.forEach(function (val, index, array) {
//     console.log(index + ': ' + val);
//   });

function firebaseDownloadBackups(log = console.log) {
    return FirebaseApp.getFiles()
        .then(files => files.filter(({name}) => !name.includes('images/')))
        .then(files => files.filter(({name}) => name.includes(include)))
        .then(files => {
            files.forEach(f => log(f));
            // FirebaseApp.downloadFile(f.name)
        //   return Promise.all(
        //       // outOfLimit(files, FIREBASE_UPLOAD_BACKUPS_LIMIT)
        //       files.map(file =>
        //           FirebaseApp.deleteFile(file.name).then(r => {
        //             log(`Backup ${file.name} was deleted from Firebase. - ${r}`);
        //             return file.name;
        //           })
        //       )
        //   );
        })
        .catch(log);
}

(async () => {
    await firebaseDownloadBackups();
    // const commandConcat = `cat trader-dev_dump_2025-02-08_18_01_26_* > trader-dev_dump_2025-02-08_04-00-31__.gz`;
    // console.log(commandConcat);
    // if (shell.exec(commandConcat).code !== 0) {
    //     console.log('Split backup error');
    // } else {}
})();

console.log('Backup downloaded!');
