/**
 * Create repository tree for README
 * @author Roi C.
 * @typedef {{type: string, name: string, items: [directory]}} directory
 */
"use strict";
// import inquirer
const inquirer = require('inquirer');
const inquirerPrompt = require('inquirer-autocomplete-prompt');
// import fs
const fs = require('fs');

// will use autocomplete prompt
inquirer.registerPrompt('autocomplete', inquirerPrompt);

/**
 * folder icon and file icon
 * @type {{
 *  direcotry: string,
 *  file: string
 * }}
 */
const icons = {
    'directory': '📁',
    'file': '📄',
    'LICENSE': '🔑',
    'README': 'ℹ️',
}
/**
 * async main function
 */
async function main() {
    /**
     * @type {[directory]}
     */
    const tree = [];
    // ask for user input
    const { path } = await inquirer.prompt([
        {
            type: 'autocomplete', // type autocomplete
            name: 'path',
            message: 'Enter the path of the repository: ',
            default: './',
            source: (answersSoFar, input = "./") => {
                let first = (input[0] === "/") ? "/" : "./"; // if input is absolute path
                let path = input.split("/"); // split path
                let last = path.pop(); // get last item of path (still entering)
                try {
                    let files = fs.readdirSync(first + path.join("/"));
                    if (last) {
                        files = files.filter(file => file.includes(last));
                    }
                    files = files
                        .filter(file => fs.lstatSync((path.length) ? path.join("/") + "/" + file : file).isDirectory()) // only directories
                        .map(file => (path.length) ? path.join("/") + "/" + file : file); // add path
                    if (!input || input === './') {
                        files.unshift('./');
                    }
                    return files;
                } catch (error) {
                    return [];
                }
            }
        }
    ]);
    // check if path exists
    if (!fs.existsSync(path)) {
        console.log('Path does not exist');
        return;
    }
    // check if path is a directory
    if (!fs.lstatSync(path).isDirectory()) {
        console.log('Path is not a directory');
        return;
    }
    // get all items in the path with types
    const items = fs.readdirSync(path);
    // check if has .git folder
    if (items.includes('.git')) {
        // ask if want to save folder
        const { git_option } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'git_option',
                message: 'Do you want to ingnore \'.git\' folder?',
                default: true
            }
        ]);
        if (git_option) {
            // remove .git from items
            items.splice(items.indexOf('.git'), 1);
        }
    }
    // check if has .gitignore file
    let gitignore_content = null;
    if (items.includes('.gitignore')) {
        // ask if want to save folder
        const { gitignore_option } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'gitignore_option',
                message: 'Do you want to ignore \'.gitignore\' content?',
                default: true
            }
        ]);
        const gitignore = gitignore_option;
        // if .gitignore is ignored, then read it
        if (gitignore) {
            gitignore_content = fs.readFileSync(path + '/.gitignore', 'utf8');
            // // remove .git from items if exists
            // if (items.includes('.git')) {
            //     items.splice(items.indexOf('.git'), 1);
            // }
            gitignore_content = gitignore_content.split('\n');
            // remove '\r' from items if exists
            gitignore_content = gitignore_content.map(item => item.replace('\r', ''));
            // if last character of an gitignore_content's item is a /, then remove it
            gitignore_content = gitignore_content.map(item => item.endsWith('/') ? item.slice(0, -1) : item);
            // ignore if item is empty or starts with #
            gitignore_content = gitignore_content.filter(item => !item.startsWith('#') && item);
        }
    }
    // split gitignore content to array

    // ignore items which starts with '#'
    for (let item of items) {
        prepareItems(item, path, tree, gitignore_content);
    }

    // sort tree by type (want to folder shows first) and then sort by name
    tree.sort((a, b) => {
        if (a.type === 'directory' && b.type === 'file') {
            return -1;
        }
        if (a.type === 'file' && b.type === 'directory') {
            return 1;
        }
        return a.name.localeCompare(b.name);
    });

    // print tree
    console.log('./')
    printTree(tree, 1);

    // console.log(JSON.stringify(tree, null, 4));
}

/**
 * prepare tree of items (recursive with {@link readDirectory})
 * @param {string} item name of item
 * @param {string} path relative path of item
 * @param {[directory]} tree 
 * @param {boolean} gitignore_content 
 * @returns 
 */
function prepareItems(item, path, tree, gitignore_content) {
    if (gitignore_content?.includes(item) || gitignore_content?.includes(path + "/" + item) || gitignore_content?.includes(item + "/") || gitignore_content?.includes(path + "/" + item + "/")) {
        console.log(item);
        return;
    }
    if (fs.lstatSync(path + "/" + item).isDirectory()) {
        /** @type {directory} */
        const directory = {
            type: 'directory',
            name: item,
            items: []
        };
        tree.push(directory);
        readDirectory(item, path, directory);
    } else {
        tree.push({
            type: 'file',
            name: item
        });
    }
}

/**
 * read directory recursively and add items to tree (recursive with {@link prepareItems})
 * @param {string} item 
 * @param {string} path 
 * @param {directory} directory 
 */
function readDirectory(item, path, directory) {
    const items = fs.readdirSync(path + "/" + item);
    for (let new_item of items) {
        prepareItems(new_item, path + "/" + item, directory.items);
    }
}

/**
 * prints tree in the console (recursive)
 * @param {[directory]} tree 
 * @param {number} level level of subfolder
 * @param {[boolean]} previous_levels if previous level of subfolder was the last item of folder
 */
function printTree(tree, level, previous_levels = [false]) {
    for (let i = 0; i < tree.length; i++) {
        let is_first = (i === 0);
        let is_last = (i === tree.length - 1);
        previous_levels[level - 1] = is_last; // set previous level of subfolder for next level if is last item of folder
        printItem(tree[i].name, tree[i].type, level, is_first, is_last, previous_levels);
        if (tree[i].type === 'directory') {
            let next_levels = previous_levels.slice();
            next_levels.push(false) // add new level
            printTree(tree[i].items, level + 1, next_levels);
        }
    }
}

/**
 * print item in the console
 * @param {string} name 
 * @param {string} type 
 * @param {number} level 
 * @param {boolean} is_first 
 * @param {boolean} is_last 
 * @param {[boolean]} previous_levels 
 */
function printItem(name, type, level, is_first, is_last, previous_levels) {
    // console.log('is_first', is_first, 'is_last', is_last, 'prev_level', previous_levels)
    let to_print = '';
    for (let i = 0; i < level - 1; i++) {
        let spaces = ((i > 0) ? ' ' : '')
        to_print += spaces + (previous_levels[i] ? '   ' : '│  ');
    }
    let spaces = ((level > 1) ? ' ' : '');
    let icon = icons[type];
    // if name contains 'README'
    if (name.includes('README')) {
        icon = icons['README'];
    } else if (name.includes('LICENSE')) {
        icon = icons['LICENSE'];
    }
    console.log(to_print + spaces + (is_last ? '└── ' : '├── ') + icon + ' ' + name);
}


// run main function
main();