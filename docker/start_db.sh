#!/bin/bash

# Configuration environment variables:
#   STARTER_MODE:             (single|cluster), default single
#   DOCKER_IMAGE:             ArangoDB docker image, default gcr.io/gcr-for-testing/arangodb/enterprise:latest
#   TOOLS_DOCKER_IMAGE:       ArangoDB client-tools docker image, default gcr.io/gcr-for-testing/arangodb/client-tools-preview:4-nightly
#   STARTER_DOCKER_IMAGE:     ArangoDB Starter docker image, default docker.io/arangodb/arangodb-starter:latest
#   SSL:                      (true|false), default false
#   ARANGO_LICENSE_KEY:       only required for ArangoDB Enterprise
#
# Sets root password to empty (""). Use TEST_ARANGODB_URL without user:pass in clients; send
# Basic auth as root with empty password (see arangojs connection defaults).

# EXAMPLE:
# STARTER_MODE=cluster SSL=true ./start_db.sh

# exit when any command fails
set -e

STARTER_MODE=${STARTER_MODE:=single}
DOCKER_IMAGE=${DOCKER_IMAGE:=gcr.io/gcr-for-testing/arangodb/enterprise:latest}
STARTER_DOCKER_IMAGE=${STARTER_DOCKER_IMAGE:=docker.io/arangodb/arangodb-starter:latest}
TOOLS_DOCKER_IMAGE=${TOOLS_DOCKER_IMAGE:=gcr.io/gcr-for-testing/arangodb/client-tools-preview:4-nightly}
SSL=${SSL:=false}
COMPRESSION=${COMPRESSION:=false}

docker pull "$DOCKER_IMAGE"

ARANGO_VERSION=$(docker run --rm --entrypoint arangod "$DOCKER_IMAGE" --version | awk '/^server-version:/ {print $2}')
if [ -z "$ARANGO_VERSION" ]; then
  echo "Failed to parse arangod server-version from $DOCKER_IMAGE" >&2
  exit 1
fi
ARANGO_MAJOR_VERSION=$(echo "$ARANGO_VERSION" | cut -d'.' -f1)
ARANGO_MINOR_VERSION=$(echo "$ARANGO_VERSION" | cut -d'.' -f1,2)
echo "arangod version: $ARANGO_VERSION"
echo "arangod major version: $ARANGO_MAJOR_VERSION"
echo "arangod minor version: $ARANGO_MINOR_VERSION"

if [ "$ARANGO_MAJOR_VERSION" == "3" ]; then
  TOOLS_DOCKER_IMAGE=$DOCKER_IMAGE
fi

echo "starter docker image: $STARTER_DOCKER_IMAGE"
echo "tools docker image: $TOOLS_DOCKER_IMAGE"

GW=172.28.0.1
docker network create arangodb --subnet 172.28.0.0/16 2>/dev/null || true

docker pull "$STARTER_DOCKER_IMAGE"
if [ "$TOOLS_DOCKER_IMAGE" != "$DOCKER_IMAGE" ]; then
  docker pull "$TOOLS_DOCKER_IMAGE"
fi

LOCATION=$(pwd)/$(dirname "$0")
AUTHORIZATION_HEADER=$(cat "$LOCATION"/jwtHeader)

STARTER_ARGS=
SCHEME=http
ARANGOSH_SCHEME=http+tcp
COORDINATORS=("$GW:8529" "$GW:8539" "$GW:8549")

if [ "$STARTER_MODE" == "single" ]; then
  COORDINATORS=("$GW:8529")
fi

if [ "$SSL" == "true" ]; then
    STARTER_ARGS="$STARTER_ARGS --ssl.keyfile=/data/server.pem"
    SCHEME=https
    ARANGOSH_SCHEME=http+ssl
fi

if [ "$COMPRESSION" == "true" ]; then
    STARTER_ARGS="${STARTER_ARGS} --all.http.compress-response-threshold=1"
fi

if [ "$ARANGO_MINOR_VERSION" == "3.12" ]; then
    STARTER_ARGS="${STARTER_ARGS} --all.experimental-vector-index=true"
fi

# data volume
docker create -v /data --name arangodb-data alpine:3 /bin/true
docker cp "$LOCATION"/jwtSecret arangodb-data:/data
docker cp "$LOCATION"/server.pem arangodb-data:/data

docker run -d \
    --name=adb \
    -p 8528:8528 \
    --volumes-from arangodb-data \
    -v /var/run/docker.sock:/var/run/docker.sock \
    --security-opt label=disable \
    -e ARANGO_LICENSE_KEY="$ARANGO_LICENSE_KEY" \
    "$STARTER_DOCKER_IMAGE" \
    $STARTER_ARGS \
    --docker.net-mode=default \
    --docker.container=adb \
    --auth.jwt-secret=/data/jwtSecret \
    --starter.address="${GW}" \
    --docker.image="${DOCKER_IMAGE}" \
    --starter.local --starter.mode=${STARTER_MODE} --all.log.level=debug --all.log.output=+ --log.verbose \
    --all.server.descriptors-minimum=1024 --all.javascript.allow-admin-execute=true --all.server.maximal-threads=128


wait_server() {
    # shellcheck disable=SC2091
    until $(curl --output /dev/null --insecure --fail --silent -i -H "$AUTHORIZATION_HEADER" "$SCHEME://$1/_api/version"); do
        printf '.'
        sleep 1
    done
}

echo "Waiting..."

for a in ${COORDINATORS[*]} ; do
    wait_server "$a"
done

set +e
for a in ${COORDINATORS[*]} ; do
    echo ""
    echo "Setting username and password..."
    docker run --rm "$TOOLS_DOCKER_IMAGE" arangosh --server.endpoint="$ARANGOSH_SCHEME://$a" --server.authentication=false --javascript.execute-string='require("org/arangodb/users").update("root", "")'
done
set -e

for a in ${COORDINATORS[*]} ; do
    echo ""
    echo "Requesting endpoint version..."
    curl -u root: --insecure --fail "$SCHEME://$a/_api/version"
done

echo ""
echo ""
echo "Done, your deployment is reachable at: "
for a in ${COORDINATORS[*]} ; do
    echo "$SCHEME://$a"
    echo ""
done