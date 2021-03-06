'use strict';

const fs = require('fs');
const paths = require('path');
const _ = require('underscore');

const path = `/tmp/monitordata`;
const minPeriod = 20;
const maxFileNums = 5;

// 检测路径首尾slash
// 'path', '/path', '/path/' => 'path/', '//' => '/'
let toLastSlash = (path) => {
    // rm first slash
    if(path[0] === '/'){
        path = path.substring(1);
    }

    // add last slash
    if(path[path.length - 1] !== '/'){
        path = `${path}/`;
    }

    path = path.replace(/\/\//g, '/');

    return path;
};

let isDir = (dirName) => {
      return exists(dirName) && fs.statSync(dirName).isDirectory();
};

//创建文件夹
function mkdir(pos, dirArray, marvin_save) {
    var len = dirArray.length;
    if( pos >= len || pos > 10){
        marvin_save();
        return;
    }

    var currentDir = '';
    for(var i = 1; i <= pos; i++){
        currentDir += `/${dirArray[i]}`;
    }

    fs.exists(currentDir, function(exists){
        if(!exists){
            fs.mkdir(currentDir, 777, function(err){
                if(err){
                    console.error(err);
                }else{
                    mkdir(pos+1, dirArray, marvin_save);
                }
            });
        }else{
            mkdir(pos+1, dirArray, marvin_save);
        }
    });
}
 
//创建目录结构
let mkdirs = (dirpath, marvin_save) => {
    var dirArray = dirpath.split('/');
    fs.exists(dirpath, function(exists){
        if(!exists){
            mkdir(1, dirArray, function(){
                marvin_save();
            });
        }else{
            marvin_save();
        }
    });

}

let exists = (filepath) => {
    return fs.existsSync(filepath);
}

let countFile = (dirName) => {
    if(!dirName){
        throw new Error(`dirName or rootFileDir should not empty`);
    }

    dirName     = toLastSlash(dirName);
    let lists = [];
    let rootPath = `${path}/${dirName}`;

    _.each(fs.readdirSync(rootPath), (v) => {
        let file = fs.statSync(rootPath + v);

        lists.push({
            type: file.isFile(dirName + v) ? 'file' : 'folder',
            name: v,
            length: file.size,
        });
    });

    return Promise.resolve(lists.length);
};

let error_log = (msg, fileName, mode) => {
    fs.writeFile(fileName, `${msg}\n`, {flag: 'a'}, function (err) {
        if(mode){
            fs.chmodSync(fileName, 755);
        }
        return Promise.resolve(!err);
    });
};

module.exports = function(msg, period, delay) {
    return Promise.resolve()
    .then(() => mkdirs(`${path}/${period}`, function(){
        let now = +new Date();
        let fileName = `${path}/${period}/${(now-now%(period*1000))/1000-delay*period}.log`;
        if(exists(fileName)){
            return error_log(msg, fileName, false);
        }else{
            return countFile(period)
            .then((count) => {
                if (count - 2 >= maxFileNums) {
                    return Promise.resolve(false);
                }else{
                    return error_log(msg, fileName, true);
                }
            });
        }
    }))
    .catch((e) => console.error(e));
}