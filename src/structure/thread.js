const APIObject = require("./apiobject");
const Post = require("./post");
const User = require("./user");
const Util = require("../util");

/**
 * Represents a MangaDex forum/comments thread
 */
class Thread extends APIObject {
    parse(data) {
        /**
         * MangaDex Thread ID
         * @type {Number}
         */
        this.id = data.id;

        /**
         * Number of pages read for this thread (Web Parsing)
         * @type {Number}
         */
        this.pages = data.pages;

        /**
         * Array of posts in this thread (Web Parsing)
         * @type {Array<Post>}
         */
        this.posts = [];

        // Keep this last
        if (!(data.postID && data.userID && data.username && data.text)) return; // Abort if missing any
        for (let i = 0; i < data.postID.length; i++) {
            let author = new User(data.userID[i], true);
            author.username = data.username[i];

            this.posts.push(new Post(data.postID[i], author, data.text[i]));
        }
    }

    /**
     * @param {Number} pages How many pages to read? Default: 1
     */
    fill(id, pages) {
        const web = "https://mangadex.org/thread/"; 
        if (!id) id = this.id;
        if (!pages) pages = 1;

        return new Promise((resolve, reject) => {
            let obj = {id: id, pages: 0}; // Pages integer to keep track of fufilled requests
            let pageObjects = new Array(pages); // Array of matches objects

            for (let page = 1; page <= pages; page++) {
                Util.getMatches(web + id.toString() + "/" + page.toString(), {
                    "postID": /<tr[^>]+id=["']post_(\d+)["'][^>]*>/gmi,
                    "userID": /<div[^>]+>[\s]+<span[^>]+><a[^>]+href=["']\/user\/(\d+)\/[^"']+["'][^>]*>/gmi,
                    "username": /<div[^>]+>[\s]+<span[^>]+><a[^>]+>([^<]+)</gmi,
                    "text": /<div[^>]+class=["']postbody mb-3 mt-4["'][^>]*>((?:(?!<\/div>)[\w\W])+)<\/div>/gmi
                }, (matches, res) => {
                    let pageNum = parseInt(/\/(\d+)$/.exec(res.url)[1]);
                    pageObjects[pageNum - 1] = matches;

                    obj.pages++; // Add completed request to counter
                    if (obj.pages == pages) { // Upon final request completion...
                        for (let p of pageObjects) {
                            for (let e in p) { // For every element in each page
                                if (!obj[e]) obj[e] = p[e]
                                else obj[e] = obj[e].concat(p[e]);
                            }
                        }
                        this.parse(obj);
                        resolve(this);
                    }
                }).on('error', reject);;
            }
        });
    }

    /**
     * Gets full MangaDex HTTPS link. 
     * @param {"id"} property A property in this object
     * Unknown properties defaults to MangaDex's homepage
     * @returns {String} String with link
     */
    getFullURL(property) {
        const homepage = "https://mangadex.org"
        switch(property) {
            default:
                return homepage;
            case "id":
                return homepage + "/thread/" + this.id.toString();
        }
    }
}

module.exports = Thread;