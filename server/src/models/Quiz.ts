import mongoose, { Document, Types } from 'mongoose';

export type Period = 'Last 30 days' | 'Last 90 days' | 'Last 12 months';

export interface IQuiz extends Document {
  userId: Types.ObjectId;
  meta: {
    version: number;
    period?: Period;
    submittedAt: Date;
    source: 'web' | 'mobile' | 'admin';
  };
  basic: {
    householdSize?: number;
    postcode?: string;
    period?: Period;
  };
  transport: {
    carFuel?: 'Petrol'|'Diesel'|'Hybrid'|'Electric'|'';
    carKm?: number;
    carEfficiency?: number;
    busKm?: number;
    railKm?: number;
    shortFlights?: number;
    longFlights?: number;
  };
  energy: {
    elecKwh?: number;
    tariff?: string;
    solar?: 'None'|'Solar PV (roof)'|'Community solar'|'';
    heatType?: 'Natural Gas'|'Heating Oil'|'Electric (Heat Pump)'|'Electric (Resistive)'|'District Heating'|'Biomass'|'';
    gasKwh?: number;
    homeArea?: number;
  };
  diet: {
    dietType?: 'Omnivore (meat daily)'|'Reduced-meat (few times/week)'|'Pescatarian'|'Vegetarian'|'Vegan'|'';
    eatingOut?: number;
    foodWaste?: number;
    localShare?: number;
    organicShare?: number;
  };
  consumption: {
    clothesItems?: number;
    electronicsSpend?: number;
    recycleRate?: number;
    trashKg?: number;
  };
  raw?: Record<string, any>;
}

const QuizSchema = new mongoose.Schema<IQuiz>({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  meta: {
    version:     { type: Number, required: true, default: 1 },
    period:      { type: String, enum: ['Last 30 days','Last 90 days','Last 12 months'] },
    submittedAt: { type: Date, required: true, default: Date.now, index: true },
    source:      { type: String, enum: ['web','mobile','admin'], default: 'web' }
  },
  basic:       { householdSize: Number, postcode: String, period: String },
  transport:   {
    carFuel: { type: String, enum: ['Petrol','Diesel','Hybrid','Electric',''] },
    carKm: Number, carEfficiency: Number, busKm: Number, railKm: Number,
    shortFlights: Number, longFlights: Number
  },
  energy:      {
    elecKwh: Number, tariff: String,
    solar: { type: String, enum: ['None','Solar PV (roof)','Community solar',''] },
    heatType: { type: String, enum: ['Natural Gas','Heating Oil','Electric (Heat Pump)','Electric (Resistive)','District Heating','Biomass',''] },
    gasKwh: Number, homeArea: Number
  },
  diet:        {
    dietType: { type: String, enum: ['Omnivore (meat daily)','Reduced-meat (few times/week)','Pescatarian','Vegetarian','Vegan',''] },
    eatingOut: Number, foodWaste: Number, localShare: Number, organicShare: Number
  },
  consumption: {
    clothesItems: Number, electronicsSpend: Number, recycleRate: Number, trashKg: Number
  },
  raw: { type: Object }
}, {
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
});

QuizSchema.index({ userId: 1, 'meta.submittedAt': -1 });
QuizSchema.index({ 'meta.version': 1 });

export default mongoose.model<IQuiz>('Quiz', QuizSchema, 'quizzes');
