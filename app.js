const express = require('express');
const app = express();

// Define the route for single product pages
app.get('/product/:productId', (req, res) => {
  const productId = req.params.productId;
  // Fetch the product details from your database based on the productId
  // Render the single product page with the product details
  res.render('single_product', { productId });
});

// Other routes for your website can be defined here


app.get("/", function (req, res) {
    res.sendFile(__dirname + "/index.html");
});
app.listen(3000, function () {
    console.log("Server is running on localhost:3000");
});