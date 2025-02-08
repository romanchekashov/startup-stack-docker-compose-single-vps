import fs from 'fs';
import * as cron from 'node-cron';
import * as shell from 'shelljs';
import FirebaseApp from '../utils/FirebaseApp';
import {outOfLimit, round} from '../utils/utils';

/**
 * https://www.digitalocean.com/community/tutorials/nodejs-cron-jobs-by-examples
 * [*\/30 * * * * *] - every 30 sec
 * [0 23 * * *] - every day at 23:00
 * https://stackoverflow.com/questions/24718706/backup-restore-a-dockerized-postgresql-database
 *
 * Backup:
 * docker exec [DOCKER_CONTAINER_NAME] pg_dump -p [POSTGRES_PORT] -U [POSTGRES_USER] -Fc [DB_NAME] > [DB_NAME]_dump_`date +%Y-%m-%d"_"%H_%M_%S`.gz
 *
 * Restore:
 * docker cp [DB_NAME]_dump_31-10-2021_19_07_30.gz fd16ae8b3bd7:/home
 * docker exec -e PGPASSWORD=<env.POSTGRES_PASSWORD> [DOCKER_CONTAINER_NAME] pg_restore -p [POSTGRES_PORT] -U [POSTGRES_USER] -d [DB_NAME] -j 12 home/[DB_NAME]_dump_31-10-2021_19_07_30.gz
 *
 */

// http://www.cronmaker.com/?0
const CRON_EVERYDAY_AT_4_00 = '0 4 * * *';
// at 08:00:00, 16:00:00, 00:00:00
const CRON_AT_0_MINUTES_PAST_THE_HOUR_EVERY_8_HOURS = '0 */8 * * *';
const CRON_EVERY_30_SEC = '*/30 * * * * *';

const cronSchedule = process.env.CRON_BACKUP_SCHEDULE ?? CRON_EVERYDAY_AT_4_00;
const FIREBASE_UPLOAD_BACKUPS_LIMIT = +(process.env.FIREBASE_UPLOAD_BACKUPS_LIMIT ?? 0);
const LOCAL_BACKUPS_LIMIT = +(process.env.LOCAL_BACKUPS_LIMIT ?? 2);
const DB_DUMP_TIMESTAMP_END = '_dump_`date +%Y-%m-%d"_"%H-%M-%S`.gz';
const MAX_FILE_UPLOAD_SIZE_IN_MB = 2048;
const MAX_FILE_UPLOAD_SIZE_IN_KB = 2097152;

interface Backup {
  backupDir: string;
  dbName: string;
  backupFileName: () => string;
  dbContainer: string;
  backup: () => string;
}

const backups: Backup[] = parseConfigPostgres();
console.log('Backups:', backups);
let isCronRunning = false;

cron.schedule(cronSchedule, doBackups);

// (async () => {
//   console.log('Initial backup...');
//   await doBackups();
// })();

async function doBackups() {
  if (isCronRunning) {
    console.log('Cron is already running...');
    return;
  }

  try {
    isCronRunning = true;

    for (const backup of backups) {
      shell.mkdir('-p', backup.backupDir);
      await createBackup(backup);
    }
  } catch (e) {
    console.log(e);
  } finally {
    isCronRunning = false;
  }
}

// TODO Divide backup to chunks less then 2GB to Firebase storage upload + need script to restore DB from chunks!
async function createBackup(bp: Backup) {
  const {backupDir, dbName} = bp;
  const backup = bp.backup();
  const log = (...args: any[]) => console.log(new Date(), `db:[${dbName}]`, ...args);

  log('\nDatabase backup start');

  removeOldLocalBackups(backupDir, log);

  if (shell.exec(backup).code !== 0) {
    log('Database backup error');
  } else {
    const files: string[] = fs.readdirSync(backupDir);
    const lastFileName = files[files.length - 1];
    const lastBackupFilePath = `${backupDir}/${lastFileName}`;
    log(`📂 Files in "${backupDir}":`);

    const stats = fs.statSync(lastBackupFilePath);
    const lastBackupFileSizeInKb = stats.size / 1024; // Convert bytes to KB

    log(`Database backup complete: ${lastBackupFilePath}, ${lastBackupFileSizeInKb} KB`);

    if (lastBackupFileSizeInKb > MAX_FILE_UPLOAD_SIZE_IN_KB) {
      const prefix = lastFileName.slice(0, -3) + '_';
      const commandSplit = `split -b 2048m ${lastBackupFilePath} ${prefix}`;
      log(commandSplit);
      if (shell.exec(commandSplit).code !== 0) {
        log('Split backup error');
      } else {
        if (FIREBASE_UPLOAD_BACKUPS_LIMIT && lastBackupFileSizeInKb > 1) {
          const backupChunks = fs.readdirSync(backupDir)
              .filter(f => f.includes(prefix))
              .map(f => `${backupDir}/${f}`);
          await firebaseUploadBackups(backupDir, log, backupChunks);
          backupChunks.forEach(filePath => {
            try {
              fs.unlinkSync(filePath);
              log(`File removed: ${filePath}`);
            } catch (err) {
              log(err);
            }
          });
        }
      }
    } else {
      // Upload backup if only it contains smth.
      if (FIREBASE_UPLOAD_BACKUPS_LIMIT && lastBackupFileSizeInKb > 1) {
        await firebaseUploadBackups(backupDir, log, [lastBackupFilePath]);
      }
    }
  }
}

function parseConfigPostgres(): Backup[] {
  let i = 1;
    const backups: Backup[] = [];
    while (process.env[`POSTGRES_PORT_USER_DBNAME_CONTAINER_${i}`]) {
      const [port, user, dbName, dbContainer] = process.env[`POSTGRES_PORT_USER_DBNAME_CONTAINER_${i}`]!.split(',');
      console.log(`Postgres backup config: ${port}, ${user}, ${dbName}, ${dbContainer}`);
      backups.push({
        backupDir: `./backups/${dbName}`,
        dbName,
        backupFileName: function () { return this.dbName + DB_DUMP_TIMESTAMP_END; },
        dbContainer,
        backup: function () {
          return `docker exec ${this.dbContainer} pg_dump -p ${port ?? 5432} -U ${user ?? 'postgres'} -Fc ${this.dbName} > ${this.backupDir}/${this.backupFileName()}`; }
      });
      i++;
    }
    return backups;
}

function removeOldLocalBackups(backupDir: string, log = console.log) {
  const files: string[] = fs.readdirSync(backupDir);
  outOfLimit(files, LOCAL_BACKUPS_LIMIT).forEach(file => {
    try {
      fs.unlinkSync(`${backupDir}/${file}`);
      log(`File removed: ${backupDir}/${file}`);
    } catch (err) {
      log(err);
    }
  });
}

function firebaseUploadBackups(backupDir: string, log = console.log, lastBackupFilePath: string[]) {
  log('Uploading backup to Firebase: ' + lastBackupFilePath);
  return FirebaseApp.getFiles()
      .then(files => files.filter(({name}) => !name.includes('images/')))
      .then(files => files.filter(({name}) => name.includes(backupDir.substring(2))))
      .then(files => {
        return Promise.all(
            // outOfLimit(files, FIREBASE_UPLOAD_BACKUPS_LIMIT)
            files.map(file =>
                FirebaseApp.deleteFile(file.name).then(r => {
                  log(`Backup ${file.name} was deleted from Firebase. - ${r}`);
                  return file.name;
                })
            )
        );
      })
      .then(() => Promise.all(lastBackupFilePath
          .map(filePath => FirebaseApp.upload(filePath, filePath.substring(2))
              .then(downloadUrl => {
        log(`Database backup [${filePath}] uploaded to Firebase: ${downloadUrl}`);
      }))))
      .catch(log);
}
