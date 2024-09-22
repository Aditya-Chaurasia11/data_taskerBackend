const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const mongoose = require("mongoose");
const twilio = require("twilio");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("Could not connect to MongoDB", err));

const contactSchema = new mongoose.Schema({
  name: String,
  phoneNumber: String,
});

const Contact = mongoose.model("Contact", contactSchema);

app.get("/contacts", async (req, res) => {
  try {
    const contacts = await Contact.find();
    res.json(contacts);
  } catch (err) {
    res.status(500).json({ error: "Error fetching contacts" });
  }
});

app.get("/contacts/:id", async (req, res) => {
  try {
    const contact = await Contact.findById(req.params.id);
    if (!contact) return res.status(404).json({ error: "Contact not found." });
    res.json(contact);
  } catch (err) {
    res.status(500).json({ error: "Error fetching contact" });
  }
});

app.post("/contacts", async (req, res) => {
  const { name, phoneNumber } = req.body;

  if (!name || !phoneNumber) {
    return res
      .status(400)
      .json({ error: "Name and phone number are required." });
  }

  const newContact = new Contact({
    name,
    phoneNumber,
  });

  try {
    const savedContact = await newContact.save();
    res.status(201).json(savedContact);
  } catch (err) {
    res.status(500).json({ error: "Error adding contact" });
  }
});

app.post("/send-sms", async (req, res) => {
  const { message, phoneNumber, contactName } = req.body;

  if (!message || !phoneNumber || !contactName) {
    return res
      .status(400)
      .json({ error: "Message, phone number, and contact name are required." });
  }

  try {
    const smsResponse = await client.messages.create({
      body: `Hi ${contactName}, ${message}`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber,
    });

    console.log(`Message sent to ${phoneNumber}: ${smsResponse.sid}`);
    res
      .status(200)
      .json({ success: "Message sent successfully", sid: smsResponse.sid });
  } catch (error) {
    console.error("Error sending SMS:", error);
    res.status(500).json({ error: "Failed to send message" });
  }
});

app.get("/sent-messages", async (req, res) => {
  try {
    const messages = await client.messages.list({ limit: 20 });
    res.json(messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ error: "Error fetching message list" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
