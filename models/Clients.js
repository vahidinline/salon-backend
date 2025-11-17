const mongoose = require('mongoose');

const ClientSchema = new mongoose.Schema(
  {
    id: String,
    telegramUserId: { type: String },
    otpCode: { type: String },
    otpExpiry: { type: Date },
    isVerified: { type: Boolean, default: false },
    name: String,
    photo: String,
    phoneNumber: String,
    isPhoneVerified: {
      type: Boolean,
      default: false,
    },
    phoneCountryCode: String,
    phoneVerificationCode: String,
    lang: String,
    telegramId: String,
    platform: String,
    verificationCode: String,
    influencerId: String,
    isCodeUsed: { type: Boolean, default: false },
    isExpired: {
      type: Boolean,
      default: false,
    },
    location: String,
    instagram: String,
    level: {
      type: Number,
      default: 0,
    },
    DateOfRegister: {
      type: Date,
      default: Date.now,
    },
    DOB: {
      type: Date,
    },
    ExpireDate: {
      type: Date,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
    lastLogins: [
      {
        userLocation: {
          latitude: {
            type: Number,
          },
          longitude: {
            type: Number,
          },
        },
        deviceType: {
          type: String,
        },
        date: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    status: {
      type: String,
      default: 'pending',
      enum: ['active', 'inactive', 'banned', 'deleted', 'pending', 'trial'],
    },
    clientType: {
      type: String,
      enum: [
        'new',
        'regular',
        'vip',
        'vvip',
        'influencer',
        'staff',
        'partner',
        'other',
        'defaulter',
      ],
      default: 'regular',
    },
    paymentType: String,
    acceptTerms: {
      type: Boolean,
      default: false,
    },
  },

  { collection: 'Clients' }
);

const model = mongoose.model('Client', ClientSchema);

module.exports = model;
