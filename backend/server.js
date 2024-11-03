const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

mongoose.connect('mongodb://mongo:27017/examToolboxDB', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

app.get('/', (req, res) => {
    res.send('API is running...');
});

// API endpoint for testing. Run the docker container and navigate to this url to check.
app.get('/api/test', (req, res) => {
    res.json({ message: 'Hello this is the Backend calling!' });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
