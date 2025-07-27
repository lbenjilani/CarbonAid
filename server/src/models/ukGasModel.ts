import mongoose, { Schema, Document } from 'mongoose';

export interface IUkGas extends Document {
  sector: string;
  subsector: string;
  category: string;
  data: { year: number; value: number }[];
}

const UkGasSchema = new Schema<IUkGas>({
  sector: { type: String, required: true },
  subsector: { type: String, required: true },
  category: { type: String, required: true },
  data: [
    {
      year: { type: Number, required: true },
      value: { type: Number, required: true },
    }
  ]
});

const UkGasModel = mongoose.model<IUkGas>('UkGas', UkGasSchema, 'ukGas');
export default UkGasModel;
