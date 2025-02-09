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
        .then(files => Promise.all(files.map(f => FirebaseApp.downloadFile(f.name, './' + f.name)))
            .then(() => './' + files[0].name.slice(0, -3)))
        .catch(log);
}

(async () => {
    const backupPrefix = await firebaseDownloadBackups();
    // const backupPrefix = './backups/trader-dev/trader-dev_dump_2025-02-08_23-55-07_ab'.slice(0, -3);
    const commandConcat = `cat ${backupPrefix}_* > ${backupPrefix}.gz`;
    console.log(commandConcat);
    if (shell.exec(commandConcat).code !== 0) {
        console.log('cat backup chunks error');
    } else {
        const commandRemoveChunks = `rm ${backupPrefix}_*`;
        console.log(commandRemoveChunks);
        if (shell.exec(commandRemoveChunks).code !== 0) {
            console.log('rm backup chunks error');
        } else {}
    }
    console.log('Backup downloaded!');
})();
