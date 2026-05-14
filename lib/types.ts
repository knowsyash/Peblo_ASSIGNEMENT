export type Tag = {
  id: string;
  name: string;
};

export type AISummary = {
  id: string;
  noteId: string;
  summary: string;
  actionItems: string[];
  suggestedTitle: string;
  generatedAt: Date;
};

export type Note = {
  id: string;
  title: string;
  content: string;
  userId: string;
  isArchived: boolean;
  isPublic: boolean;
  shareId: string | null;
  aiCallCount: number;
  createdAt: Date;
  updatedAt: Date;
  tags: Tag[];
  aiSummary?: AISummary | null;
};
