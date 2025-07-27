import express from 'express';
import bodyParser from 'body-parser';

import { Client } from 'pg';

const client = new Client({
    user: 'postgres',
    host: 'localhost',
    database: 'blog',
    password: '', // add your password if needed
    port: 5432,
});

client.connect()
    .then(() => {
        console.log('Connected to PostgreSQL database: blog');
    })
    .catch((err) => {
        console.error('Failed to connect to PostgreSQL', err);
    });



// sample articles
var db_articles = [
    {
        id: 0,
        title: 'Article 1 on topic 1',
        author: 'peter',
        date: new Date(),
        content: 'This is the content of article 1'
    },
    {
        id: 1,
        title: 'Article 2 on topic 2',
        author: 'peter',
        date: new Date(),
        content: 'This is the content of article 2'
    }
];


const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// functions
function getCurrentID(db_articles) {
    return db_articles[db_articles.length - 1].id;
}

function locateArticle(id) {
    for (var article of db_articles) {
        if (article.id == id) {
            return article;
        }
    }
}

var current_id = getCurrentID(db_articles);


// show all posted articles
app.get('/', (req, res) => {
    res.render('index.ejs', { articles: db_articles });
});

// redirect to new post route
app.get('/post', (req, res) => {

    // var dummy_article = {
    //     id: current_id,
    //     title: 'Sample title...',
    //     author: 'Sample author...',
    //     date: '',
    //     content: 'Sample content...'
    // };

    // res.render('edit.ejs', { article: dummy_article });
    res.render('post.ejs');
});

// process new post
app.post('/submit', (req, res) => {
    current_id++;

    var new_article = {
        id: db_articles.length,
        title: req.body["title"],
        author: req.body["author"],
        date: new Date(),
        content: req.body["content"]
    }
    db_articles.push(new_article);

    res.redirect('/');
});

// edit article
app.post('/edit', (req, res) => {
    var id = req.body["id"];

    var edit_article = locateArticle(id);
    console.log(edit_article);

    res.render('edit.ejs', { article: edit_article });
});

app.post('/submit-edited', (req, res) => {
    var edit_article = {
        id: req.body["id"],
        title: req.body["title"],
        author: req.body["author"],
        date: new Date(),
        content: req.body["content"]
    }
    db_articles[edit_article.id] = edit_article;

    res.redirect('/');
});


app.listen(port, () => {
    console.log(`Listening on port ${port}`);
});