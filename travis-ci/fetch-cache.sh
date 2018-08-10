#!/bin/sh

set -ex

MD5SUM=$(cat $(git ls-files | grep package.json | sort) | md5sum | awk '{print $1}')
CACHE_FILENAME="${MD5SUM}.tar.gz"
KEY="travis-ci-cache/${CACHE_FILENAME}"
DATE=$(date -R)

STRING_TO_SIGN_HEAD="HEAD


${DATE}
/${CACHE_BUCKET}/${KEY}"
SIGNATURE=$(/bin/echo -n "$STRING_TO_SIGN_HEAD" | openssl sha1 -hmac ${CACHE_AWS_SECRET_ACCESS_KEY} -binary | base64)

CACHE_EXISTS_STATUS_CODE=$(curl \
  -s \
  -o /dev/null \
  -w '%{http_code}' \
  --head \
  -H "Host: ${CACHE_BUCKET}.s3.amazonaws.com" \
  -H "Date: ${DATE}" \
  -H "Authorization: AWS ${CACHE_AWS_ACCESS_KEY_ID}:${SIGNATURE}" \
  https://${CACHE_BUCKET}.s3.amazonaws.com/${KEY}
)

if [ "$CACHE_EXISTS_STATUS_CODE" = "200" ]; then
  echo "Fetching cache"

  STRING_TO_SIGN_GET="GET


${DATE}
/${CACHE_BUCKET}/${KEY}"
  SIGNATURE=$(/bin/echo -n "$STRING_TO_SIGN_GET" | openssl sha1 -hmac ${CACHE_AWS_SECRET_ACCESS_KEY} -binary | base64)

  curl \
    -O \
    -H "Host: ${CACHE_BUCKET}.s3.amazonaws.com" \
    -H "Date: ${DATE}" \
    -H "Authorization: AWS ${CACHE_AWS_ACCESS_KEY_ID}:${SIGNATURE}" \
    https://${CACHE_BUCKET}.s3.amazonaws.com/${KEY} || \
  curl \
    -O \
    -H "Host: ${CACHE_BUCKET}.s3.amazonaws.com" \
    -H "Date: ${DATE}" \
    -H "Authorization: AWS ${CACHE_AWS_ACCESS_KEY_ID}:${SIGNATURE}" \
    https://${CACHE_BUCKET}.s3.amazonaws.com/${KEY}
  tar -xzf "$CACHE_FILENAME"
  rm "$CACHE_FILENAME"
else
  echo "No cache found"
fi
