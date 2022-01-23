#!/bin/bash

echo "Cleaning Storage Folders"

# Make these scripts smarter by using timestamps to remove files older than X times.

echo "Cleaning Transformed Data Stores..."
rm -rf ./storage/transformed/*
echo "Cleaning Upload Data Stores..."
rm -rf ./upload-data/*
echo "Cleaning Tenporary Video Processing Folders..."
rm -rf ./video-processing/tmp/*

echo "Cleaner complete"
