const express = require('express');
const router = express.Router();
const Conversation = require('../models/Conversation');

// بازیابی مکالمه قبلی
router.post('/', async (req, res) => {
  try {
    const { userId, productUrl } = req.body;
    if (!userId || !productUrl)
      return res.status(400).json({ error: 'userId and productUrl required' });

    const conversation = await Conversation.findOne({ userId, productUrl });
    if (!conversation) return res.json({ messages: [], productInfo: null });

    res.json({
      messages: conversation.messages,
      productInfo: conversation.productInfo,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
