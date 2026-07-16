#!/usr/bin/bash

npm exec --yes mongosh -- mongodb://mongo:27017/?directConnection=true --eval "rs.initiate({_id: 'rs0', members: [{_id: 0, host: 'localhost:27017'}]})"
