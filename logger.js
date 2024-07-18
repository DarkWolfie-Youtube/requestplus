module.exports = {
    info, 
    error,
    warn,
    debug
}


const fs = require('node:fs');
const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
const reset = "\x1b[0m"
const applicationname = "\x1b[37m[" +config.info.applicationname + "] "

function error(error) {
    console.log(applicationname + "\x1b[31m[ERROR] " + error + reset)
    
}
function warn(warning) {
    console.log(applicationname + "\x1b[33m[WARN] " + warning + reset)
    

}
async function info(info) {
    console.log(applicationname + "\x1b[34m[INFO] " + info + reset)
    
}
function debug(debug) {
    console.log(applicationname + "\x1b[36m[DEBUG] " + debug + reset)
}