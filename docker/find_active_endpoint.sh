#!/bin/bash

GW=172.28.0.1
COORDINATORS=("$GW:8529" "$GW:8539" "$GW:8549")

for a in ${COORDINATORS[*]} ; do
    if curl -u root:test --silent --fail "http://$a"; then
        echo "$a"
        exit 0
    fi
done

echo "Could not find any active endpoint!"
exit 1
