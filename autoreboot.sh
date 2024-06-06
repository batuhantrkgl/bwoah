#!/bin/bash

while true
do
    pkill -f "node \."
    node .
    sleep 86400
done