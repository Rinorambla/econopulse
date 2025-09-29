import mongoose, { Schema, Document, models } from 'mongoose'

export interface ICOTSnapshot extends Document {
  symbol: string
  market: string
  date: string // YYYY-MM-DD
  nonCommercialNet: number
  commercialNet: number
  changeNonCommercial: number
  changeCommercial: number
  openInterest: number
  createdAt: Date
}

const COTSnapshotSchema = new Schema<ICOTSnapshot>({
  symbol: { type: String, index: true },
  market: String,
  date: { type: String, index: true },
  nonCommercialNet: Number,
  commercialNet: Number,
  changeNonCommercial: Number,
  changeCommercial: Number,
  openInterest: Number
}, { timestamps: true })

COTSnapshotSchema.index({ symbol:1, date:1 }, { unique: true })

export const COTSnapshot = models.COTSnapshot || mongoose.model<ICOTSnapshot>('COTSnapshot', COTSnapshotSchema)
