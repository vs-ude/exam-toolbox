const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// MongoDB connection
mongoose.connect('mongodb://mongo:27017/examToolboxDB', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => {
    console.log('MongoDB connected');
}).catch((error) => {
    console.log('MongoDB connection error:', error);
});

const examSchema = new mongoose.Schema({
    name: { type: String, required: true },
    comment: { type: String, required: true }
});

const Exam = mongoose.model('Exam', examSchema);

app.post('/api/exams', async (req, res) => {
    const { name, comment } = req.body;
    try {
        const exam = new Exam({ name, comment });
        await exam.save();
        res.status(200).json({ message: 'Exam saved successfully!' });
    } catch (err) {
        res.status(500).json({ message: 'Error saving exam', error: err });
    }
});

app.get('/', (req, res) => {
    res.send('API is running...');
});

app.get('/api/exams', (req, res) => {
    Exam.find()  // Finds exams in the db
      .then((exams) => {
        res.status(200).json(exams);  // Respond with list of exams
    })
    .catch((err) => {
        console.error("Errir fetcgubg exans: ", err)
        res.status(500).json({ message: 'Error fetching exams', error: err });
    });
});
  

// API endpoint for testing. Run the docker container and navigate to this url to check.
app.get('/api/test', (req, res) => {
    res.json({ message: 'Hello this is the Backend calling!' });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
