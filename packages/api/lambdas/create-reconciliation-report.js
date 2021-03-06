'use strict';

const moment = require('moment');
const {
  aws: {
    buildS3Uri,
    S3ListObjectsV2Queue,
    s3
  },
  constructCollectionId
} = require('@cumulus/common');

const { CMR, CMRSearchConceptQueue } = require('@cumulus/cmrjs');
const { Collection, Granule, FileClass } = require('../models');
const { deconstructCollectionId } = require('../lib/utils');

/**
 * Verify that all objects in an S3 bucket contain corresponding entries in
 * DynamoDB, and that there are no extras in either S3 or DynamoDB
 *
 * @param {string} Bucket - the bucket containing files to be reconciled
 * @returns {Promise<Object>} a report
 */
async function createReconciliationReportForBucket(Bucket) {
  const s3ObjectsQueue = new S3ListObjectsV2Queue({ Bucket });
  const dynamoDbFilesLister = new FileClass().getFilesForBucket(Bucket);

  let okFileCount = 0;
  const onlyInS3 = [];
  const onlyInDynamoDb = [];

  let [nextS3Object, nextDynamoDbItem] = await Promise.all([s3ObjectsQueue.peek(), dynamoDbFilesLister.peek()]); // eslint-disable-line max-len
  while (nextS3Object && nextDynamoDbItem) {
    const nextS3Uri = buildS3Uri(Bucket, nextS3Object.Key);
    const nextDynamoDbUri = buildS3Uri(Bucket, nextDynamoDbItem.key);

    if (nextS3Uri < nextDynamoDbUri) {
      // Found an item that is only in S3 and not in DynamoDB
      onlyInS3.push(nextS3Uri);
      s3ObjectsQueue.shift();
    }
    else if (nextS3Uri > nextDynamoDbUri) {
      // Found an item that is only in DynamoDB and not in S3
      const dynamoDbItem = await dynamoDbFilesLister.shift(); // eslint-disable-line no-await-in-loop, max-len
      onlyInDynamoDb.push({
        uri: buildS3Uri(Bucket, dynamoDbItem.key),
        granuleId: dynamoDbItem.granuleId
      });
    }
    else {
      // Found an item that is in both S3 and DynamoDB
      okFileCount += 1;
      s3ObjectsQueue.shift();
      dynamoDbFilesLister.shift();
    }

    [nextS3Object, nextDynamoDbItem] = await Promise.all([s3ObjectsQueue.peek(), dynamoDbFilesLister.peek()]); // eslint-disable-line max-len, no-await-in-loop
  }

  // Add any remaining S3 items to the report
  while (await s3ObjectsQueue.peek()) { // eslint-disable-line no-await-in-loop
    const s3Object = await s3ObjectsQueue.shift(); // eslint-disable-line no-await-in-loop
    onlyInS3.push(buildS3Uri(Bucket, s3Object.Key));
  }

  // Add any remaining DynamoDB items to the report
  while (await dynamoDbFilesLister.peek()) { // eslint-disable-line no-await-in-loop
    const dynamoDbItem = await dynamoDbFilesLister.shift(); // eslint-disable-line no-await-in-loop
    onlyInDynamoDb.push({
      uri: buildS3Uri(Bucket, dynamoDbItem.key),
      granuleId: dynamoDbItem.granuleId
    });
  }

  return {
    okFileCount,
    onlyInS3,
    onlyInDynamoDb
  };
}

/**
 * Compare the collection holdings in CMR with Cumulus
 *
 * @returns {Promise<Object>} an object with the okCollections, onlyInCumulus and
 * onlyInCmr
 */
async function reconciliationReportForCollections() {
  // compare collection holdings:
  //   Get list of collections from CMR
  //   Get list of collections from CUMULUS
  //   Report collections only in CMR
  //   Report collections only in CUMULUS

  // get all collections from CMR and sort them, since CMR query doesn't support
  // 'Version' as sort_key
  const cmr = new CMR(process.env.cmr_provider, process.env.cmr_client_id);
  const cmrCollectionItems = await cmr.searchCollections({}, 'umm_json');
  const cmrCollectionIds = cmrCollectionItems.map((item) =>
    constructCollectionId(item.umm.ShortName, item.umm.Version)).sort();

  // get all collections from database and sort them, since the scan result is not ordered
  const dbCollectionsItems = await new Collection().getAllCollections();
  const dbCollectionIds = dbCollectionsItems.map((item) =>
    constructCollectionId(item.name, item.version)).sort();

  const okCollections = [];
  let collectionsOnlyInCumulus = [];
  let collectionsOnlyInCmr = [];

  let nextDbCollectionId = (dbCollectionIds.length !== 0) ? dbCollectionIds[0] : null;
  let nextCmrCollectionId = (cmrCollectionIds.length !== 0) ? cmrCollectionIds[0] : null;

  while (nextDbCollectionId && nextCmrCollectionId) {
    if (nextDbCollectionId < nextCmrCollectionId) {
      // Found an item that is only in database and not in cmr
      await dbCollectionIds.shift(); // eslint-disable-line no-await-in-loop
      collectionsOnlyInCumulus.push(nextDbCollectionId);
    }
    else if (nextDbCollectionId > nextCmrCollectionId) {
      // Found an item that is only in cmr and not in database
      collectionsOnlyInCmr.push(nextCmrCollectionId);
      cmrCollectionIds.shift();
    }
    else {
      // Found an item that is in both cmr and database
      okCollections.push(nextDbCollectionId);
      dbCollectionIds.shift();
      cmrCollectionIds.shift();
    }

    nextDbCollectionId = (dbCollectionIds.length !== 0) ? dbCollectionIds[0] : null;
    nextCmrCollectionId = (cmrCollectionIds.length !== 0) ? cmrCollectionIds[0] : null;
  }

  // Add any remaining database items to the report
  collectionsOnlyInCumulus = collectionsOnlyInCumulus.concat(dbCollectionIds);

  // Add any remaining CMR items to the report
  collectionsOnlyInCmr = collectionsOnlyInCmr.concat(cmrCollectionIds);

  return {
    okCollections,
    onlyInCumulus: collectionsOnlyInCumulus,
    onlyInCmr: collectionsOnlyInCmr
  };
}

/**
 * Compare the granule holdings in CMR with Cumulus
 *
 * @param {string} collectionId - the collection which has the granules to be reconciled
 * @returns {Promise<Object>} an object with the okGranulesInDb, okGranulesInCmr, onlyInCumulus,
 * onlyInCmr
 */
async function reconciliationReportForGranules(collectionId) {
  // compare granule holdings:
  //   Get CMR granules list (by PROVIDER, short_name, version, sort_key: ['granule_ur'])
  //   Get CUMULUS granules list (by collectionId order by granuleId)
  //   Report granules only in CMR
  //   Report granules only in CUMULUS
  const { name, version } = deconstructCollectionId(collectionId);
  const cmrGranulesIterator = new CMRSearchConceptQueue(
    process.env.cmr_provider, process.env.cmr_client_id, 'granules',
    { short_name: name, version: version, sort_key: ['granule_ur'] }, 'umm_json'
  );

  const dbGranulesIterator = new Granule().getGranulesForCollection(collectionId);

  const okGranulesInDb = [];
  const okGranulesInCmr = [];
  const granulesOnlyInDb = [];
  const granulesOnlyInCmr = [];

  let [nextDbItem, nextCmrItem] = await Promise.all([dbGranulesIterator.peek(), cmrGranulesIterator.peek()]); // eslint-disable-line max-len

  while (nextDbItem && nextCmrItem) {
    const nextDbGranuleId = nextDbItem.granuleId;
    const nextCmrGranuleId = nextCmrItem.umm.GranuleUR;

    if (nextDbGranuleId < nextCmrGranuleId) {
      // Found an item that is only in database and not in cmr
      granulesOnlyInDb.push({ granuleId: nextDbGranuleId, collectionId: collectionId });
      await dbGranulesIterator.shift(); // eslint-disable-line no-await-in-loop
    }
    else if (nextDbGranuleId > nextCmrGranuleId) {
      // Found an item that is only in cmr and not in database
      granulesOnlyInCmr.push({
        GranuleUR: nextCmrGranuleId,
        ShortName: nextCmrItem.umm.CollectionReference.ShortName,
        Version: nextCmrItem.umm.CollectionReference.Version
      });
      await cmrGranulesIterator.shift(); // eslint-disable-line no-await-in-loop
    }
    else {
      // Found an item that is in both cmr and database,
      // save the information for file comparison later
      okGranulesInDb.push({
        granuleId: nextDbGranuleId,
        collectionId: collectionId,
        files: nextDbItem.files
      });
      okGranulesInCmr.push({
        GranuleUR: nextCmrGranuleId,
        ShortName: nextCmrItem.umm.CollectionReference.ShortName,
        Version: nextCmrItem.umm.CollectionReference.Version,
        RelatedUrls: nextCmrItem.umm.RelatedUrls
      });
      await dbGranulesIterator.shift(); // eslint-disable-line no-await-in-loop
      await cmrGranulesIterator.shift(); // eslint-disable-line no-await-in-loop
    }

    [nextDbItem, nextCmrItem] = await Promise.all([dbGranulesIterator.peek(), cmrGranulesIterator.peek()]); // eslint-disable-line max-len, no-await-in-loop
  }

  // Add any remaining DynamoDB items to the report
  while (await dbGranulesIterator.peek()) { // eslint-disable-line no-await-in-loop
    const dbItem = await dbGranulesIterator.shift(); // eslint-disable-line no-await-in-loop
    granulesOnlyInDb.push({ granuleId: dbItem.granuleId, collectionId: collectionId });
  }

  // Add any remaining CMR items to the report
  while (await cmrGranulesIterator.peek()) { // eslint-disable-line no-await-in-loop
    const cmrItem = await cmrGranulesIterator.shift(); // eslint-disable-line no-await-in-loop
    granulesOnlyInCmr.push({
      GranuleUR: cmrItem.umm.GranuleUR,
      ShortName: nextCmrItem.umm.CollectionReference.ShortName,
      Version: nextCmrItem.umm.CollectionReference.Version
    });
  }

  return {
    okGranulesInDb,
    okGranulesInCmr,
    onlyInCumulus: granulesOnlyInDb,
    onlyInCmr: granulesOnlyInCmr
  };
}
// export for testing
exports.reconciliationReportForGranules = reconciliationReportForGranules;

/**
 * Compare the holdings in CMR with Cumulus' internal data store, report any discrepancies
 *
 * @returns {Promise<Object>} a reconciliation report
 */
async function reconciliationReportForCumulusCMR() {
  const collectionReport = await reconciliationReportForCollections();
  const collectionsInCumulusCmr = {
    okCollectionCount: collectionReport.okCollections.length,
    onlyInCumulus: collectionReport.onlyInCumulus,
    onlyInCmr: collectionReport.onlyInCmr
  };

  // create granule report for collections in both Cumulus and CMR
  const promisedGranuleReports = collectionReport.okCollections.map((collectionId) =>
    reconciliationReportForGranules(collectionId));
  const granuleReports = await Promise.all(promisedGranuleReports);

  const granulesInCumulusCmr = {
    okGranuleCount: 0,
    onlyInCumulus: [],
    onlyInCmr: []
  };
  granuleReports.forEach((granuleReport) => {
    granulesInCumulusCmr.okGranuleCount += granuleReport.okGranulesInDb.length;
    granulesInCumulusCmr.onlyInCumulus = granulesInCumulusCmr
      .onlyInCumulus.concat(granuleReport.onlyInCumulus);
    granulesInCumulusCmr.onlyInCmr = granulesInCumulusCmr.onlyInCmr.concat(granuleReport.onlyInCmr);
  });

  return { collectionsInCumulusCmr, granulesInCumulusCmr };
}

/**
 * Create a Reconciliation report and save it to S3
 *
 * @param {Object} params - params
 * @param {string} params.systemBucket - the name of the CUMULUS system bucket
 * @param {string} params.stackName - the name of the CUMULUS stack
 *   DynamoDB
 * @returns {Promise<null>} a Promise that resolves when the report has been
 *   uploaded to S3
 */
async function createReconciliationReport(params) {
  const {
    systemBucket,
    stackName
  } = params;

  // Fetch the bucket names to reconcile
  const bucketsConfigJson = await s3().getObject({
    Bucket: systemBucket,
    Key: `${stackName}/workflows/buckets.json`
  }).promise()
    .then((response) => response.Body.toString());
  const dataBuckets = Object.values(JSON.parse(bucketsConfigJson))
    .filter((config) => config.name !== systemBucket)
    .map((config) => config.name);

  // Write an initial report to S3
  const filesInCumulus = {
    okFileCount: 0,
    onlyInS3: [],
    onlyInDynamoDb: []
  };
  const collectionsInCumulusCmr = {
    okCollectionCount: 0,
    onlyInCumulus: [],
    onlyInCmr: []
  };
  const granulesInCumulusCmr = {
    okGranuleCount: 0,
    onlyInCumulus: [],
    onlyInCmr: []
  };
  let report = {
    reportStartTime: moment.utc().toISOString(),
    reportEndTime: null,
    status: 'RUNNING',
    error: null,
    filesInCumulus,
    collectionsInCumulusCmr,
    granulesInCumulusCmr
  };

  const reportKey = `${stackName}/reconciliation-reports/report-${report.reportStartTime}.json`;

  await s3().putObject({
    Bucket: systemBucket,
    Key: reportKey,
    Body: JSON.stringify(report)
  }).promise();

  // Create a report for each bucket
  const promisedBucketReports = dataBuckets.map((bucket) =>
    createReconciliationReportForBucket(bucket));
  const bucketReports = await Promise.all(promisedBucketReports);

  // compare CUMULUS internal holdings in s3 and database
  bucketReports.forEach((bucketReport) => {
    filesInCumulus.okFileCount += bucketReport.okFileCount;
    filesInCumulus.onlyInS3 = filesInCumulus.onlyInS3.concat(bucketReport.onlyInS3);
    filesInCumulus.onlyInDynamoDb = filesInCumulus
      .onlyInDynamoDb.concat(bucketReport.onlyInDynamoDb);
  });

  // compare the CUMULUS holdings with the holdings in CMR
  const cumulusCmrReport = await reconciliationReportForCumulusCMR();
  report = Object.assign(report, cumulusCmrReport);

  // Create the full report
  report.reportEndTime = moment.utc().toISOString();
  report.status = 'SUCCESS';

  // Write the full report to S3
  return s3().putObject({
    Bucket: systemBucket,
    Key: reportKey,
    Body: JSON.stringify(report)
  }).promise()
    .then(() => null);
}

function handler(event, _context, cb) {
  // increase the limit of search result from CMR.searchCollections/searchGranules
  process.env.CMR_LIMIT = process.env.CMR_LIMIT || 5000;
  process.env.CMR_PAGE_SIZE = process.env.CMR_PAGE_SIZE || 200;

  return createReconciliationReport({
    systemBucket: event.systemBucket || process.env.system_bucket,
    stackName: event.stackName || process.env.stackName
  })
    .then(() => cb(null))
    .catch(cb);
}
exports.handler = handler;
