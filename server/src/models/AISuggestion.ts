import mongoose, { Schema, Document } from 'mongoose';

export interface IAISuggestionItem {
  title: string;
  why: string;
  how: string;
  impact: string;
  difficulty: string;
  cost: string;
}

export interface IAISuggestion extends Document {
  userId: mongoose.Types.ObjectId;
  tips: IAISuggestionItem[];
  createdAt: Date;
}

const ItemSchema = new Schema<IAISuggestionItem>({
  title: { type: String, required: true },
  why: { type: String, required: true },
  how: { type: String, required: true },
  impact: { type: String, required: true },
  difficulty: { type: String, required: true },
  cost: { type: String, required: true },
}, { _id: false });

const AISuggestionSchema = new Schema<IAISuggestion>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', index: true, required: true },
  tips: { type: [ItemSchema], required: true },
  createdAt: { type: Date, default: Date.now, index: true },
});

export default mongoose.model<IAISuggestion>('AISuggestion', AISuggestionSchema, 'ai_suggestions');
