require('dotenv').config();
const app = require('./src/app');

const port = Number(process.env.PORT || 4000);
app.listen(port, () => {
  console.log(`E-commerce API listening on http://localhost:${port}`);
});
