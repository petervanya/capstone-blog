import express from 'express';
import bodyParser from 'body-parser';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = 3000;

// Set up EJS as view engine
app.set('view engine', 'ejs');
app.set('views', './views');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// pg.Pool is used to manage a pool of clients and allows multiple
// simultaneous connections to the database, which is efficient for
// handling many queries in a web server.
// pg.Client, on the other hand, is a single client connection to the
// database and is typically used for simple scripts or when you need
// fine-grained control over the connection lifecycle.
// Here, we use pg.Pool to efficiently manage connections for our
// Express app.
const pool = new pg.Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: 5432,
});

// Routes for serving pages
app.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM posts ORDER BY created_at DESC');
    res.render('index', { posts: result.rows });
  } catch (err) {
    console.error('Error fetching posts:', err);
    res.render('index', { posts: [], error: 'Error loading posts' });
  }
});

app.get('/post', (req, res) => {
  res.render('post');
});

app.get('/edit/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM posts WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.redirect('/');
    }
    res.render('edit', { post: result.rows[0] });
  } catch (err) {
    console.error('Error fetching post:', err);
    res.redirect('/');
  }
});

// View a single post
app.get('/view/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM posts WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.redirect('/');
    }
    res.render('view', { post: result.rows[0] });
  } catch (err) {
    console.error('Error fetching post:', err);
    res.redirect('/');
  }
});

// Create a new post (server-side route)
app.post('/create', async (req, res) => {
  const { title, content } = req.body;
  if (!title || !content) {
    return res.render('post', { error: 'Title and content are required' });
  }

  try {
    await pool.query(
      'INSERT INTO posts (title, content) VALUES ($1, $2)',
      [title, content]
    );
    res.redirect('/'); // Redirect to home page after creation
  } catch (err) {
    console.error('Error creating post:', err);
    res.render('post', { error: 'Error creating post' });
  }
});

// Update a post (server-side route)
app.post('/update/:id', async (req, res) => {
  const { title, content } = req.body;
  if (!title || !content) {
    return res.render('edit', { post: req.body, error: 'Title and content are required' });
  }

  try {
    const result = await pool.query(
      'UPDATE posts SET title = $1, content = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
      [title, content, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.redirect('/');
    }
    res.redirect('/'); // Redirect to home page after update
  } catch (err) {
    console.error('Error updating post:', err);
    res.render('edit', { post: req.body, error: 'Error updating post' });
  }
});

// Delete a post (server-side route)
app.post('/delete/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM posts WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }
    res.redirect('/'); // Redirect back to home page after deletion
  } catch (err) {
    console.error('Error deleting post:', err);
    res.status(500).json({ error: 'Error deleting post' });
  }
});

app.listen(port, () => {
  console.log(`Blog app listening at http://localhost:${port}`);
});
