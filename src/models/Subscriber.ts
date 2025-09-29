import mongoose, { Document, Model, Schema } from 'mongoose';

export interface ISubscriber extends Document {
  email: string;
  isActive: boolean;
  subscribedAt: Date;
  lastEmailSent?: Date;
  preferences: {
    weeklyNewsletter: boolean;
    marketAlerts: boolean;
    productUpdates: boolean;
  };
  metadata?: {
    source?: string;
    userAgent?: string;
    ipAddress?: string;
  };
}

const SubscriberSchema: Schema<ISubscriber> = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email address'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    subscribedAt: {
      type: Date,
      default: Date.now,
    },
    lastEmailSent: {
      type: Date,
    },
    preferences: {
      weeklyNewsletter: {
        type: Boolean,
        default: true,
      },
      marketAlerts: {
        type: Boolean,
        default: true,
      },
      productUpdates: {
        type: Boolean,
        default: true,
      },
    },
    metadata: {
      source: {
        type: String,
        default: 'website',
      },
      userAgent: String,
      ipAddress: String,
    },
  },
  {
    timestamps: true,
    collection: 'newsletter_subscribers',
  }
);

// Indexes for better performance
SubscriberSchema.index({ email: 1 });
SubscriberSchema.index({ isActive: 1 });
SubscriberSchema.index({ subscribedAt: -1 });

// Prevent duplicate model compilation in Next.js
const Subscriber: Model<ISubscriber> = 
  mongoose.models.Subscriber || mongoose.model<ISubscriber>('Subscriber', SubscriberSchema);

export default Subscriber;
