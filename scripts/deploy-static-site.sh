#!/usr/bin/env bash
set -euo pipefail

: "${APP_URL:?APP_URL must be set}"
: "${AWS_ACCESS_KEY_ID:?OBJECT_STORAGE_ACCESS_TOKEN secret must be set}"
: "${AWS_SECRET_ACCESS_KEY:?OBJECT_STORAGE_SECRET_TOKEN secret must be set}"
: "${OBJECT_STORAGE_BUCKET:?OBJECT_STORAGE_BUCKET must be set}"
: "${OBJECT_STORAGE_ENDPOINT:?OBJECT_STORAGE_ENDPOINT must be set}"

if [[ "$OBJECT_STORAGE_ENDPOINT" != https://* ]]; then
  echo 'OBJECT_STORAGE_ENDPOINT must be an HTTPS S3-compatible API endpoint.'
  exit 1
fi

export AWS_DEFAULT_REGION="${OBJECT_STORAGE_REGION:-us-east-1}"
export AWS_EC2_METADATA_DISABLED=true

storage() {
  aws --endpoint-url "$OBJECT_STORAGE_ENDPOINT" s3 "$@"
}

for required_file in dist/index.html dist/sw.js dist/version.json; do
  if [[ ! -f "$required_file" ]]; then
    echo "Missing required build output: $required_file"
    exit 1
  fi
done

expected_build="$(node --input-type=commonjs -e "const v=require('./dist/version.json'); process.stdout.write(v.build || '')")"
if [[ -z "$expected_build" ]]; then
  echo 'dist/version.json does not contain a build identifier.'
  exit 1
fi

# Upload immutable, content-hashed bundles first. Old bundles are intentionally
# retained so clients that are already open can finish using their release.
storage sync dist/assets "s3://${OBJECT_STORAGE_BUCKET}/assets" \
  --cache-control 'public,max-age=31536000,immutable' \
  --only-show-errors

# Public assets do not yet have hashed names, so keep their browser lifetime
# short. The control files below are uploaded separately and published last.
storage sync dist "s3://${OBJECT_STORAGE_BUCKET}" \
  --exclude 'assets/*' \
  --exclude 'index.html' \
  --exclude 'sw.js' \
  --exclude 'version.json' \
  --cache-control 'public,max-age=86400' \
  --only-show-errors

storage cp dist/index.html "s3://${OBJECT_STORAGE_BUCKET}/index.html" \
  --cache-control 'no-cache,max-age=0,must-revalidate' \
  --content-type 'text/html; charset=utf-8' \
  --only-show-errors

storage cp dist/sw.js "s3://${OBJECT_STORAGE_BUCKET}/sw.js" \
  --cache-control 'no-cache,max-age=0,must-revalidate' \
  --content-type 'text/javascript; charset=utf-8' \
  --only-show-errors

# version.json is the release pointer and is deliberately written last.
storage cp dist/version.json "s3://${OBJECT_STORAGE_BUCKET}/version.json" \
  --cache-control 'no-store' \
  --content-type 'application/json; charset=utf-8' \
  --only-show-errors

origin_build="$(storage cp "s3://${OBJECT_STORAGE_BUCKET}/version.json" - --only-show-errors | node --input-type=commonjs -e "let s=''; process.stdin.on('data', c => s += c).on('end', () => process.stdout.write(JSON.parse(s).build || ''))")"
if [[ "$origin_build" != "$expected_build" ]]; then
  echo "Origin build $origin_build does not match expected build $expected_build."
  exit 1
fi

cache_buster="${GITHUB_RUN_ID:-manual}-$(date +%s)"
public_version="$(curl --fail --silent --show-error \
  --retry 10 \
  --retry-all-errors \
  --retry-delay 3 \
  "${APP_URL%/}/version.json?deployment=${cache_buster}")"
if [[ "$public_version" != *"\"build\":\"${expected_build}\""* ]]; then
  echo 'The public version.json is stale. Check the provider cache policy or purge its CDN cache.'
  exit 1
fi

expected_entry="$(grep -oE 'assets/index-[^\"]+\.js' dist/index.html | head -n 1)"
public_index="$(curl --fail --silent --show-error \
  --retry 10 \
  --retry-all-errors \
  --retry-delay 3 \
  "${APP_URL%/}/?deployment=${cache_buster}")"
if [[ -z "$expected_entry" || "$public_index" != *"$expected_entry"* ]]; then
  echo 'The public index is stale. Check the provider cache policy or purge its CDN cache.'
  exit 1
fi

echo "Deployed ${expected_build} to ${APP_URL%/}."
