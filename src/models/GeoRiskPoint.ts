import mongoose, { Schema, Document, models } from 'mongoose'

export interface IGeoRiskPoint extends Document {
  date: string // YYYY-MM-DD
  gpr: number
  change: number
  percentile: number
  regime: string
  createdAt: Date
}

const GeoRiskPointSchema = new Schema<IGeoRiskPoint>({
  date: { type: String, unique: true },
  gpr: Number,
  change: Number,
  percentile: Number,
  regime: String
}, { timestamps: true })

export const GeoRiskPoint = models.GeoRiskPoint || mongoose.model<IGeoRiskPoint>('GeoRiskPoint', GeoRiskPointSchema)
