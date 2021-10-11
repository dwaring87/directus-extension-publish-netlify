#! /usr/bin/env node

const fs = require('fs');
const path = require('path');
const config = require('../../config.js');

// Get Directus Extensions Directory from .env file 
require('dotenv').config({path: process.env.DOTENV_CONFIG_PATH});
if ( !process.env[config.extension_path_env_var] ) {
    console.error("ERROR: Could not read env var " + config.extension_path_env_var + " - make sure it is exported or set in the .env file in the extensions root directory");
    process.exit(1);
}

// Set deploy path to modules directory
const deploy_dir = path.resolve(process.env[config.extension_path_env_var], "modules", config.extension);
console.log("Deploying Module to: " + deploy_dir);

// Make Module Directory
if ( !fs.existsSync(deploy_dir) ){
    fs.mkdirSync(deploy_dir, { recursive: true });
}

// Copy Files
try {
    fs.copyFileSync(path.resolve('./dist/index.js'), path.resolve(deploy_dir, 'index.js'), fs.constants.COPYFILE_FICLONE);
}
catch (err) {
    console.error("ERROR: Could not copy source file to the deploy directory!");
    process.exit(1);
}