const express = require('express');
const crypto = require('crypto');
const { models } = require('@waterbills/db');
const billingService = require('../services/billingService');

const router = express.Router();

// MPesa webhook
router.post('/mpesa', async (req, res) => {
  try {
    const { Body } = req.body;
    const stkCallback = Body.stkCallback;

    if (stkCallback.ResultCode === 0) {
      // Payment successful
      const { CallbackMetadata } = stkCallback;
      const metadata = CallbackMetadata.Item;

      const amount = metadata.find(item => item.Name === 'Amount')?.Value;
      const mpesaReceiptNumber = metadata.find(item => item.Name === 'MpesaReceiptNumber')?.Value;
      const transactionDate = metadata.find(item => item.Name === 'TransactionDate')?.Value;
      const phoneNumber = metadata.find(item => item.Name === 'PhoneNumber')?.Value;

      // Find the payment by transaction reference
      const payment = await models.Payment.findOne({
        transactionRef: mpesaReceiptNumber,
        status: 'pending'
      });

      if (payment) {
        // Update payment status
        payment.status = 'completed';
        payment.paymentDate = new Date(transactionDate);
        await payment.save();

        // Process the payment
        await billingService.processPayment(payment.invoiceId, {
          amount: payment.amount,
          method: 'mpesa',
          transactionRef: mpesaReceiptNumber,
          paymentDate: payment.paymentDate,
          createdBy: payment.createdBy
        });
      }
    }

    res.json({ ResultCode: 0, ResultDesc: 'Success' });
  } catch (error) {
    console.error('MPesa webhook error:', error);
    res.status(500).json({ ResultCode: 1, ResultDesc: 'Failed' });
  }
});

// Verify MPesa webhook signature
const verifyMpesaSignature = (req, res, next) => {
  const signature = req.headers['x-mpesa-signature'];
  const timestamp = req.headers['x-mpesa-timestamp'];
  const nonce = req.headers['x-mpesa-nonce'];

  if (!signature || !timestamp || !nonce) {
    return res.status(400).json({ error: 'Missing required headers' });
  }

  // Verify signature logic here
  // This is a simplified version - implement proper signature verification
  
  next();
};

module.exports = router;
