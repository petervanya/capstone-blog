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

const pool = new pg.Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: 5432,
});

// Serve static files
app.use(express.static('public'));

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

// API Routes
// Get all posts
app.get('/posts', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM posts ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching posts' });
  }
});

// Get one post
app.get('/posts/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM posts WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Post not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching post' });
  }
});

// Create a new post
app.post('/posts', async (req, res) => {
  const { title, content } = req.body;
  if (!title || !content) return res.status(400).json({ error: 'Title and content required' });

  try {
    const result = await pool.query(
      'INSERT INTO posts (title, content) VALUES ($1, $2) RETURNING *',
      [title, content]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error creating post' });
  }
});

// Edit a post
app.put('/posts/:id', async (req, res) => {
  const { title, content } = req.body;
  if (!title || !content) return res.status(400).json({ error: 'Title and content required' });

  try {
    const result = await pool.query(
      'UPDATE posts SET title = $1, content = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
      [title, content, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Post not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error updating post' });
  }
});

// Delete a post
app.delete('/posts/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM posts WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Post not found' });
    res.json({ message: 'Post deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Error deleting post' });
  }
});

app.listen(port, () => {
  console.log(`Blog app listening at http://localhost:${port}`);
});
